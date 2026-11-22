import { describe, expect, it } from 'vitest';
import { encodeWav } from '../lib/voiceRecorder';

// jsdom's Blob is not understood by Node's Response, so read it the way a browser would.
const readBytes = (blob: Blob) => new Promise<DataView>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new DataView(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
});
const ascii = (v: DataView, at: number, len: number) => String.fromCharCode(...Array.from({ length: len }, (_, i) => v.getUint8(at + i)));

describe('encodeWav', () => {
    it('writes a valid 16 kHz mono 16-bit PCM WAV header', async () => {
        const blob = encodeWav(new Float32Array(1600), 16000);
        expect(blob.type).toBe('audio/wav');
        expect(blob.size).toBe(44 + 1600 * 2);
        const v = await readBytes(blob);
        expect(ascii(v, 0, 4)).toBe('RIFF');
        expect(ascii(v, 8, 4)).toBe('WAVE');
        expect(ascii(v, 12, 4)).toBe('fmt ');
        expect(v.getUint16(20, true)).toBe(1);        // PCM
        expect(v.getUint16(22, true)).toBe(1);        // mono
        expect(v.getUint32(24, true)).toBe(16000);    // sample rate
        expect(v.getUint16(34, true)).toBe(16);       // bits
        expect(ascii(v, 36, 4)).toBe('data');
        expect(v.getUint32(40, true)).toBe(3200);     // data bytes
    });

    it('clamps samples and scales them to int16', async () => {
        const v = await readBytes(encodeWav(new Float32Array([0, 1, -1, 2, -2, 0.5]), 16000));
        const sample = (i: number) => v.getInt16(44 + i * 2, true);
        expect(sample(0)).toBe(0);
        expect(sample(1)).toBe(32767);
        expect(sample(2)).toBe(-32768);
        expect(sample(3)).toBe(32767);   // clipped
        expect(sample(4)).toBe(-32768);  // clipped
        expect(sample(5)).toBe(Math.trunc(0.5 * 0x7fff));
    });
});
