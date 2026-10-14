import { Order } from '../../models/Order';
import { User } from '../../models/User';
import mongoose from 'mongoose';
import { claimVerifiedPayment, completeIntent, failIntent, releaseIntent, PaymentRejected } from '../payments/payments.service';
import { priceCart, CartError } from './pricing';
import { reserveStock, releaseStock, StockLine } from './inventory';
import { sendMail } from '../../utils/mailer';
import { orderPlacedTemplate, orderStatusTemplate } from '../../utils/emailTemplates';
import { validateOrderItems } from '../../utils/orderItems';

interface CreateOrderInput {
    userId: string;
    items: { productId: string; quantity: number; size?: string; color?: string }[];
    method: string;
    address: string;
    phone: string;
    couponCode?: string;
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
    razorpaySignature?: string;
}

/** Re-read the already-created order for a payment (idempotent duplicate verification), owner only. */
const findOrderForPayment = async (userId: string, paymentId: unknown, providerOrderId: unknown) => {
    if (typeof paymentId !== 'string' || typeof providerOrderId !== 'string') return null;
    return Order.findOne({ razorpayPaymentId: paymentId, razorpayOrderId: providerOrderId, userId: new mongoose.Types.ObjectId(userId) });
};

const sameCart = (a: { productId: unknown; quantity: number }[], b: { productId: unknown; quantity: number }[]) =>
    a.length === b.length && a.every(x => b.some(y => String(y.productId) === String(x.productId) && y.quantity === x.quantity));

export const createOrderService = async (input: CreateOrderInput) => {
    if (!mongoose.Types.ObjectId.isValid(input.userId)) {
        console.error('[Orders] CRITICAL: Invalid User ID format received:', input.userId);
        throw new Error(`Invalid User ID format (${input.userId}). Please log out and log in again.`);
    }

    validateOrderItems(input.items);
    const method = String(input.method).toLowerCase();
    const isPrepaid = method === 'prepaid';

    // Duplicate verification of an already-fulfilled payment returns the same order (no second order/decrement).
    if (isPrepaid) {
        const existing = await findOrderForPayment(input.userId, input.razorpayPaymentId, input.razorpayOrderId);
        if (existing) return { ...existing.toObject(), id: existing._id.toString() };
    }

    // Prepaid: verify signature + provider payment (amount/currency/order/status) and claim the payment intent.
    const intent = isPrepaid ? await claimVerifiedPayment(input.userId, input) : null;

    let order;
    let reserved: StockLine[] = [];
    let priced;
    // Phase 1 (deterministic checks): any failure after a captured payment is FAILED for manual review/refund.
    try {
        // 1-3. Server-side price: live prices, quantities, method/coupon discounts
        priced = await priceCart({ items: input.items, method, couponCode: input.couponCode });

        if (intent) {
            if (priced.totalPaise !== intent.amountPaise || !sameCart(input.items, intent.items)) {
                throw new PaymentRejected('Prices or cart changed after payment was started. Please contact support.');
            }
        }

        // Atomic conditional decrement of the real inventory field; throws (and rolls back) on insufficient stock.
        reserved = await reserveStock(priced.orderItems.map(i => ({ productId: i.productId, quantity: i.quantity, name: i.productName })));
    } catch (err) {
        if (intent) {
            // Deterministic rejections cannot succeed on retry -> FAILED (manual review/refund); infra errors stay retryable.
            if (err instanceof CartError || err instanceof PaymentRejected) await failIntent(intent, (err as Error).message);
            else await releaseIntent(intent);
        }
        throw err;
    }

    // Phase 2: persist. A failure here releases the reservation; the payment stays retryable.
    try {
        order = await Order.create({
            orderId: `#V2-${Date.now()}`,
            userId: new mongoose.Types.ObjectId(input.userId),
            total: priced.total,
            method: input.method,
            address: input.address,
            phone: input.phone,
            couponCode: input.couponCode,
            discount: priced.discount,
            items: priced.orderItems,
            razorpayOrderId: isPrepaid ? intent!.razorpayOrderId : undefined,
            razorpayPaymentId: isPrepaid ? intent!.razorpayPaymentId : undefined,
            razorpaySignature: isPrepaid ? input.razorpaySignature : undefined,
            paymentStatus: isPrepaid ? 'PAID' : 'PENDING',
            status: isPrepaid ? 'CONFIRMED' : 'PENDING',
        });
    } catch (err: any) {
        await releaseStock(reserved);
        if (err?.code === 11000 && intent) {
            // Unique index on the payment/provider order: it already backs an order (replay race).
            const existing = await findOrderForPayment(input.userId, intent.razorpayPaymentId, intent.razorpayOrderId);
            if (existing) return { ...existing.toObject(), id: existing._id.toString() };
            await failIntent(intent, 'Duplicate payment replay');
            throw new PaymentRejected('This payment has already been used.');
        }
        if (intent) await releaseIntent(intent);
        throw err;
    }
    if (intent) await completeIntent(intent, order._id);

    const { orderItems, total, discount } = priced;
    const orderIdCode = order.orderId;

    // 7. Send Order Placed confirmation email (non-blocking)
    try {
        const user = await User.findById(input.userId).select('name email').lean();
        if (user?.email) {
            await sendMail(
                user.email,
                `Your V2 Order ${orderIdCode} is Confirmed`,
                orderPlacedTemplate({
                    orderId: orderIdCode,
                    name: user.name,
                    items: orderItems.map(i => ({
                        productName: i.productName,
                        productPhoto: i.productPhoto,
                        quantity: i.quantity,
                        size: i.size,
                        color: i.color,
                        priceAtTime: i.priceAtTime,
                    })),
                    total,
                    discount,
                    method: input.method,
                    address: input.address,
                    phone: input.phone,
                })
            );
        }
    } catch (emailErr: any) {
        console.error('[Orders] Failed to send order confirmation email:', emailErr.message);
    }

    return { ...order.toObject(), id: order._id.toString() };
};

export const getMyOrdersService = async (userId: string) => {
    const orders = await Order.find({ userId: new mongoose.Types.ObjectId(userId) })
        .sort({ createdAt: -1 });
    return orders.map(o => ({ ...o.toObject(), id: o._id.toString() }));
};

export const getAllOrdersService = async (page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
        Order.find()
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Order.countDocuments(),
    ]);

    const ordersWithId = orders.map(o => {
        const obj = o.toObject();
        const { userId, ...rest } = obj;
        return { ...rest, user: userId, id: o._id.toString() };
    });

    return { orders: ordersWithId, total, page, limit };
};

export const updateOrderStatusService = async (id: string, updates: { status?: string; awbNumber?: string; trackingLink?: string }) => {
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };

    const updateData: any = {};
    if (updates.status) updateData.status = updates.status;
    if (updates.awbNumber !== undefined) updateData.awbNumber = updates.awbNumber;
    if (updates.trackingLink !== undefined) updateData.trackingLink = updates.trackingLink;

    const order = await Order.findOneAndUpdate(
        query,
        { $set: updateData },
        { new: true }
    ).populate('userId', 'name email');
    if (!order) throw new Error('Order not found.');

    // Send status change email (non-blocking)
    if (updates.status) {
        try {
            const userField = (order as any).userId as { name?: string; email?: string } | null;
            const userEmail = userField?.email;
            const userName = userField?.name || 'Customer';

            if (userEmail) {
                const statuses: Record<string, string> = {
                    PENDING: 'Your Order is Pending',
                    CONFIRMED: 'Your Order is Confirmed',
                    PROCESSING: 'Your Order is Being Prepared',
                    SHIPPED: `Your V2 Order has been Dispatched`,
                    DELIVERED: 'Your V2 Order has Arrived',
                    CANCELLED: 'Update on Your V2 Order',
                };
                const subject = statuses[updates.status] || `Order Update: ${updates.status}`;

                await sendMail(
                    userEmail,
                    subject,
                    orderStatusTemplate(
                        userName,
                        order.orderId,
                        updates.status,
                        updates.awbNumber,
                        updates.trackingLink
                    )
                );
            }
        } catch (emailErr: any) {
            console.error('[Orders] Failed to send status update email:', emailErr.message);
        }
    }

    return { ...order.toObject(), id: order._id.toString() };
};

export const deleteOrderService = async (id: string) => {
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
    const order = await Order.findOneAndDelete(query);
    if (!order) throw new Error('Order not found.');
    return order;
};
