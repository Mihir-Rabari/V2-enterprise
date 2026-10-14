import mongoose from 'mongoose';
import { Product } from '../../models/Product';
import { Coupon } from '../../models/Coupon';
import { ACTIVE_STATUS_FILTER } from '../../utils/productStatus';
import { validateOrderItems } from '../../utils/orderItems';

export interface CartItemInput { productId: string; quantity: number; size?: string; color?: string }

/** A cart the server cannot honour (unavailable item, insufficient stock). Deterministic: retrying will not help. */
export class CartError extends Error {}

export const toPaise = (rupees: number): number => Math.round(rupees * 100);

/**
 * The single server-side pricing function. Both POST /payments/create-order (what Razorpay is asked to
 * charge) and order creation (what the order records) go through here, so they cannot drift apart.
 * Only trusted DB prices, the validated integer quantities, the payment method and a validated coupon
 * are used; nothing monetary is read from the client.
 */
export const priceCart = async (input: { items: CartItemInput[]; method: string; couponCode?: string }) => {
    validateOrderItems(input.items);

    const productIds = input.items.map(i => {
        if (typeof i.productId !== 'string' || !mongoose.Types.ObjectId.isValid(i.productId)) {
            throw new CartError(`Invalid product ID format: ${String(i.productId)}`);
        }
        return new mongoose.Types.ObjectId(i.productId);
    });

    const products = await Product.find({ _id: { $in: productIds }, status: ACTIVE_STATUS_FILTER });

    if (products.length !== input.items.length) {
        const foundIds = products.map(p => p._id.toString());
        const missingIds = input.items.filter(i => !foundIds.includes(i.productId)).map(i => i.productId);
        throw new CartError(`Some items in your cart are no longer available (${missingIds.join(', ')}). Please clear your cart and try again.`);
    }

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

    let discount = 0;
    const method = String(input.method).toLowerCase();
    const totalItems = input.items.reduce((acc, item) => acc + item.quantity, 0);

    if (method === 'pickup') {
        discount += totalItems * 100;
    } else if (method === 'prepaid') {
        discount += totalItems * 50;
    }

    if (input.couponCode && typeof input.couponCode === 'string') {
        const coupon = await Coupon.findOne({ code: input.couponCode });
        if (coupon && coupon.isActive && subtotal >= coupon.minOrderValue) {
            if (!coupon.expiresAt || coupon.expiresAt > new Date()) {
                discount += coupon.discountType === 'percentage'
                    ? (subtotal * coupon.discountValue) / 100
                    : coupon.discountValue;
            }
        }
    }

    const total = Math.max(0, subtotal - discount);
    return { products, orderItems, subtotal, discount, total, totalPaise: toPaise(total) };
};
