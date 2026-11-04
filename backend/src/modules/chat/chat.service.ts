/**
 * Shopping assistant orchestration. One user message goes through these layers in order:
 *   1. kill switch, daily spend cap, per-conversation turn / block limits
 *   2. input normalisation, sensitive-data redaction, injection heuristic (no model involved)
 *   3. in parallel: an independent safety classifier call, and the assistant's tool loop
 *   4. the classifier verdict gates the answer; the answer must pass output validation
 * Anything that fails a layer gets a fixed, pre-written reply and any proposed cart changes are dropped.
 *
 * Cart additions: tools only stage actions in memory; nothing reaches the browser until every
 * layer above has passed. A staged action is sent only when the shopper's own message is an
 * explicit, un-negated add request. Otherwise the server asks "add it?" and stores the exact
 * variant as a short-lived pending offer; a bare "yes" then commits that offer without a model call.
 */
import crypto from 'crypto';
import { env } from '../../config/env';
import { ChatSession, IChatSession, IChatTurn, IPendingCartAdd } from '../../models/ChatSession';
import { ChatUsage } from '../../models/ChatUsage';
import { CHAT_LIMITS, estimateCostUsd } from './chat.config';
import { ASSISTANT_SYSTEM_PROMPT, CLASSIFIER_SYSTEM_PROMPT, PROMPT_CANARY } from './chat.prompt';
import {
    CANNED, detectCartIntent, explicitlyAsksToAdd, extractRupeeAmounts, looksLikePromptInjection, normalizeUserInput, redactSensitive, validateAssistantOutput,
} from './chat.guardrails';
import {
    CartAddAction, ClientCart, ProductCard, executeTool, newToolContext,
} from './chat.tools';
import {
    ChatProvider, NormalizedUsage, ToolResult, createAnthropicClient, createAnthropicProvider, createGeminiProvider,
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
            defaultProvider = createGeminiProvider(key, model, recordUsage);
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

/** Per-message activity counters, written once per handled message. */
interface TurnStats {
    toolCalls: number;
    modelRounds: number;
    searches: number;
    emptySearches: number;
    blocked: boolean;
    fastConfirm: boolean;
}

const emptyStats = (): TurnStats => ({ toolCalls: 0, modelRounds: 0, searches: 0, emptySearches: 0, blocked: false, fastConfirm: false });

export const recordTurnStats = (s: TurnStats): void => {
    ChatUsage.updateOne(
        { day: utcDay() },
        {
            $inc: {
                messages: 1,
                toolCalls: s.toolCalls,
                modelRounds: s.modelRounds,
                searches: s.searches,
                emptySearches: s.emptySearches,
                blockedMessages: s.blocked ? 1 : 0,
                fastConfirms: s.fastConfirm ? 1 : 0,
            },
        },
        { upsert: true }
    ).catch(err => console.error('[Chat] Failed to record turn stats:', err.message));
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
    stats: TurnStats;
}

const cartActionReply = (actions: CartAddAction[], added: boolean): string => actions.map(action => {
    const item = `${action.product.name} – ${action.color || 'selected colour'}, size ${action.size || 'selected size'}`;
    if (!added) return `I found ${item}. Would you like me to add it to your bag?`;
    const quantity = `${action.quantity} ${action.quantity === 1 ? 'piece' : 'pieces'}`;
    return `Added ${item}, ${quantity} at ₹${action.product.price.toLocaleString('en-IN')}. You can check out at /checkout.`;
}).join('\n');

const runAssistant = async (
    provider: ChatProvider, history: IChatTurn[], message: string, cart: ClientCart, mayAddToCart: boolean
): Promise<AgentResult> => {
    const ctx = newToolContext(cart);
    const stats = emptyStats();
    const turn = provider.startTurn(ASSISTANT_SYSTEM_PROMPT, history, message);
    const done = (text: string, ok: boolean): AgentResult => {
        stats.searches = ctx.searches;
        stats.emptySearches = ctx.emptySearches;
        return {
            text, ok, cards: [...ctx.cards.values()], actions: ctx.actions, amounts: ctx.amounts, resultText: ctx.resultText, toolsUsed: ctx.toolsUsed, stats,
        };
    };

    for (let call = 0; call < CHAT_LIMITS.maxModelCallsPerTurn; call++) {
        stats.modelRounds++;
        const step = await turn.step();
        if (step.stop === 'refusal') return done(CANNED.offTopic, false);
        if (step.stop === 'max_tokens') {
            console.warn('[Chat] Reply hit the output token cap.');
            return done(CANNED.unsafeOutput, false);
        }
        if (step.stop === 'end') return done(step.text, true);

        console.info(`[Chat] Tool calls: ${step.toolCalls.map(c => c.name).join(', ')}`);
        stats.toolCalls += step.toolCalls.length;
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
    if (ctx.actions.length > 0) {
        // A completed tool action is already built from a live DB variant. Use that trusted data
        // for a concise final reply instead of discarding it after tool-loop exhaustion. Without an
        // explicit add request the caller turns these staged actions into a pending offer.
        return done(cartActionReply(ctx.actions, mayAddToCart), true);
    }
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

/** The pending offer, if it was made on the immediately preceding turn and has not expired. */
const activePending = (session: IChatSession): IPendingCartAdd[] => {
    const pending = session.pendingCartAdds ?? [];
    const expiresAt = session.pendingExpiresAt ? new Date(session.pendingExpiresAt).getTime() : 0;
    return pending.length > 0 && expiresAt > Date.now() ? pending : [];
};

/**
 * Persists one exchange. Any earlier pending offer is always replaced: an offer is only
 * confirmable by the very next message, so "yes" can never land on a stale suggestion.
 */
const saveTurn = async (session: IChatSession, userText: string, reply: string, blocked: boolean, pending: IPendingCartAdd[] = []) => {
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
            $set: {
                expiresAt: new Date(Date.now() + CHAT_LIMITS.sessionTtlMs),
                pendingCartAdds: pending,
                pendingExpiresAt: pending.length > 0 ? new Date(Date.now() + CHAT_LIMITS.pendingCartTtlMs) : null,
            },
        }
    );
};

const toPending = (actions: CartAddAction[]): IPendingCartAdd[] =>
    actions.map(a => ({ variantId: a.product.id, quantity: a.quantity }));

/**
 * "Yes" to a pending offer: re-check each staged variant against the live catalogue and the
 * shopper's current bag, then add it. No model call, so nothing the model says can alter it.
 */
const commitPending = async (pending: IPendingCartAdd[], cart: ClientCart) => {
    const ctx = newToolContext(cart);
    for (const p of pending) await executeTool('add_to_cart', { variant_id: p.variantId, quantity: p.quantity }, ctx);
    return {
        actions: ctx.actions,
        cards: [...ctx.cards.values()],
        reply: ctx.actions.length > 0 ? cartActionReply(ctx.actions, true) : CANNED.pendingGone,
    };
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

    const finishBlocked = async (blockedReply: string, stats: TurnStats = emptyStats()): Promise<ChatReply> => {
        // The payment-data warning matters most exactly when the message is also blocked.
        const reply = paymentDataShared ? `${CANNED.sensitiveData}\n\n${blockedReply}` : blockedReply;
        await saveTurn(session, '[message withheld by safety filter]', reply, true);
        recordTurnStats({ ...stats, blocked: true });
        const locked = session.blockedCount + 1 >= CHAT_LIMITS.maxBlockedPerSession;
        return { ...base, reply, remainingTurns: locked ? 0 : remaining(), ended: locked || undefined };
    };

    if (looksLikePromptInjection(message)) return finishBlocked(CANNED.injection);

    const intent = detectCartIntent(message);
    const pending = activePending(session);

    // A bare confirmation of the offer made on the previous turn: commit it directly.
    if (intent === 'confirm' && pending.length > 0) {
        const committed = await commitPending(pending, req.cart);
        await saveTurn(session, message, committed.reply, false);
        recordTurnStats({ ...emptyStats(), fastConfirm: true });
        return { ...base, reply: committed.reply, cards: committed.cards.slice(0, 6), actions: committed.actions, remainingTurns: remaining() };
    }

    const history = session.turns.slice(-CHAT_LIMITS.historyTurns);
    const previousReply = [...history].reverse().find(t => t.role === 'assistant')?.text;
    // Only an explicit, un-negated "add" in the shopper's own words releases cart actions this turn.
    const mayAddToCart = explicitlyAsksToAdd(message);

    // Both run at once for latency. This is safe because tools only stage actions in memory;
    // nothing is returned to the browser unless the verdict below is "shopping".
    let verdict: Verdict;
    let result: AgentResult;
    try {
        [verdict, result] = await Promise.all([
            classify(provider, message, previousReply),
            runAssistant(provider, history, message, req.cart, mayAddToCart),
        ]);
    } catch (err) {
        console.error('[Chat] Assistant failed:', describeProviderError(err));
        return { ...base, reply: CANNED.error, remainingTurns: remaining() + 1 };
    }

    if (verdict !== 'shopping') return finishBlocked(verdictReply(verdict), result.stats);

    // Amounts and percentages the reply may quote: tool data plus what the shopper themselves wrote.
    // Prior assistant turns only enter history after passing this same validator, so their prices
    // remain trusted context when the shopper confirms or refers back to an earlier recommendation.
    const allowedAmounts = new Set<number>([
        ...result.amounts,
        ...history.filter(t => t.role === 'assistant').flatMap(t => extractRupeeAmounts(t.text)),
        ...extractRupeeAmounts(message),
    ]);
    for (const n of message.matchAll(/\d[\d,]*/g)) allowedAmounts.add(Number(n[0].replace(/,/g, '')));
    const allowedPercents = new Set<number>();
    for (const src of [...result.resultText, message]) {
        for (const m of src.matchAll(/(\d{1,3}(?:\.\d+)?)\s*%/g)) allowedPercents.add(Number(m[1]));
    }

    let reply = result.text;
    let actions = result.actions;
    let staged: IPendingCartAdd[] = [];
    let outputValidated = false;
    if (actions.length > 0 && intent === 'decline') {
        // The shopper said no; the model added anyway. Drop it and do not re-offer.
        reply = CANNED.notAdded;
        actions = [];
    } else if (actions.length > 0 && !mayAddToCart) {
        // Not asked for in so many words: ask instead, and remember exactly what was offered.
        reply = cartActionReply(actions, false);
        staged = toPending(actions);
        actions = [];
    }
    if (result.ok) {
        const check = validateAssistantOutput(reply, {
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
            staged = [];
        } else outputValidated = true;
    } else {
        actions = [];
        staged = [];
    }

    if (paymentDataShared) reply = `${CANNED.sensitiveData}\n\n${reply}`;

    await saveTurn(session, message, reply, false, staged);
    recordTurnStats({ ...result.stats, blocked: !outputValidated && result.ok });
    const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const normalisedReply = normalise(reply);
    const mentionedCards = result.cards.filter(card => normalisedReply.includes(normalise(card.name)));
    const cards = outputValidated
        ? (mentionedCards.length > 0 ? mentionedCards : result.cards.length === 1 ? result.cards : [])
        : [];
    return { ...base, reply, cards: cards.slice(0, 6), actions, remainingTurns: remaining() };
};
