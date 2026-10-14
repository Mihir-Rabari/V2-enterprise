import Razorpay from 'razorpay';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { env } from '../../config/env';
import { PaymentIntent, IPaymentIntent } from '../../models/PaymentIntent';
import { priceCart, CartItemInput } from '../orders/pricing';
import { assertStockAvailable } from '../orders/inventory';

export const razorpay = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
});

const CURRENCY = 'INR';
const RZP_ORDER_ID = /^order_[A-Za-z0-9]{6,40}$/;
const RZP_PAYMENT_ID = /^pay_[A-Za-z0-9]{6,40}$/;

/** A payment that must not be turned into an order. The message is safe to show to the customer. */
export class PaymentRejected extends Error {}
/** The payment provider could not be reached / refused to create the order (server-side failure). */
export class PaymentProviderError extends Error {}

/**
 * Source of truth for the payable amount: the cart the client sends is re-priced on the server
 * (`priceCart`, the same function order creation uses) and the resulting amount is stored in a
 * PaymentIntent next to the Razorpay order id. Any `amount` in the request is never read.
 */
export const createPaymentIntentService = async (userId: string, items: CartItemInput[], couponCode?: string) => {
    const priced = await priceCart({ items, method: 'prepaid', couponCode });
    assertStockAvailable(priced.products, items); // fail fast; the binding check is the atomic reservation at order time

    if (!Number.isSafeInteger(priced.totalPaise) || priced.totalPaise < 100) {
        throw new Error('Order total is too low to be paid online.');
    }

    let order: { id: string };
    try {
        order = await razorpay.orders.create({
            amount: priced.totalPaise, // paise (integer), per Razorpay's units
            currency: CURRENCY,
            receipt: `rcpt_${new mongoose.Types.ObjectId().toString()}`,
            notes: { userId },
        }) as any;
    } catch (error: any) {
        console.error('[Razorpay] Failed to create order:', error?.error?.description || error?.message);
        throw new PaymentProviderError('Failed to initialize payment with Razorpay');
    }

    await PaymentIntent.create({
        razorpayOrderId: order.id,
        userId: new mongoose.Types.ObjectId(userId),
        items: items.map(i => ({ productId: new mongoose.Types.ObjectId(i.productId), quantity: i.quantity })),
        couponCode: couponCode || undefined,
        amountPaise: priced.totalPaise,
        currency: CURRENCY,
    });

    return order;
};

/** Constant-time HMAC-SHA256 check of `order_id|payment_id` (Razorpay checkout signature). */
export const verifyRazorpaySignature = (orderId: string, paymentId: string, signature: string) => {
    if (typeof orderId !== 'string' || typeof paymentId !== 'string' || typeof signature !== 'string') return false;
    if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
    const expected = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest();
    return crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex'));
};

export const releaseIntent = (intent: IPaymentIntent) =>
    PaymentIntent.updateOne({ _id: intent._id, status: 'PROCESSING' }, { $set: { status: 'CREATED' }, $unset: { razorpayPaymentId: '' } });

export const failIntent = (intent: IPaymentIntent, reason: string) =>
    PaymentIntent.updateOne({ _id: intent._id, status: 'PROCESSING' }, { $set: { status: 'FAILED', failureReason: reason.slice(0, 300) } });

export const completeIntent = (intent: IPaymentIntent, orderId: unknown) =>
    PaymentIntent.updateOne({ _id: intent._id }, { $set: { status: 'COMPLETED', orderId } });

/**
 * Verify a prepaid payment and atomically claim its PaymentIntent for exactly one order creation.
 * Fails closed: missing/malformed fields, bad signature, unknown/foreign/used intent, unfetchable
 * provider data, or order/amount/currency/status mismatch all reject. A valid signature alone never suffices.
 *
 * Retryable outcomes (provider unreachable, payment not captured) put the intent back to CREATED so a new
 * attempt on the same Razorpay order works; integrity mismatches mark it FAILED for manual review.
 */
export const claimVerifiedPayment = async (
    userId: string,
    p: { razorpayOrderId?: unknown; razorpayPaymentId?: unknown; razorpaySignature?: unknown }
): Promise<IPaymentIntent> => {
    const { razorpayOrderId: orderId, razorpayPaymentId: paymentId, razorpaySignature: signature } = p;
    if (typeof orderId !== 'string' || !RZP_ORDER_ID.test(orderId) ||
        typeof paymentId !== 'string' || !RZP_PAYMENT_ID.test(paymentId) ||
        typeof signature !== 'string') {
        throw new PaymentRejected('Razorpay payment details are missing or malformed for prepaid order.');
    }
    if (!verifyRazorpaySignature(orderId, paymentId, signature)) {
        throw new PaymentRejected('Payment verification failed. Please contact support.');
    }

    // Exactly one concurrent/replayed request can move CREATED -> PROCESSING.
    const intent = await PaymentIntent.findOneAndUpdate(
        { razorpayOrderId: orderId, userId: new mongoose.Types.ObjectId(userId), status: 'CREATED' },
        { $set: { status: 'PROCESSING', razorpayPaymentId: paymentId } },
        { new: true }
    );
    if (!intent) {
        throw new PaymentRejected('This payment cannot be used for an order (unknown, already used, or in progress).');
    }

    let payment: any;
    try {
        payment = await razorpay.payments.fetch(paymentId);
    } catch (err) {
        console.error('[Razorpay] Payment fetch failed:', (err as any)?.error?.description || (err as Error)?.message);
        await releaseIntent(intent);
        throw new PaymentRejected('Unable to verify the payment right now. Please retry shortly.');
    }

    // Razorpay amounts are integers in the smallest currency unit (paise).
    let mismatch: string | null = null;
    if (!payment || payment.id !== paymentId || payment.order_id !== orderId) mismatch = 'Payment does not belong to this payment order.';
    else if (payment.currency !== intent.currency) mismatch = 'Payment currency does not match the order.';
    else if (typeof payment.amount !== 'number' || !Number.isInteger(payment.amount) || payment.amount !== intent.amountPaise) mismatch = 'Paid amount does not match the order total.';
    if (mismatch) {
        await failIntent(intent, mismatch);
        throw new PaymentRejected(`${mismatch} Please contact support.`);
    }

    if (payment.status !== 'captured') {
        // failed / created / authorized-but-uncaptured: the same Razorpay order may be retried with a new payment
        await releaseIntent(intent);
        throw new PaymentRejected('Payment is not completed. Please retry the payment.');
    }

    return intent;
};
