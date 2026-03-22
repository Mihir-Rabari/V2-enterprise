import { Order } from '../../models/Order';
import { Product } from '../../models/Product';
import { Coupon } from '../../models/Coupon';
import { User } from '../../models/User';
import mongoose from 'mongoose';
import { verifyRazorpaySignature } from '../payments/payments.service';
import { sendMail } from '../../utils/mailer';
import { orderPlacedTemplate, orderStatusTemplate } from '../../utils/emailTemplates';

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

export const createOrderService = async (input: CreateOrderInput) => {
    if (!mongoose.Types.ObjectId.isValid(input.userId)) {
        console.error('[Orders] CRITICAL: Invalid User ID format received:', input.userId);
        throw new Error(`Invalid User ID format (${input.userId}). Please log out and log in again.`);
    }

    // 1. Fetch all products to get live prices
    const productIds = input.items.map(i => {
        if (!mongoose.Types.ObjectId.isValid(i.productId)) {
            console.error('[Orders] Invalid product ID format:', i.productId);
            throw new Error(`Invalid product ID format: ${i.productId}`);
        }
        return new mongoose.Types.ObjectId(i.productId);
    });

    const products = await Product.find({
        _id: { $in: productIds },
        status: 'ACTIVE'
    });

    if (products.length !== input.items.length) {
        const foundIds = products.map(p => p._id.toString());
        const missingIds = input.items
            .filter(i => !foundIds.includes(i.productId))
            .map(i => i.productId);
        const foundButInactive = products.filter(p => p.status !== 'ACTIVE').map(p => p._id.toString());
        throw new Error(`Some items in your cart are no longer available (${[...missingIds, ...foundButInactive].join(', ')}). Please clear your cart and try again.`);
    }

    // 2. Calculate total server-side
    let subtotal = 0;
    const orderItems = input.items.map((item) => {
        const product = products.find((p) => p._id.toString() === item.productId)!;
        subtotal += product.price * item.quantity;
        return {
            productId: product._id,
            productName: product.name,
            productPhoto: product.photo,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
            priceAtTime: product.price,
        };
    });

    // 3. Apply coupon and method-specific discounts
    let discount = 0;
    const method = input.method.toLowerCase();
    const totalItems = input.items.reduce((acc, item) => acc + item.quantity, 0);

    if (method === 'pickup') {
        discount += totalItems * 100;
    } else if (method === 'prepaid') {
        discount += totalItems * 50;
    }

    if (input.couponCode) {
        const coupon = await Coupon.findOne({ code: input.couponCode });
        if (coupon && coupon.isActive && subtotal >= coupon.minOrderValue) {
            if (!coupon.expiresAt || coupon.expiresAt > new Date()) {
                const couponDiscount = coupon.discountType === 'percentage'
                    ? (subtotal * coupon.discountValue) / 100
                    : coupon.discountValue;
                discount += couponDiscount;
            }
        }
    }

    // 4. Razorpay Verification (only for prepaid)
    if (method === 'prepaid') {
        if (!input.razorpayOrderId || !input.razorpayPaymentId || !input.razorpaySignature) {
            throw new Error('Razorpay payment details are missing for prepaid order.');
        }
        const isVerified = verifyRazorpaySignature(
            input.razorpayOrderId,
            input.razorpayPaymentId,
            input.razorpaySignature
        );
        if (!isVerified) {
            throw new Error('Payment verification failed. Please contact support.');
        }
    }

    const total = Math.max(0, subtotal - discount);
    const orderIdCode = `#V2-${Date.now()}`;

    // 5. Create order
    const order = await Order.create({
        orderId: orderIdCode,
        userId: new mongoose.Types.ObjectId(input.userId),
        total,
        method: input.method,
        address: input.address,
        phone: input.phone,
        couponCode: input.couponCode,
        discount,
        items: orderItems,
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
        razorpaySignature: input.razorpaySignature,
        paymentStatus: method === 'prepaid' ? 'PAID' : 'PENDING',
        status: method === 'prepaid' ? 'CONFIRMED' : 'PENDING',
    });

    // 6. Deduct stock
    for (const item of input.items) {
        if (item.size) {
            await Product.updateOne(
                { _id: item.productId, 'variants.size': item.size },
                { $inc: { 'variants.$.quantity': -item.quantity } }
            );
        }
    }

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
