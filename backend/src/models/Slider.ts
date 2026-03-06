import mongoose, { Schema, Document } from 'mongoose';

export interface ISlider extends Document {
    type: 'PROMOTIONAL' | 'CATEGORY' | 'BEST_CATEGORY' | 'NEW_ARRIVAL';
    image?: string;
    title?: string;
    subtitle?: string; // Added
    buttonText?: string; // Added
    text?: string;
    link: string;
    status: 'ACTIVE' | 'INACTIVE';
}

const SliderSchema = new Schema<ISlider>({
    type: { type: String, enum: ['PROMOTIONAL', 'CATEGORY', 'BEST_CATEGORY', 'NEW_ARRIVAL'], default: 'PROMOTIONAL' },

    image: { type: String },
    title: { type: String },
    subtitle: { type: String },
    buttonText: { type: String },
    text: { type: String },
    link: { type: String, default: '/shop' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
});

export const Slider = mongoose.model<ISlider>('Slider', SliderSchema);
