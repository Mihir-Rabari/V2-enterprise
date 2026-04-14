import mongoose, { Schema, Document } from 'mongoose';

export interface IHeroSlide extends Document {
    type: 'image' | 'video';
    url: string;
    laptopUrl?: string;
    mobileUrl?: string;
    tabletUrl?: string;
    tagline: string;
    title: string;
    description: string;
    ctaText: string;
    ctaLink: string;
    taglineVisible?: boolean;
    titleVisible?: boolean;
    descriptionVisible?: boolean;
    ctaVisible?: boolean;
    duration?: number;
    order: number;
    status: 'ACTIVE' | 'INACTIVE';
}

const HeroSlideSchema = new Schema<IHeroSlide>({
    type: { type: String, enum: ['image', 'video'], default: 'image' },
    url: { type: String, required: true },
    laptopUrl: { type: String },
    mobileUrl: { type: String },
    tabletUrl: { type: String },
    tagline: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    ctaText: { type: String, required: true },
    ctaLink: { type: String, default: '/shop' },
    taglineVisible: { type: Boolean },
    titleVisible: { type: Boolean },
    descriptionVisible: { type: Boolean },
    ctaVisible: { type: Boolean },
    duration: { type: Number, default: 5000 },
    order: { type: Number, default: 0 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'Active', 'Inactive'], default: 'ACTIVE' },
});

export const HeroSlide = mongoose.model<IHeroSlide>('HeroSlide', HeroSlideSchema);
