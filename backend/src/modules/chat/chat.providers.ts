/**
 * Model providers for the shopping assistant. The service only sees this small interface, so the
 * guardrails, tools and limits are identical whichever provider is configured:
 *   - gemini: Gemini API through its OpenAI-compatible Chat Completions endpoint
 *   - bedrock-mantle: OpenAI-compatible Chat Completions on Amazon Bedrock (e.g. zai.glm-5)
 *   - anthropic: Claude Messages API
 * Each turn keeps its own provider-native message list so tool calls replay exactly as the
 * provider returned them (append-only within the turn).
 */
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { IChatTurn } from '../../models/ChatSession';
import { CHAT_LIMITS } from './chat.config';
import { TOOL_DEFINITIONS } from './chat.tools';

export interface ToolCall {
    id: string;
    name: string;
    /** Parsed arguments, or undefined when the model sent invalid JSON. */
    input: unknown;
}

export interface StepResult {
    stop: 'end' | 'tool_use' | 'refusal' | 'max_tokens';
    text: string;
    toolCalls: ToolCall[];
}

export interface ToolResult {
    id: string;
    content: string;
    isError: boolean;
}

export interface ModelTurn {
    step(): Promise<StepResult>;
    addToolResults(results: ToolResult[]): void;
}

export interface NormalizedUsage {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
}

export interface ChatProvider {
    readonly model: string;
    startTurn(system: string, history: IChatTurn[], userMessage: string): ModelTurn;
    /** One short completion with no tools; `refused` when the provider declined to answer. */
    classify(system: string, userContent: string): Promise<{ text: string; refused: boolean }>;
}

export type UsageSink = (model: string, usage: NormalizedUsage) => void;

const parseArgs = (raw: string | undefined): unknown => {
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return undefined; }
};

// ── OpenAI-compatible endpoints (Gemini, Bedrock Mantle) ─────────────────────

export type OpenAiLikeClient = Pick<OpenAI, 'chat'>;

/**
 * Converts the tool schemas to the plain JSON Schema subset every OpenAI-compatible endpoint
 * accepts: nullable `["string", "null"]` fields become optional single-type fields.
 */
export const toPortableSchema = (schema: Record<string, any>): Record<string, unknown> => {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, prop] of Object.entries<Record<string, any>>(schema.properties ?? {})) {
        const nullable = Array.isArray(prop.type) && prop.type.includes('null');
        properties[key] = Array.isArray(prop.type)
            ? { ...prop, type: prop.type.find((t: string) => t !== 'null') }
            : prop;
        if (!nullable && schema.required?.includes(key)) required.push(key);
    }
    return { type: 'object', properties, ...(required.length ? { required } : {}) };
};

const OPENAI_TOOLS: OpenAI.Chat.ChatCompletionTool[] = TOOL_DEFINITIONS.map(t => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: toPortableSchema(t.input_schema as Record<string, any>) },
}));

export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
export const mantleBaseUrl = (region: string) => `https://bedrock-mantle.${region}.api.aws/v1`;

export const createOpenAiCompatClient = (apiKey: string, baseURL: string): OpenAiLikeClient =>
    new OpenAI({ apiKey, baseURL, maxRetries: 2, timeout: 45_000 });

export interface OpenAiCompatOptions {
    /** Thinking depth where the endpoint supports it (Gemini maps this to its thinking level). */
    reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
}

export const createOpenAiCompatProvider = (
    client: OpenAiLikeClient, model: string, onUsage: UsageSink, opts: OpenAiCompatOptions = {}
): ChatProvider => {
    const record = (usage: OpenAI.Completions.CompletionUsage | undefined) => {
        if (!usage) return;
        // Some endpoints leave thinking tokens out of completion_tokens but bill them as output;
        // counting everything beyond the prompt keeps the spend estimate conservative.
        const output = Math.max(usage.completion_tokens, (usage.total_tokens ?? 0) - usage.prompt_tokens);
        onUsage(model, { input_tokens: usage.prompt_tokens, output_tokens: output });
    };
    const extra = opts.reasoningEffort ? { reasoning_effort: opts.reasoningEffort } : {};

    return {
        model,
        startTurn(system, history, userMessage) {
            const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
                { role: 'system', content: system },
                ...history.map(t => ({ role: t.role, content: t.text }) as OpenAI.Chat.ChatCompletionMessageParam),
                { role: 'user', content: userMessage },
            ];
            return {
                async step() {
                    const response = await client.chat.completions.create({
                        model,
                        messages,
                        tools: OPENAI_TOOLS,
                        tool_choice: 'auto',
                        max_tokens: CHAT_LIMITS.maxOutputTokens,
                        ...extra,
                    });
                    record(response.usage);
                    const choice = response.choices[0];
                    if (!choice) return { stop: 'end', text: '', toolCalls: [] };
                    const msg = choice.message;
                    // Keep the provider's tool-call objects as-is (Gemini attaches thought signatures to
                    // them); only fill in an id when the endpoint omitted one.
                    const calls = (msg.tool_calls ?? [])
                        .filter((c): c is OpenAI.Chat.ChatCompletionMessageFunctionToolCall => c.type === 'function')
                        .map((c, i) => (c.id ? c : { ...c, id: `call_${i}` }));
                    if (choice.finish_reason === 'content_filter') return { stop: 'refusal', text: '', toolCalls: [] };
                    if (choice.finish_reason === 'length' && calls.length === 0) return { stop: 'max_tokens', text: '', toolCalls: [] };
                    if (calls.length > 0) {
                        messages.push({ role: 'assistant', content: msg.content ?? null, tool_calls: calls });
                        return {
                            stop: 'tool_use',
                            text: msg.content ?? '',
                            toolCalls: calls.map(c => ({ id: c.id, name: c.function.name, input: parseArgs(c.function.arguments) })),
                        };
                    }
                    return { stop: 'end', text: (msg.content ?? '').trim(), toolCalls: [] };
                },
                addToolResults(results) {
                    for (const r of results) messages.push({ role: 'tool', tool_call_id: r.id, content: r.content });
                },
            };
        },
        async classify(system, userContent) {
            const response = await client.chat.completions.create({
                model,
                messages: [{ role: 'system', content: system }, { role: 'user', content: userContent }],
                max_tokens: CHAT_LIMITS.classifierMaxTokens,
                ...extra,
            });
            record(response.usage);
            const choice = response.choices[0];
            if (!choice || choice.finish_reason === 'content_filter') return { text: '', refused: true };
            return { text: choice.message.content ?? '', refused: false };
        },
    };
};

// ── Anthropic (Claude) ───────────────────────────────────────────────────────

export type AnthropicLikeClient = Pick<Anthropic, 'messages'>;

export const createAnthropicClient = (apiKey: string): AnthropicLikeClient =>
    new Anthropic({ apiKey, maxRetries: 2, timeout: 30_000 });

export const createAnthropicProvider = (client: AnthropicLikeClient, model: string, onUsage: UsageSink): ChatProvider => {
    const record = (usage: Anthropic.Usage | undefined) => {
        if (!usage) return;
        onUsage(model, {
            input_tokens: usage.input_tokens,
            output_tokens: usage.output_tokens,
            cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
            cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
        });
    };

    return {
        model,
        startTurn(system, history, userMessage) {
            const messages: Anthropic.MessageParam[] = [
                ...history.map(t => ({ role: t.role, content: t.text }) as Anthropic.MessageParam),
                { role: 'user', content: userMessage },
            ];
            return {
                async step() {
                    const response = await client.messages.create({
                        model,
                        max_tokens: CHAT_LIMITS.maxOutputTokens,
                        // Tools + system prompt are identical on every request, so they are served from cache.
                        cache_control: { type: 'ephemeral' },
                        system: [{ type: 'text', text: system }],
                        tools: TOOL_DEFINITIONS,
                        output_config: { effort: 'low' },
                        messages,
                    });
                    record(response.usage);
                    if (response.stop_reason === 'refusal') return { stop: 'refusal', text: '', toolCalls: [] };
                    if (response.stop_reason === 'max_tokens') return { stop: 'max_tokens', text: '', toolCalls: [] };
                    const uses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
                    const text = response.content
                        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
                        .map(b => b.text)
                        .join('\n')
                        .trim();
                    if (response.stop_reason !== 'tool_use' || uses.length === 0) return { stop: 'end', text, toolCalls: [] };
                    // Append the whole assistant turn (thinking blocks included) so the history stays append-only.
                    messages.push({ role: 'assistant', content: response.content });
                    return { stop: 'tool_use', text, toolCalls: uses.map(u => ({ id: u.id, name: u.name, input: u.input })) };
                },
                addToolResults(results) {
                    messages.push({
                        role: 'user',
                        content: results.map(r => ({ type: 'tool_result', tool_use_id: r.id, content: r.content, is_error: r.isError })),
                    });
                },
            };
        },
        async classify(system, userContent) {
            const response = await client.messages.create({
                model,
                max_tokens: CHAT_LIMITS.classifierMaxTokens,
                system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
                output_config: { effort: 'low' },
                messages: [{ role: 'user', content: userContent }],
            });
            record(response.usage);
            if (response.stop_reason === 'refusal') return { text: '', refused: true };
            const text = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text ?? '';
            return { text, refused: false };
        },
    };
};

/** Error types that mean "the model API failed" for logging. */
export const describeProviderError = (err: unknown): string => {
    // Provider error bodies can be several KB of JSON; keep log lines readable.
    const clip = (s: string) => (s.length > 300 ? `${s.slice(0, 300)}…` : s);
    if (err instanceof Anthropic.APIError || err instanceof OpenAI.APIError) return clip(`API error ${err.status}: ${err.message}`);
    return clip((err as Error)?.message ?? String(err));
};
