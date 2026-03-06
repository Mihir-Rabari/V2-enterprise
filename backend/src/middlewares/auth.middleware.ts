import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { verifyToken } from '../utils/jwt';
import { User } from '../models/User';
import { sendError } from '../utils/response';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        role: 'CUSTOMER' | 'ADMIN';
    };
}

export const protect = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return sendError(res, 'Unauthorized — no token provided', 401);
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token) as { userId: string };

        // Verify user still exists in DB using Mongoose
        if (!mongoose.Types.ObjectId.isValid(decoded.userId)) {
            console.warn(`[Auth] Unauthorized: Invalid User ID format ${decoded.userId}`);
            return sendError(res, 'Unauthorized — invalid user id format', 401);
        }
        const user = await User.findById(decoded.userId).select('id role');

        if (!user) {
            console.warn(`[Auth] Unauthorized: User ${decoded.userId} not found in DB`);
            return sendError(res, 'Unauthorized — user no longer exists', 401);
        }

        req.user = { userId: (user._id as any).toString(), role: user.role };
        return next();
    } catch (error) {
        console.error('[Auth] Token Verification Error:', (error as Error).message);
        return sendError(res, 'Unauthorized — invalid token', 401);
    }
};
