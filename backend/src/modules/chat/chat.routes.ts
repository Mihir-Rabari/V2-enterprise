import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { sendError, sendSuccess } from '../../utils/response';
import { chatBurstLimiter, chatDailyLimiter, clientKey } from '../../middlewares/rateLimit.middleware';
import { clientCartSchema } from './chat.tools';
import { ChatUnavailableError, handleChatMessage, isChatAvailable } from './chat.service';

const router = Router();

const bodySchema = z.object({
    sessionId: z.string().max(64).optional(),
    message: z.string().max(4000),
    cart: clientCartSchema.default([]),
}).strict();

/** Lets the widget hide itself when the assistant is switched off. */
router.get('/status', (_req: Request, res: Response) => sendSuccess(res, { enabled: isChatAvailable() }));

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
