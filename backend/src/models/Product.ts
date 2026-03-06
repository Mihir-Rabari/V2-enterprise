import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
    name: string;
    price: number;
    originalPrice?: number;
    discount?: string;
    photo: string;
    photos?: string[];
    videoUrl?: string; // NEW API property for embedded videos
    hoverImage?: string;
    mainCategory: string;
    subCategory: string;
    styleCode?: string;
    color: string;
    colorHex?: string; // NEW API property for precision color
    description: string;
    materialCare: string;
    sizes: string[];
    variants: {
        size: string;
        color?: string;
        quantity: number;
    }[];
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
        videoUrl: { type: String },
        hoverImage: { type: String },
        mainCategory: { type: String, required: true, index: true },
        subCategory: { type: String, required: true, index: true },
        styleCode: { type: String, required: false, index: true },
        color: { type: String, required: true },
        colorHex: { type: String },
        description: { type: String, required: true },
        materialCare: { type: String, required: true },
        sizes: [{ type: String }],
        variants: [
            {
                size: { type: String, required: true },
                color: { type: String },
                quantity: { type: Number, required: true, default: 0 },
                _id: false
            }
        ],
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
        status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    },
    { timestamps: true }
);

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
