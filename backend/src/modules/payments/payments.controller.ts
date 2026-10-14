import { Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { createPaymentIntentService, PaymentProviderError } from './payments.service';

/**
 * Body: { items: [{ productId, quantity, size?, color? }], couponCode? }.
 * Any client-supplied `amount`/`currency`/`receipt` is ignored: the server prices the cart.
 */
export const createRazorpayOrder = async (req: AuthRequest, res: Response) => {
    try {
        const { items, couponCode } = req.body ?? {};
        if (!Array.isArray(items)) {
            return sendError(res, 'Cart items are required to create a payment', 400);
        }
        const order = await createPaymentIntentService(
            req.user!.userId,
            items,
            typeof couponCode === 'string' ? couponCode : undefined
        );
        return sendSuccess(res, order, 'Razorpay order created');
    } catch (err: any) {
        return sendError(res, err.message, err instanceof PaymentProviderError ? 500 : 400);
    }
};
