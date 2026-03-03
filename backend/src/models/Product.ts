import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
    name: string;
    price: number;
    originalPrice?: number;
    discount?: string;
    photo: string;
    hoverImage?: string;
    mainCategory: string;
    subCategory: string;
    description: string;
    sizes: string[];
    colors: string[];
    isNewArrival: boolean;
    isTrending: boolean;
    tags: string[];
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: Date;
    updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
    {
        name: { type: String, required: true },
        price: { type: Number, required: true },
        originalPrice: { type: Number },
        discount: { type: String },
        photo: { type: String, required: true },
        hoverImage: { type: String },
        mainCategory: { type: String, required: true, index: true },
        subCategory: { type: String, required: true, index: true },
        description: { type: String, required: true },
        sizes: [{ type: String }],
        colors: [{ type: String }],
        isNewArrival: { type: Boolean, default: false },
        isTrending: { type: Boolean, default: false },
        tags: [{ type: String }],
        status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    },
    { timestamps: true }
);

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
