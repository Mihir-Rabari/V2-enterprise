/**
 * Shopping assistant orchestration. One user message goes through these layers in order:
 *   1. kill switch, daily spend cap, per-conversation turn / block limits
 *   2. input normalisation, sensitive-data redaction, injection heuristic (no model involved)
 *   3. in parallel: an independent safety classifier call, and the assistant's tool loop
 *   4. the classifier verdict gates the answer; the answer must pass output validation
 * Anything that fails a layer gets a fixed, pre-written reply and any proposed cart changes are dropped.
 */
import Anthropic from '@anthropic-ai/sdk';
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
    CartAddAction, ClientCart, ProductCard, TOOL_DEFINITIONS, executeTool, newToolContext,
} from './chat.tools';

export type LlmClient = Pick<Anthropic, 'messages'>;

let defaultClient: LlmClient | null = null;
const getClient = (): LlmClient => {
    if (!defaultClient) defaultClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 30_000 });
    return defaultClient;
};

export const isChatAvailable = () => env.CHAT_ENABLED && !!env.ANTHROPIC_API_KEY;

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

const recordUsage = async (model: string, usage: Anthropic.Usage | undefined) => {
    if (!usage) return;
    const cost = estimateCostUsd(model, usage);
    await ChatUsage.updateOne(
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

const classify = async (client: LlmClient, message: string, previousReply: string | undefined): Promise<Verdict> => {
    const context = previousReply ? `Assistant's previous reply (context only):\n"""${previousReply.slice(0, 400)}"""\n\n` : '';
    const response = await client.messages.create({
        model: env.CHAT_MODEL,
        max_tokens: CHAT_LIMITS.classifierMaxTokens,
        system: [{ type: 'text', text: CLASSIFIER_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        output_config: {
            effort: 'low',
            format: {
                type: 'json_schema',
                schema: {
                    type: 'object',
                    properties: { category: { type: 'string', enum: VERDICTS } },
                    required: ['category'],
                    additionalProperties: false,
                },
            },
        },
        messages: [{ role: 'user', content: `${context}Shopper message to classify:\n"""${message}"""` }],
    });
    void recordUsage(env.CHAT_MODEL, response.usage);

    // Fail closed: anything other than a clean, parseable verdict is treated as unsafe.
    if (response.stop_reason === 'refusal') return 'abusive';
    const text = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text;
    try {
        const category = JSON.parse(text ?? '').category;
        return VERDICTS.includes(category) ? category : 'prompt_injection';
    } catch {
        return 'prompt_injection';
    }
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
}

const runAssistant = async (
    client: LlmClient, history: IChatTurn[], message: string, cart: ClientCart
): Promise<AgentResult> => {
    const ctx = newToolContext(cart);
    const messages: Anthropic.MessageParam[] = [
        ...history.map(t => ({ role: t.role, content: t.text }) as Anthropic.MessageParam),
        { role: 'user', content: message },
    ];
    const done = (text: string, ok: boolean): AgentResult => ({
        text, ok, cards: [...ctx.cards.values()], actions: ctx.actions, amounts: ctx.amounts, resultText: ctx.resultText,
    });

    for (let call = 0; call < CHAT_LIMITS.maxModelCallsPerTurn; call++) {
        const response = await client.messages.create({
            model: env.CHAT_MODEL,
            max_tokens: CHAT_LIMITS.maxOutputTokens,
            // Tools + system prompt are identical on every request, so they are served from cache.
            cache_control: { type: 'ephemeral' },
            system: [{ type: 'text', text: ASSISTANT_SYSTEM_PROMPT }],
            tools: TOOL_DEFINITIONS,
            output_config: { effort: 'low' },
            messages,
        });
        void recordUsage(env.CHAT_MODEL, response.usage);

        if (response.stop_reason === 'refusal') return done(CANNED.offTopic, false);
        if (response.stop_reason === 'max_tokens') return done(CANNED.unsafeOutput, false);

        const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
        if (response.stop_reason !== 'tool_use' || toolUses.length === 0) {
            const text = response.content
                .filter((b): b is Anthropic.TextBlock => b.type === 'text')
                .map(b => b.text)
                .join('\n')
                .trim();
            return done(text, true);
        }

        // Append the whole assistant turn (thinking blocks included) so the history stays append-only.
        messages.push({ role: 'assistant', content: response.content });
        const results: Anthropic.ToolResultBlockParam[] = [];
        for (const use of toolUses) {
            const { content, isError } = await executeTool(use.name, use.input, ctx);
            results.push({ type: 'tool_result', tool_use_id: use.id, content, is_error: isError });
        }
        messages.push({ role: 'user', content: results });
    }
    // Ran out of model calls without a final answer.
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

export const handleChatMessage = async (req: ChatRequest, client: LlmClient = getClient()): Promise<ChatReply> => {
    if (!isChatAvailable()) throw new ChatUnavailableError(CANNED.unavailable);
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

    const finishBlocked = async (reply: string): Promise<ChatReply> => {
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
            classify(client, message, previousReply),
            runAssistant(client, history, message, req.cart),
        ]);
    } catch (err) {
        if (err instanceof Anthropic.RateLimitError) console.warn('[Chat] Rate limited by the model API.');
        else if (err instanceof Anthropic.APIError) console.error(`[Chat] Model API error ${err.status}:`, err.message);
        else console.error('[Chat] Assistant failed:', (err as Error).message);
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
