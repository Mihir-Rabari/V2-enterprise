import test from 'node:test';
import assert from 'node:assert/strict';
import './helpers/env';
import { createGeminiProvider, NormalizedUsage } from '../src/modules/chat/chat.providers';

const fakeGemini = (responses: unknown[]) => {
    const requests: { url: string; headers: Headers; body: any }[] = [];
    const usage: NormalizedUsage[] = [];
    const fetchMock: typeof fetch = async (url, init) => {
        requests.push({ url: String(url), headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) });
        assert.ok(responses.length, 'unexpected extra model request');
        return Response.json(responses.shift());
    };
    return {
        provider: createGeminiProvider('fake-google-key', 'gemini-3.8-flash', (_, u) => usage.push(u), { fetch: fetchMock }),
        requests, usage,
    };
};

const response = (parts: unknown[], finishReason = 'STOP') => ({
    candidates: [{ content: { role: 'model', parts }, finishReason }],
    usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 10, thoughtsTokenCount: 20, totalTokenCount: 130 },
});

test('Gemini SDK uses native API, preserves tool signatures and counts thinking tokens', async () => {
    const { provider, requests, usage } = fakeGemini([
        response([{ functionCall: { name: 'list_categories', args: {} }, thoughtSignature: 'signed-thought' }]),
        response([{ text: '  How can I help?  ' }]),
    ]);
    const turn = provider.startTurn('Shopping assistant', [], 'hi');
    const first = await turn.step();
    assert.equal(first.stop, 'tool_use');
    assert.equal(first.toolCalls[0].name, 'list_categories');
    assert.deepEqual(first.toolCalls[0].input, {});
    assert.equal(requests.length, 1, 'SDK must leave tool execution to the service');
    assert.match(requests[0].url, /\/models\/gemini-3\.8-flash:generateContent$/);
    assert.equal(requests[0].headers.get('x-goog-api-key'), 'fake-google-key');
    assert.equal(requests[0].body.generationConfig.thinkingConfig.thinkingLevel, 'low');
    assert.equal(requests[0].body.generationConfig.maxOutputTokens, 1500);
    assert.ok(requests[0].body.tools[0].functionDeclarations.some((t: any) => t.name === 'search_products'));
    turn.addToolResults([{ id: first.toolCalls[0].id, content: 'Lookup unavailable', isError: true }]);
    const second = await turn.step();
    assert.equal(second.text, 'How can I help?');
    const parts = requests[1].body.contents.flatMap((c: any) => c.parts);
    assert.equal(parts.find((p: any) => p.functionCall).thoughtSignature, 'signed-thought');
    const result = parts.find((p: any) => p.functionResponse).functionResponse;
    assert.equal(result.name, 'list_categories');
    assert.match(JSON.stringify(result.response), /Lookup unavailable/);
    assert.deepEqual(usage, [
        { input_tokens: 100, output_tokens: 30 },
        { input_tokens: 100, output_tokens: 30 },
    ]);
});

test('Gemini SDK tool-free completion is isolated from tools and fails closed on truncation', async () => {
    const { provider, requests } = fakeGemini([
        response([{ text: 'shopping' }]),
        response([{ text: 'shopping' }], 'MAX_TOKENS'),
    ]);
    assert.deepEqual(await provider.classify('Safety filter', 'hi'), { text: 'shopping', refused: false });
    assert.equal((await provider.classify('Safety filter', 'hi')).refused, true);
    assert.equal(requests[0].body.tools, undefined);
    assert.equal(requests[0].body.generationConfig.maxOutputTokens, 600);
});

test('Gemini SDK rejects safety-blocked and truncated assistant responses', async () => {
    const { provider } = fakeGemini([
        response([], 'SAFETY'),
        response([{ text: 'Partial answer' }], 'MAX_TOKENS'),
    ]);
    assert.equal((await provider.startTurn('Assistant', [], 'hi').step()).stop, 'refusal');
    assert.deepEqual(await provider.startTurn('Assistant', [], 'hi').step(), {
        stop: 'max_tokens', text: '', toolCalls: [],
    });
});

test('Gemini product drafting sends inline image bytes to the model', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64');
    const image = 'data:image/png;base64,' + png.toString('base64');
    const { provider, requests } = fakeGemini([response([{ text: '{}' }])]);
    assert.equal((await provider.classify('Draft product', 'Inspect product', 2400, [image])).refused, false);
    const part = requests[0].body.contents[0].parts.find((part: any) => part.inlineData);
    assert.equal(part.inlineData.mimeType, 'image/png');
    assert.equal(part.inlineData.data, png.toString('base64'));
    assert.equal(requests[0].body.tools, undefined);
});

test('Gemini cache hits are recorded separately without double-counting input tokens', async () => {
    const cached = response([{ text: 'Hello' }]);
    Object.assign(cached.usageMetadata, { cachedContentTokenCount: 40 });
    const { provider, usage } = fakeGemini([cached]);
    await provider.startTurn('Stable prompt', [], 'Hello').step();
    assert.equal(usage[0].input_tokens, 60);
    assert.equal(usage[0].cache_read_input_tokens, 40);
    assert.equal(usage[0].output_tokens, 30);
});
