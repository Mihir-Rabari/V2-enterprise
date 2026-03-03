import { Order } from '../../models/Order';
import { Product } from '../../models/Product';
import { Coupon } from '../../models/Coupon';
import { User } from '../../models/User';
import mongoose from 'mongoose';

interface CreateOrderInput {
    userId: string;
    items: { productId: string; quantity: number; size?: string; color?: string }[];
    method: string;
    address: string;
    phone: string;
    couponCode?: string;
}

export const createOrderService = async (input: CreateOrderInput) => {
    // 1. Fetch all products to get live prices
    const productIds = input.items.map(i => new mongoose.Types.ObjectId(i.productId));
    const products = await Product.find({
        _id: { $in: productIds },
        status: 'ACTIVE'
    });

    if (products.length !== input.items.length) {
        throw new Error('One or more products are unavailable or not found.');
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

    // 3. Apply coupon if provided
    let discount = 0;
    if (input.couponCode) {
        const coupon = await Coupon.findOne({ code: input.couponCode });
        if (coupon && coupon.isActive && subtotal >= coupon.minOrderValue) {
            if (!coupon.expiresAt || coupon.expiresAt > new Date()) {
                discount = coupon.discountType === 'percentage'
                    ? (subtotal * coupon.discountValue) / 100
                    : coupon.discountValue;
            }
        }
    }

    const total = Math.max(0, subtotal - discount);
    const orderIdCode = `#V2-${Date.now()}`;

    // 4. Create order
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
    });

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
        // Rename userId to user to match Prisma output if frontend expects it
        const { userId, ...rest } = obj;
        return { ...rest, user: userId, id: o._id.toString() };
    });

    return { orders: ordersWithId, total, page, limit };
};

export const updateOrderStatusService = async (id: string, status: string) => {
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
    const order = await Order.findOneAndUpdate(
        query,
        { status: status as 'PENDING' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' },
        { new: true }
    );
    if (!order) throw new Error('Order not found.');
    return { ...order.toObject(), id: order._id.toString() };
};
