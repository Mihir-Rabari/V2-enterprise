import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
    name: string;
    price: number;
    originalPrice?: number;
    discount?: string;
    photo: string;
    photos?: string[];
    videoUrls?: string[]; // Multiple YouTube videos
    hoverImage?: string;
    mainCategory: string;
    subCategory: string;
    styleCode?: string;
    color: string;
    colorHex?: string;
    size: string;
    quantity: number;
    description: string;
    materialCare: string;
    patternType?: string;
    fabric?: string;
    collar?: string;
    sleeve?: string;
    neck?: string;
    pocket?: string;
    length?: string;
    chest?: string;
    waist?: string;
    shoulder?: string;
    sleeveLength?: string;
    isNewArrival: boolean;
    isTrending: boolean;
    tags: string[];
    customAttributes: Map<string, string>;
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
        photos: [{ type: String }],
        videoUrls: [{ type: String }],
        hoverImage: { type: String },
        mainCategory: { type: String, required: true, index: true },
        subCategory: { type: String, required: true, index: true },
        styleCode: { type: String, required: false, index: true },
        color: { type: String, required: true },
        colorHex: { type: String },
        size: { type: String, required: true },
        quantity: { type: Number, required: true, default: 0 },
        description: { type: String, required: true },
        materialCare: { type: String, required: true },
        patternType: { type: String },
        fabric: { type: String },
        collar: { type: String },
        sleeve: { type: String },
        neck: { type: String },
        pocket: { type: String },
        length: { type: String },
        chest: { type: String },
        waist: { type: String },
        shoulder: { type: String },
        sleeveLength: { type: String },
        isNewArrival: { type: Boolean, default: false },
        isTrending: { type: Boolean, default: false },
        tags: [{ type: String }],
        customAttributes: { type: Map, of: String, default: {} },
        status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'Active', 'Inactive'], default: 'ACTIVE' },
    },
    { timestamps: true }
);

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
