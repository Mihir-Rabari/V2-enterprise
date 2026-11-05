import test from 'node:test';
import assert from 'node:assert/strict';
import './helpers/env';
import { createAnthropicProvider, createOpenAiCompatProvider, type NormalizedUsage } from '../src/modules/chat/chat.providers';
import { ASSISTANT_SYSTEM_PROMPT, PROMPT_CANARY } from '../src/modules/chat/chat.prompt';

test('Anthropic caches the stable system/tools prefix rather than each changing conversation', async () => {
    const requests: any[] = [];
    const provider = createAnthropicProvider({ messages: { create: async (request: any) => {
        requests.push(request); return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Hello' }] };
    } } } as any, 'test', () => {});
    await provider.startTurn(ASSISTANT_SYSTEM_PROMPT, [], 'Hello').step();
    await provider.startTurn(ASSISTANT_SYSTEM_PROMPT, [], 'Another question').step();
    assert.equal(requests[0].cache_control, undefined);
    assert.deepEqual(requests[0].system[0].cache_control, { type: 'ephemeral' });
    assert.deepEqual(requests[0].system, requests[1].system);
    assert.deepEqual(requests[0].tools, requests[1].tools);
    assert.ok(ASSISTANT_SYSTEM_PROMPT.includes(PROMPT_CANARY));
});

test('OpenAI-compatible cache tokens are excluded from uncached input accounting', async () => {
    const usage: NormalizedUsage[] = [];
    const provider = createOpenAiCompatProvider({ chat: { completions: { create: async () => ({
        choices: [{ finish_reason: 'stop', message: { content: 'Hello' } }],
        usage: { prompt_tokens: 100, prompt_tokens_details: { cached_tokens: 70 }, completion_tokens: 10, total_tokens: 110 },
    }) } } } as any, 'test', (_, value) => usage.push(value));
    await provider.startTurn('Stable prefix', [], 'Hello').step();
    assert.deepEqual(usage[0], { input_tokens: 30, output_tokens: 10, cache_read_input_tokens: 70 });
});
