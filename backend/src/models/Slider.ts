import mongoose, { Schema, Document } from 'mongoose';

export interface ISlider extends Document {
    type: 'PROMOTIONAL' | 'CATEGORY' | 'BEST_CATEGORY' | 'NEW_ARRIVAL';
    mediaType?: 'image' | 'video'; // Added
    image?: string;
    title?: string;
    subtitle?: string;
    buttonText?: string;
    text?: string;
    link: string;
    status: 'ACTIVE' | 'INACTIVE';
}

const SliderSchema = new Schema<ISlider>({
    type: { type: String, enum: ['PROMOTIONAL', 'CATEGORY', 'BEST_CATEGORY', 'NEW_ARRIVAL'], default: 'PROMOTIONAL' },
    mediaType: { type: String, enum: ['image', 'video'], default: 'image' }, // Added
    image: { type: String },
    title: { type: String },
    subtitle: { type: String },
    buttonText: { type: String },
    text: { type: String },
    link: { type: String, default: '/shop' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
});

export const Slider = mongoose.model<ISlider>('Slider', SliderSchema);
