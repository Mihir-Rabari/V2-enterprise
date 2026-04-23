import mongoose, { Schema, Document } from 'mongoose';

export interface ICoupon extends Document {
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minOrderValue: number;
    isActive: boolean;
    expiresAt?: Date;
    createdAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
    {
        code: { type: String, required: true, unique: true, index: true },
        discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
        discountValue: { type: Number, required: true },
        minOrderValue: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
        expiresAt: { type: Date },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

export const Coupon = mongoose.model<ICoupon>('Coupon', CouponSchema);