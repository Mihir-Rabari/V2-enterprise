import mongoose, { Schema, Document } from 'mongoose';

export interface ISlider extends Document {
    image: string;
    title: string;
    link: string;
    status: 'ACTIVE' | 'INACTIVE';
}

const SliderSchema = new Schema<ISlider>({
    image: { type: String, required: true },
    title: { type: String, required: true },
    link: { type: String, default: '/shop' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
});

export const Slider = mongoose.model<ISlider>('Slider', SliderSchema);
