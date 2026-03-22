import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { registerService, loginService, getMeService, updateMeService, forgotPasswordService, resetPasswordService } from './auth.service';
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

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        if (!email) return sendError(res, 'Email is required.', 400);
        const result = await forgotPasswordService(email);
        return sendSuccess(res, result, result.message);
    } catch (err: unknown) {
        return sendError(res, (err as Error).message, 400);
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;
        const { password } = req.body;
        if (!password || password.length < 6) {
            return sendError(res, 'Password must be at least 6 characters.', 400);
        }
        const result = await resetPasswordService(token, password);
        return sendSuccess(res, result, result.message);
    } catch (err: unknown) {
        return sendError(res, (err as Error).message, 400);
    }
};
