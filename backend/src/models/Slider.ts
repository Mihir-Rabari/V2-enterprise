import mongoose, { Schema, Document } from 'mongoose';

export interface ISlider extends Document {
    type: 'PROMOTIONAL' | 'CATEGORY' | 'BEST_CATEGORY' | 'NEW_ARRIVAL' | 'BOTTOM_PROMOTIONAL';
    mediaType?: 'image' | 'video'; // Added
    image?: string;
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
    mediaType: { type: String, enum: ['image', 'video'], default: 'image' }, // Added
    image: { type: String },
    title: { type: String },
    subtitle: { type: String },
    buttonText: { type: String },
    text: { type: String },
    link: { type: String, default: '/shop' },
    duration: { type: Number, default: 5000 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
});

export const Slider = mongoose.model<ISlider>('Slider', SliderSchema);
