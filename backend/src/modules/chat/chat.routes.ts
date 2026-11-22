import express, { Router, Request, Response } from 'express';
import { z } from 'zod';
import { sendError, sendSuccess } from '../../utils/response';
import { chatBurstLimiter, chatDailyLimiter, chatVoiceLimiter, clientKey } from '../../middlewares/rateLimit.middleware';
import { env } from '../../config/env';
import { clientCartSchema } from './chat.tools';
import {
    ChatUnavailableError, budgetExhausted, handleChatMessage, isChatAvailable, isVoiceAvailable, recordUsage, transcriptionModel,
} from './chat.service';
import { MAX_AUDIO_BYTES, TranscribeError, transcribeAudio } from './chat.transcribe';

const router = Router();

const bodySchema = z.object({
    sessionId: z.string().max(64).optional(),
    message: z.string().max(4000),
    cart: clientCartSchema.default([]),
}).strict();

/** Lets the widget hide itself when the assistant is switched off. */
router.get('/status', (_req: Request, res: Response) => sendSuccess(res, { enabled: isChatAvailable(), voice: isVoiceAvailable() }));

/** Dictation: raw 16 kHz mono WAV in, plain transcript out. Nothing is stored. */
router.post(
    '/transcribe',
    chatBurstLimiter,
    chatVoiceLimiter,
    express.raw({ type: ['audio/wav', 'audio/x-wav', 'audio/wave'], limit: MAX_AUDIO_BYTES }),
    async (req: Request, res: Response) => {
        if (!isVoiceAvailable()) return sendError(res, 'Voice input is unavailable right now.', 503);
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) return sendError(res, 'No audio received.', 400);
        try {
            if (await budgetExhausted()) return sendError(res, 'Voice input is unavailable right now.', 503);
            const text = await transcribeAudio(req.body, { apiKey: env.GEMINI_API_KEY!, model: transcriptionModel(), onUsage: recordUsage });
            return sendSuccess(res, { text });
        } catch (err) {
            if (err instanceof TranscribeError) return sendError(res, err.message, err.status);
            console.error('[Chat] Transcription failed:', (err as Error).message);
            return sendError(res, 'Could not transcribe that. Please try again or type your message.', 502);
        }
    },
);

router.post('/message', chatBurstLimiter, chatDailyLimiter, async (req: Request, res: Response) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 'Invalid chat request.', 400);
    try {
        const reply = await handleChatMessage({ ...parsed.data, clientKey: clientKey(req) });
        return sendSuccess(res, reply);
    } catch (err) {
        if (err instanceof ChatUnavailableError) return sendError(res, err.message, 503);
        console.error('[Chat] Unexpected error:', (err as Error).message);
        return sendError(res, 'The assistant is unavailable right now.', 500);
    }
});

export default router;
