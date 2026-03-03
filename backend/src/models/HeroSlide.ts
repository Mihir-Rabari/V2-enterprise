import mongoose, { Schema, Document } from 'mongoose';

export interface IHeroSlide extends Document {
    type: 'image' | 'video';
    url: string;
    tagline: string;
    title: string;
    description: string;
    ctaText: string;
    ctaLink: string;
    duration?: number;
    order: number;
    status: 'ACTIVE' | 'INACTIVE';
}

const HeroSlideSchema = new Schema<IHeroSlide>({
    type: { type: String, enum: ['image', 'video'], default: 'image' },
    url: { type: String, required: true },
    tagline: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    ctaText: { type: String, required: true },
    ctaLink: { type: String, default: '/shop' },
    duration: { type: Number },
    order: { type: Number, default: 0 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
});

export const HeroSlide = mongoose.model<IHeroSlide>('HeroSlide', HeroSlideSchema);
