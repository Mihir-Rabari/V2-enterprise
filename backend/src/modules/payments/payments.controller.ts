import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { createRazorpayOrderService } from './payments.service';

export const createRazorpayOrder = async (req: Request, res: Response) => {
    try {
        const { amount, receipt } = req.body;

        if (!amount || amount <= 0) {
            return sendError(res, 'Valid amount is required', 400);
        }

        const order = await createRazorpayOrderService(amount, receipt || `rcpt_${Date.now()}`);
        return sendSuccess(res, order, 'Razorpay order created');
    } catch (err: any) {
        return sendError(res, err.message, 500);
    }
};
