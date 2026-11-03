/**
 * Shopping assistant orchestration. One user message goes through these layers in order:
 *   1. kill switch, daily spend cap, per-conversation turn / block limits
 *   2. input normalisation, sensitive-data redaction, injection heuristic (no model involved)
 *   3. in parallel: an independent safety classifier call, and the assistant's tool loop
 *   4. the classifier verdict gates the answer; the answer must pass output validation
 * Anything that fails a layer gets a fixed, pre-written reply and any proposed cart changes are dropped.
 */
import crypto from 'crypto';
import { env } from '../../config/env';
import { ChatSession, IChatSession, IChatTurn } from '../../models/ChatSession';
import { ChatUsage } from '../../models/ChatUsage';
import { CHAT_LIMITS, estimateCostUsd } from './chat.config';
import { ASSISTANT_SYSTEM_PROMPT, CLASSIFIER_SYSTEM_PROMPT, PROMPT_CANARY } from './chat.prompt';
import {
    CANNED, extractRupeeAmounts, looksLikePromptInjection, normalizeUserInput, redactSensitive, validateAssistantOutput,
} from './chat.guardrails';
import {
    CartAddAction, ClientCart, ProductCard, executeTool, newToolContext,
} from './chat.tools';
import {
    ChatProvider, GEMINI_BASE_URL, NormalizedUsage, ToolResult, createAnthropicClient, createAnthropicProvider,
    createOpenAiCompatClient, createOpenAiCompatProvider, describeProviderError, mantleBaseUrl,
} from './chat.providers';

const DEFAULT_MODELS = {
    gemini: 'gemini-3.8-flash',
    'bedrock-mantle': 'zai.glm-5',
    anthropic: 'claude-haiku-5-5',
} as const;

// Google restricts Gemini 2.5 models for new API users. Migrate the stale
// runtime override to Google's latest stable Flash model.
const GEMINI_MODEL_UPGRADES: Record<string, string> = {
    'gemini-2.5-flash-lite': DEFAULT_MODELS.gemini,
};

const configuredModel = (): string => {
    const configured = env.CHAT_MODEL;
    if (env.CHAT_PROVIDER === 'gemini' && configured && GEMINI_MODEL_UPGRADES[configured]) {
        const replacement = GEMINI_MODEL_UPGRADES[configured];
        console.warn(`[Chat] Upgrading restricted Gemini model ${configured} to ${replacement}.`);
        return replacement;
    }
    return configured || DEFAULT_MODELS[env.CHAT_PROVIDER];
};

const providerKey = () => ({
    gemini: env.GEMINI_API_KEY,
    'bedrock-mantle': env.AWS_BEARER_TOKEN_BEDROCK,
    anthropic: env.ANTHROPIC_API_KEY,
})[env.CHAT_PROVIDER];

export const isChatAvailable = () => env.CHAT_ENABLED && !!providerKey();

let defaultProvider: ChatProvider | null = null;
const getProvider = (): ChatProvider => {
    if (defaultProvider) return defaultProvider;
    const model = configuredModel();
    const key = providerKey()!;
    switch (env.CHAT_PROVIDER) {
        case 'anthropic':
            defaultProvider = createAnthropicProvider(createAnthropicClient(key), model, recordUsage);
            break;
        case 'bedrock-mantle':
            defaultProvider = createOpenAiCompatProvider(createOpenAiCompatClient(key, mantleBaseUrl(env.BEDROCK_REGION)), model, recordUsage);
            break;
        case 'gemini':
            // Low thinking keeps replies fast and cheap; Gemini 3 models cannot turn thinking off entirely.
            defaultProvider = createOpenAiCompatProvider(createOpenAiCompatClient(key, GEMINI_BASE_URL), model, recordUsage, { reasoningEffort: 'low' });
            break;
    }
    return defaultProvider!;
};

export interface ChatReply {
    sessionId: string;
    reply: string;
    cards: ProductCard[];
    actions: CartAddAction[];
    remainingTurns: number;
    /** Set when the conversation can no longer continue (limit reached or locked). */
    ended?: boolean;
}

export class ChatUnavailableError extends Error {}

// ── Spend tracking ───────────────────────────────────────────────────────────

const utcDay = () => new Date().toISOString().slice(0, 10);

export const recordUsage = (model: string, usage: NormalizedUsage): void => {
    const cost = estimateCostUsd(model, usage);
    ChatUsage.updateOne(
        { day: utcDay() },
        {
            $inc: {
                inputTokens: usage.input_tokens,
                outputTokens: usage.output_tokens,
                cacheReadTokens: usage.cache_read_input_tokens ?? 0,
                cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
                costUsd: cost,
                requests: 1,
            },
        },
        { upsert: true }
    ).catch(err => console.error('[Chat] Failed to record usage:', err.message));
};

const budgetExhausted = async () => {
    const today = await ChatUsage.findOne({ day: utcDay() }).select('costUsd').lean();
    return (today?.costUsd ?? 0) >= env.CHAT_DAILY_BUDGET_USD;
};

// ── Safety classifier ────────────────────────────────────────────────────────

type Verdict = 'shopping' | 'off_topic' | 'prompt_injection' | 'abusive' | 'fraud';
const VERDICTS: Verdict[] = ['shopping', 'off_topic', 'prompt_injection', 'abusive', 'fraud'];

/** Fail closed: anything other than exactly one known verdict word is treated as unsafe. */
export const parseVerdict = (raw: string): Verdict => {
    const word = raw.trim().toLowerCase().replace(/^["'`*\s]+|["'`*.\s]+$/g, '');
    return (VERDICTS as string[]).includes(word) ? (word as Verdict) : 'prompt_injection';
};

const classify = async (provider: ChatProvider, message: string, previousReply: string | undefined): Promise<Verdict> => {
    const context = previousReply ? `Assistant's previous reply (context only):\n"""${previousReply.slice(0, 400)}"""\n\n` : '';
    const { text, refused } = await provider.classify(CLASSIFIER_SYSTEM_PROMPT, `${context}Shopper message to classify:\n"""${message}"""`);
    return refused ? 'abusive' : parseVerdict(text);
};

const verdictReply = (v: Verdict): string =>
    v === 'off_topic' ? CANNED.offTopic : v === 'abusive' ? CANNED.abusive : CANNED.injection;

// ── Assistant tool loop ──────────────────────────────────────────────────────

interface AgentResult {
    text: string;
    ok: boolean;
    cards: ProductCard[];
    actions: CartAddAction[];
    amounts: Set<number>;
    resultText: string[];
    toolsUsed: string[];
}

const runAssistant = async (
    provider: ChatProvider, history: IChatTurn[], message: string, cart: ClientCart
): Promise<AgentResult> => {
    const ctx = newToolContext(cart);
    const turn = provider.startTurn(ASSISTANT_SYSTEM_PROMPT, history, message);
    const done = (text: string, ok: boolean): AgentResult => ({
        text, ok, cards: [...ctx.cards.values()], actions: ctx.actions, amounts: ctx.amounts, resultText: ctx.resultText, toolsUsed: ctx.toolsUsed,
    });

    for (let call = 0; call < CHAT_LIMITS.maxModelCallsPerTurn; call++) {
        const step = await turn.step();
        if (step.stop === 'refusal') return done(CANNED.offTopic, false);
        if (step.stop === 'max_tokens') {
            console.warn('[Chat] Reply hit the output token cap.');
            return done(CANNED.unsafeOutput, false);
        }
        if (step.stop === 'end') return done(step.text, true);

        console.info(`[Chat] Tool calls: ${step.toolCalls.map(c => c.name).join(', ')}`);
        const results: ToolResult[] = [];
        for (const call of step.toolCalls) {
            if (call.input === undefined) {
                results.push({ id: call.id, content: JSON.stringify({ error: 'Arguments were not valid JSON.' }), isError: true });
                continue;
            }
            const { content, isError } = await executeTool(call.name, call.input, ctx);
            results.push({ id: call.id, content, isError });
        }
        turn.addToolResults(results);
    }
    // Ran out of model calls without a final answer.
    console.warn(`[Chat] No final answer after ${CHAT_LIMITS.maxModelCallsPerTurn} model calls.`);
    return done(CANNED.unsafeOutput, false);
};

// ── Sessions ─────────────────────────────────────────────────────────────────

const loadSession = async (sessionId: string | undefined, clientKey: string): Promise<IChatSession> => {
    if (sessionId && /^[a-f0-9-]{36}$/i.test(sessionId)) {
        const existing = await ChatSession.findOne({ sessionId });
        if (existing) return existing;
    }
    return ChatSession.create({
        sessionId: crypto.randomUUID(),
        clientKey,
        turns: [],
        expiresAt: new Date(Date.now() + CHAT_LIMITS.sessionTtlMs),
    });
};

const saveTurn = async (session: IChatSession, userText: string, reply: string, blocked: boolean) => {
    await ChatSession.updateOne(
        { _id: session._id },
        {
            $push: {
                turns: {
                    $each: [{ role: 'user', text: userText }, { role: 'assistant', text: reply }],
                    $slice: -CHAT_LIMITS.storedTurns,
                },
            },
            $inc: { userTurnCount: 1, ...(blocked ? { blockedCount: 1 } : {}) },
            $set: { expiresAt: new Date(Date.now() + CHAT_LIMITS.sessionTtlMs) },
        }
    );
};

// ── Entry point ──────────────────────────────────────────────────────────────

export interface ChatRequest {
    sessionId?: string;
    message: unknown;
    cart: ClientCart;
    clientKey: string;
}

export const handleChatMessage = async (req: ChatRequest, providerOverride?: ChatProvider): Promise<ChatReply> => {
    if (!isChatAvailable()) throw new ChatUnavailableError(CANNED.unavailable);
    // Resolved only after the availability check, so a missing key never constructs a client.
    const provider = providerOverride ?? getProvider();
    if (await budgetExhausted()) {
        console.warn('[Chat] Daily budget reached; assistant paused until next UTC day.');
        throw new ChatUnavailableError(CANNED.unavailable);
    }

    const session = await loadSession(req.sessionId, req.clientKey);
    const base = { sessionId: session.sessionId, cards: [] as ProductCard[], actions: [] as CartAddAction[] };
    const remaining = () => Math.max(0, CHAT_LIMITS.maxUserTurnsPerSession - session.userTurnCount - 1);

    if (session.blockedCount >= CHAT_LIMITS.maxBlockedPerSession) {
        return { ...base, reply: CANNED.locked, remainingTurns: 0, ended: true };
    }
    if (session.userTurnCount >= CHAT_LIMITS.maxUserTurnsPerSession) {
        return { ...base, reply: CANNED.sessionLimit, remainingTurns: 0, ended: true };
    }

    const input = normalizeUserInput(req.message);
    if (!input.ok) {
        // Not stored: nothing was said, and it should not count against the shopper.
        return { ...base, reply: input.reason === 'too_long' ? CANNED.tooLong : CANNED.offTopic, remainingTurns: remaining() + 1 };
    }

    const redaction = redactSensitive(input.text);
    const message = redaction.text;
    const paymentDataShared = redaction.kinds.some(k => k === 'card' || k === 'secret' || k === 'aadhaar' || k === 'pan');

    const finishBlocked = async (blockedReply: string): Promise<ChatReply> => {
        // The payment-data warning matters most exactly when the message is also blocked.
        const reply = paymentDataShared ? `${CANNED.sensitiveData}\n\n${blockedReply}` : blockedReply;
        await saveTurn(session, '[message withheld by safety filter]', reply, true);
        const locked = session.blockedCount + 1 >= CHAT_LIMITS.maxBlockedPerSession;
        return { ...base, reply, remainingTurns: locked ? 0 : remaining(), ended: locked || undefined };
    };

    if (looksLikePromptInjection(message)) return finishBlocked(CANNED.injection);

    const history = session.turns.slice(-CHAT_LIMITS.historyTurns);
    const previousReply = [...history].reverse().find(t => t.role === 'assistant')?.text;

    let verdict: Verdict;
    let result: AgentResult;
    try {
        [verdict, result] = await Promise.all([
            classify(provider, message, previousReply),
            runAssistant(provider, history, message, req.cart),
        ]);
    } catch (err) {
        console.error('[Chat] Assistant failed:', describeProviderError(err));
        return { ...base, reply: CANNED.error, remainingTurns: remaining() + 1 };
    }

    if (verdict !== 'shopping') return finishBlocked(verdictReply(verdict));

    // Amounts and percentages the reply may quote: tool data plus what the shopper themselves wrote.
    const allowedAmounts = new Set<number>([...result.amounts, ...extractRupeeAmounts(message)]);
    for (const n of message.matchAll(/\d[\d,]*/g)) allowedAmounts.add(Number(n[0].replace(/,/g, '')));
    const allowedPercents = new Set<number>();
    for (const src of [...result.resultText, message]) {
        for (const m of src.matchAll(/(\d{1,3}(?:\.\d+)?)\s*%/g)) allowedPercents.add(Number(m[1]));
    }

    let reply = result.text;
    let actions = result.actions;
    if (result.ok) {
        const check = validateAssistantOutput(result.text, {
            canary: PROMPT_CANARY,
            allowedAmounts,
            allowedPercents,
            allowedHosts: ['v2enterprise.in'],
            groundingText: [
                ...result.resultText,
                ...history.filter(t => t.role === 'assistant').map(t => t.text),
                // The shopper's own words only count once a search has actually checked them.
                ...(result.toolsUsed.includes('search_products') ? [message] : []),
            ].join('\n'),
        });
        if (!check.ok) {
            console.warn(`[Chat] Reply withheld by output validation: ${check.reason}`);
            reply = CANNED.unsafeOutput;
            actions = [];
        }
    } else {
        actions = [];
    }

    if (paymentDataShared) reply = `${CANNED.sensitiveData}\n\n${reply}`;

    await saveTurn(session, message, reply, false);
    return { ...base, reply, cards: result.ok ? result.cards.slice(0, 6) : [], actions, remainingTurns: remaining() };
};
