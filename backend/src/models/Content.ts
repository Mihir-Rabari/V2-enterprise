import mongoose, { Schema, Document } from 'mongoose';

export interface IContent extends Document {
    type: 'TAGLINE' | 'SOCIAL_POST' | 'LOOKBOOK_ITEM' | 'FEATURE_ITEM' | 'PAGE' | 'LOGO' | 'BESTSELLER_HEADING' | 'MARQUEE';
    text?: string;
    image?: string;
    category?: string;
    likes?: string;
    caption?: string;
    colSpan?: number;
    status: 'ACTIVE' | 'INACTIVE';
}

const ContentSchema = new Schema<IContent>(
    {
        type: { type: String, enum: ['TAGLINE', 'SOCIAL_POST', 'LOOKBOOK_ITEM', 'FEATURE_ITEM', 'PAGE', 'LOGO', 'BESTSELLER_HEADING', 'MARQUEE'], required: true },
        text: { type: String },
        image: { type: String },
        category: { type: String },
        likes: { type: String },
        caption: { type: String },
        colSpan: { type: Number },
        status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    },
    { timestamps: true }
);

export const Content = mongoose.model<IContent>('Content', ContentSchema);
