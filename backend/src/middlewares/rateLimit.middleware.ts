import { Request } from 'express';
import rateLimit from 'express-rate-limit';

// Behind Cloudflare the real client IP is in CF-Connecting-IP.
export const clientKey = (req: Request): string => {
    const cf = req.headers['cf-connecting-ip'];
    return (typeof cf === 'string' && cf) || req.ip || 'unknown';
};

export const makeLimiter = (windowMs: number, max: number, message: string) =>
    rateLimit({
        windowMs,
        limit: max,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        keyGenerator: clientKey,
        validate: { keyGeneratorIpFallback: false },
        handler: (_req, res) => {
            res.status(429).json({ success: false, message, errors: null });
        },
    });

const MIN = 60 * 1000;

/** Brute-force protection for login / register. */
export const authLimiter = makeLimiter(15 * MIN, 30, 'Too many attempts. Please try again later.');
/** Password-reset e-mails (prevents mail bombing). */
export const forgotPasswordLimiter = makeLimiter(60 * MIN, 5, 'Too many reset requests. Please try again later.');
/** Public contact form (unauthenticated write). */
export const contactLimiter = makeLimiter(60 * MIN, 10, 'Too many messages. Please try again later.');
/** Razorpay order creation. */
export const paymentLimiter = makeLimiter(15 * MIN, 30, 'Too many payment requests. Please try again later.');
/** Shopping assistant: short-burst limit, then a daily ceiling per client (each message costs model tokens). */
export const chatBurstLimiter = makeLimiter(5 * MIN, 20, 'You are sending messages too quickly. Please wait a moment.');
export const chatDailyLimiter = makeLimiter(24 * 60 * MIN, 150, 'Daily chat limit reached. Please try again tomorrow.');
/** Generous global ceiling for the whole API. */
export const apiLimiter = makeLimiter(15 * MIN, 1500, 'Too many requests. Please slow down.');
