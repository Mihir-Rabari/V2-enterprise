/** Tunables for the shopping assistant. Kept in one place so limits are easy to audit. */
export const CHAT_LIMITS = {
    /** Max characters accepted in one user message (after normalisation). */
    maxMessageChars: 500,
    /** Max user messages per conversation before it must be restarted. */
    maxUserTurnsPerSession: 30,
    /** After this many blocked messages the conversation is locked. */
    maxBlockedPerSession: 4,
    /** Prior text turns replayed to the model (user + assistant). */
    historyTurns: 12,
    /** Stored text turns per session (older ones are dropped). */
    storedTurns: 40,
    /** Model round-trips allowed in one user turn (each tool call needs one). */
    maxModelCallsPerTurn: 5,
    /** Output token cap for one model call (includes adaptive thinking). */
    maxOutputTokens: 1500,
    /** Output token cap for the safety classifier call. */
    classifierMaxTokens: 600,
    /** Products returned by one search. */
    searchResults: 6,
    /** add_to_cart calls honoured in one user turn. */
    maxCartAddsPerTurn: 3,
    /** Max quantity the assistant may add for a single SKU. */
    maxQuantityPerAdd: 5,
    /** Cart lines the client may describe to the assistant. */
    maxCartLines: 30,
    /** Conversation expiry after the last message. */
    sessionTtlMs: 24 * 60 * 60 * 1000,
} as const;

/** USD per million tokens. Unknown models are priced at the Opus rate so the budget cap stays conservative. */
const PRICING: Record<string, { input: number; output: number }> = {
    // Gemini API paid-tier rates (ai.google.dev/gemini-api/docs/pricing, checked 2026-11).
    'gemini-3.1-flash-lite': { input: 0.25, output: 1.50 },
    'gemini-2.5-flash-lite': { input: 0.10, output: 0.40 },
    'gemini-3.5-flash-lite': { input: 0.30, output: 2.50 },
    // Priced at the 2027 rate; the introductory $0.75 / $3.75 runs through 2026-12-31.
    'gemini-3.8-flash': { input: 1.50, output: 7.50 },
    // Amazon Bedrock on-demand rate for GLM 5 (verify against the Bedrock pricing page for your region).
    'zai.glm-5': { input: 1.00, output: 3.20 },
    'claude-haiku-5-5': { input: 0.10, output: 0.50 },
    'claude-sonnet-5-5': { input: 2.00, output: 10.00 },
    'claude-opus-5-5': { input: 4.00, output: 20.00 },
};
const FALLBACK_PRICING = { input: 4.00, output: 20.00 };

export interface UsageLike {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
}

/** Estimated cost of one call. Cache reads bill at 0.1x input, 5-minute cache writes at 1.25x. */
export const estimateCostUsd = (model: string, usage: UsageLike): number => {
    const p = PRICING[model] ?? FALLBACK_PRICING;
    const perToken = (rate: number) => rate / 1_000_000;
    return (
        usage.input_tokens * perToken(p.input) +
        usage.output_tokens * perToken(p.output) +
        (usage.cache_read_input_tokens ?? 0) * perToken(p.input) * 0.1 +
        (usage.cache_creation_input_tokens ?? 0) * perToken(p.input) * 1.25
    );
};
