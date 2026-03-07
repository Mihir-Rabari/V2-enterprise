import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
    productId: mongoose.Types.ObjectId;
    productName: string;
    productPhoto: string;
    quantity: number;
    size?: string;
    color?: string;
    priceAtTime: number;
}

export interface IOrder extends Document {
    orderId: string;
    userId: mongoose.Types.ObjectId;
    items: IOrderItem[];
    total: number;
    method: string;
    status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
    address: string;
    phone: string;
    awbNumber?: string;
    trackingLink?: string;
    waybill?: string;
    couponCode?: string;
    discount: number;
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
    razorpaySignature?: string;
    paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
    failureReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    productPhoto: { type: String, required: true },
    quantity: { type: Number, required: true },
    size: { type: String },
    color: { type: String },
    priceAtTime: { type: Number, required: true },
});

const OrderSchema = new Schema<IOrder>(
    {
        orderId: { type: String, required: true, unique: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        items: [OrderItemSchema],
        total: { type: Number, required: true },
        method: { type: String, required: true },
        status: {
            type: String,
            enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'],
            default: 'PENDING'
        },
        address: { type: String, required: true },
        phone: { type: String },
        awbNumber: { type: String },
        trackingLink: { type: String },
        waybill: { type: String },
        couponCode: { type: String },
        discount: { type: Number, default: 0 },
        razorpayPaymentId: { type: String },
        razorpayOrderId: { type: String },
        razorpaySignature: { type: String },
        paymentStatus: {
            type: String,
            enum: ['PENDING', 'PAID', 'FAILED'],
            default: 'PENDING'
        },
        failureReason: { type: String },
    },
    { timestamps: true }
);

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
