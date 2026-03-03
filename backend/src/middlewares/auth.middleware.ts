import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../config/db';
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
        const decoded = verifyToken(token);

        // Verify user still exists in DB
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, role: true },
        });

        if (!user) {
            return sendError(res, 'Unauthorized — user no longer exists', 401);
        }

        req.user = { userId: user.id, role: user.role };
        return next();
    } catch {
        return sendError(res, 'Unauthorized — invalid token', 401);
    }
};
