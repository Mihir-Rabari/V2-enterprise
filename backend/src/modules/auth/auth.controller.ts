import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { registerService, loginService, getMeService, updateMeService } from './auth.service';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const register = async (req: Request, res: Response) => {
    try {
        const result = await registerService(req.body);
        return sendSuccess(res, result, 'Account created successfully', 201);
    } catch (err: unknown) {
        return sendError(res, (err as Error).message, 400);
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const result = await loginService(req.body);
        return sendSuccess(res, result, 'Logged in successfully');
    } catch (err: unknown) {
        return sendError(res, (err as Error).message, 401);
    }
};

export const getMe = async (req: AuthRequest, res: Response) => {
    try {
        const user = await getMeService(req.user!.userId);
        return sendSuccess(res, user);
    } catch (err: unknown) {
        return sendError(res, (err as Error).message, 404);
    }
};

export const updateMe = async (req: AuthRequest, res: Response) => {
    try {
        const user = await updateMeService(req.user!.userId, req.body);
        return sendSuccess(res, user, 'Profile updated');
    } catch (err: unknown) {
        return sendError(res, (err as Error).message, 400);
    }
};
