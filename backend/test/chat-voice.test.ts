import test from 'node:test';
import assert from 'node:assert/strict';
import './helpers/env';
import { cleanTranscript, isWav, transcribeAudio, TranscribeError, MAX_AUDIO_BYTES } from '../src/modules/chat/chat.transcribe';
import type { NormalizedUsage } from '../src/modules/chat/chat.providers';

/** Minimal valid-looking WAV: RIFF....WAVE header followed by zeros. */
const wav = (bytes = 10_000) => {
    const b = Buffer.alloc(bytes);
    b.write('RIFF', 0, 'ascii'); b.write('WAVE', 8, 'ascii');
    return b;
};

const fakeGemini = (text: string) => {
    const requests: any[] = [];
    const usage: NormalizedUsage[] = [];
    const fetchMock: typeof fetch = async (url, init) => {
        requests.push({ url: String(url), headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) });
        return Response.json({
            candidates: [{ content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP' }],
            usageMetadata: { promptTokenCount: 300, candidatesTokenCount: 12, totalTokenCount: 312 },
        });
    };
    return { fetchMock, requests, usage };
};

test('isWav accepts RIFF/WAVE and rejects everything else', () => {
    assert.equal(isWav(wav()), true);
    assert.equal(isWav(Buffer.from('not audio at all, definitely not a wav file header....')), false);
    assert.equal(isWav(Buffer.alloc(10)), false);
});

test('cleanTranscript trims, drops control chars, caps length and blanks placeholders', () => {
    assert.equal(cleanTranscript('  show   me\n an M size\tshirt \u0000 '), 'show me an M size shirt');
    assert.equal(cleanTranscript('[silence]'), '');
    assert.equal(cleanTranscript('(inaudible)'), '');
    assert.equal(cleanTranscript('x'.repeat(900)).length, 500);
});

test('transcribeAudio sends the WAV to Gemini with the shared key and returns clean text', async () => {
    const { fetchMock, requests, usage } = fakeGemini('  Show me black jeans in 32 \n');
    const text = await transcribeAudio(wav(), { apiKey: 'fake-google-key', model: 'gemini-3.8-flash', onUsage: (_, u) => usage.push(u), fetch: fetchMock });
    assert.equal(text, 'Show me black jeans in 32');
    assert.equal(requests.length, 1);
    assert.match(requests[0].url, /\/models\/gemini-3\.8-flash:generateContent$/);
    assert.equal(requests[0].headers.get('x-goog-api-key'), 'fake-google-key');
    const parts = requests[0].body.contents[0].parts;
    assert.ok(parts.some((p: any) => p.inlineData?.mimeType === 'audio/wav' && p.inlineData.data.length > 0), 'audio must be attached');
    assert.equal(usage[0].input_tokens, 300, 'usage is recorded so the daily budget covers dictation');
});

test('transcribeAudio rejects non-WAV, oversized and empty-speech clips with the right status', async () => {
    const opts = { apiKey: 'k', model: 'gemini-3.8-flash', onUsage: () => {} };
    await assert.rejects(() => transcribeAudio(Buffer.alloc(9000, 1), opts), (e: any) => e instanceof TranscribeError && e.status === 415);
    await assert.rejects(() => transcribeAudio(wav(MAX_AUDIO_BYTES + 1), opts), (e: any) => e.status === 413);
    await assert.rejects(() => transcribeAudio(wav(100), opts), (e: any) => e.status === 422);
    const { fetchMock } = fakeGemini('[silence]');
    await assert.rejects(() => transcribeAudio(wav(), { ...opts, fetch: fetchMock }), (e: any) => e.status === 422);
});
