import mongoose, { Schema, Document } from 'mongoose';

export interface ISlider extends Document {
    type: 'PROMOTIONAL' | 'CATEGORY' | 'BEST_CATEGORY' | 'NEW_ARRIVAL' | 'BOTTOM_PROMOTIONAL';
    mediaType?: 'image' | 'video';
    image?: string;
    laptopUrl?: string; // Added for responsiveness
    tabletUrl?: string; // Added for responsiveness
    mobileUrl?: string; // Added for responsiveness
    title?: string;
    subtitle?: string;
    buttonText?: string;
    text?: string;
    link: string;
    duration?: number;
    status: 'ACTIVE' | 'INACTIVE';
}

const SliderSchema = new Schema<ISlider>({
    type: { type: String, enum: ['PROMOTIONAL', 'CATEGORY', 'BEST_CATEGORY', 'NEW_ARRIVAL', 'BOTTOM_PROMOTIONAL'], default: 'PROMOTIONAL' },
    mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
    image: { type: String },
    laptopUrl: { type: String },
    tabletUrl: { type: String },
    mobileUrl: { type: String },
    title: { type: String },
    subtitle: { type: String },
    buttonText: { type: String },
    text: { type: String },
    link: { type: String, default: '/shop' },
    duration: { type: Number, default: 5000 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'Active', 'Inactive'], default: 'ACTIVE' },
});

export const Slider = mongoose.model<ISlider>('Slider', SliderSchema);
