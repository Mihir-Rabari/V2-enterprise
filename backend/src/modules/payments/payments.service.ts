import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../../config/env';

const razorpay = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
});

export const createRazorpayOrderService = async (amount: number, receipt: string) => {
    const options = {
        amount: Math.round(amount * 100), // convert to paise
        currency: 'INR',
        receipt: receipt,
    };

    try {
        const order = await razorpay.orders.create(options);
        return order;
    } catch (error: any) {
        console.error('[Razorpay] Failed to create order:', error);
        throw new Error('Failed to initialize payment with Razorpay');
    }
};

export const verifyRazorpaySignature = (orderId: string, paymentId: string, signature: string) => {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
        .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    return expectedSignature === signature;
};
