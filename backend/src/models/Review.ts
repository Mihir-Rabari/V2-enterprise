import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
    productId: mongoose.Types.ObjectId;
    userId?: mongoose.Types.ObjectId;
    customerName: string;
    customerEmail: string;
    rating: number;
    reviewText: string;
    status: 'ACTIVE' | 'INACTIVE';
    homepageVisible: boolean;
    date: Date;
}

const ReviewSchema = new Schema<IReview>(
    {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        customerName: { type: String, required: true },
        customerEmail: { type: String, required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        reviewText: { type: String, required: true },
        status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'INACTIVE' },
        homepageVisible: { type: Boolean, default: false },
        date: { type: Date, default: Date.now },
    },
    { timestamps: { createdAt: 'date', updatedAt: false } }
);

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
