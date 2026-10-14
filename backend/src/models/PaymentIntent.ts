import mongoose, { Schema, Document } from 'mongoose';

/**
 * Server-side record of what a Razorpay order is allowed to pay for. Created by
 * POST /payments/create-order from the server-priced cart; it is the source of truth for the
 * expected amount, currency, owner and cart when the payment is later verified.
 *
 * CREATED -> PROCESSING (claimed by one verification) -> COMPLETED (order exists)
 *                      \-> CREATED (retryable failure)  \-> FAILED (needs manual review/refund)
 */
export type PaymentIntentStatus = 'CREATED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface IPaymentIntent extends Document {
    razorpayOrderId: string;
    userId: mongoose.Types.ObjectId;
    items: { productId: mongoose.Types.ObjectId; quantity: number }[];
    couponCode?: string;
    amountPaise: number;
    currency: 'INR';
    status: PaymentIntentStatus;
    razorpayPaymentId?: string;
    orderId?: mongoose.Types.ObjectId;
    failureReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

const PaymentIntentSchema = new Schema<IPaymentIntent>(
    {
        razorpayOrderId: { type: String, required: true, unique: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        items: [{
            _id: false,
            productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
            quantity: { type: Number, required: true },
        }],
        couponCode: { type: String },
        amountPaise: { type: Number, required: true },
        currency: { type: String, enum: ['INR'], default: 'INR' },
        status: { type: String, enum: ['CREATED', 'PROCESSING', 'COMPLETED', 'FAILED'], default: 'CREATED' },
        razorpayPaymentId: { type: String },
        orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
        failureReason: { type: String },
    },
    { timestamps: true }
);

export const PaymentIntent = mongoose.model<IPaymentIntent>('PaymentIntent', PaymentIntentSchema);
