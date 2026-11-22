/**
 * Browser-side voice capture for the shopping assistant's dictation button.
 *
 * Records with MediaRecorder (works everywhere), then converts the clip to 16 kHz mono 16-bit WAV
 * before upload: WAV is a format Gemini accepts on every browser, whereas MediaRecorder's output
 * differs (webm/opus on Chrome and Firefox, mp4/aac on Safari).
 */

export const MAX_RECORDING_SECONDS = 45;
const TARGET_RATE = 16_000;

export class VoiceError extends Error {
    constructor(message: string, readonly kind: 'denied' | 'unsupported' | 'empty' | 'failed') { super(message); }
}

export const isVoiceSupported = (): boolean =>
    typeof window !== 'undefined'
    && typeof MediaRecorder !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
    && !!(window.AudioContext || (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext);

/** 16-bit little-endian PCM WAV container around mono float samples in [-1, 1]. */
export const encodeWav = (samples: Float32Array, sampleRate: number): Blob => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const text = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
    text(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    text(8, 'WAVE');
    text(12, 'fmt ');
    view.setUint32(16, 16, true);          // PCM chunk size
    view.setUint16(20, 1, true);           // PCM
    view.setUint16(22, 1, true);           // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);           // block align
    view.setUint16(34, 16, true);          // bits per sample
    text(36, 'data');
    view.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Blob([buffer], { type: 'audio/wav' });
};

/** Decode whatever the recorder produced and resample it to 16 kHz mono. */
const toWav16k = async (recording: Blob): Promise<Blob> => {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    try {
        const decoded = await ctx.decodeAudioData(await recording.arrayBuffer());
        const length = Math.max(1, Math.ceil(decoded.duration * TARGET_RATE));
        const offline = new OfflineAudioContext(1, length, TARGET_RATE);
        const source = offline.createBufferSource();
        source.buffer = decoded;
        source.connect(offline.destination);
        source.start();
        const rendered = await offline.startRendering();
        return encodeWav(rendered.getChannelData(0), TARGET_RATE);
    } finally {
        void ctx.close().catch(() => undefined);
    }
};

export interface VoiceRecorder {
    /** Stops recording and resolves with a WAV clip ready to upload. */
    stop(): Promise<Blob>;
    /** Stops and discards everything (closing the chat, unmounting). */
    cancel(): void;
}

/**
 * Asks for the microphone and starts recording. `onAutoStop` fires when the length cap is hit;
 * the caller should then call `stop()` to collect the clip.
 */
export const startRecording = async (onAutoStop: () => void): Promise<VoiceRecorder> => {
    if (!isVoiceSupported()) throw new VoiceError('Voice input is not supported in this browser.', 'unsupported');
    let stream: MediaStream;
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    } catch (err) {
        const name = (err as DOMException)?.name;
        if (name === 'NotAllowedError' || name === 'SecurityError') {
            throw new VoiceError('Microphone access is blocked. Allow it in your browser settings to use voice.', 'denied');
        }
        throw new VoiceError('No microphone was found.', 'failed');
    }

    const recorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    const release = () => stream.getTracks().forEach(t => t.stop());
    const timer = window.setTimeout(onAutoStop, MAX_RECORDING_SECONDS * 1000);
    recorder.start();

    return {
        stop: () => new Promise<Blob>((resolve, reject) => {
            window.clearTimeout(timer);
            recorder.onstop = () => {
                release();
                const recording = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
                if (recording.size < 1000) return reject(new VoiceError("I couldn't hear anything. Please try again.", 'empty'));
                toWav16k(recording).then(resolve, () => reject(new VoiceError('Could not process the recording. Please try again.', 'failed')));
            };
            if (recorder.state === 'inactive') recorder.onstop(new Event('stop'));
            else recorder.stop();
        }),
        cancel: () => {
            window.clearTimeout(timer);
            recorder.onstop = null;
            if (recorder.state !== 'inactive') recorder.stop();
            release();
        },
    };
};
