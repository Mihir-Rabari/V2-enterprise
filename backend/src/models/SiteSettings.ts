import mongoose, { Schema, Document } from 'mongoose';

export interface ISiteSettings extends Document {
    logoText: string;
    logoSubtext: string;
    slogan: string;
    email: string;
    phone: string;
    address: string;
    instagram: string;
    twitter: string;
    facebook: string;
    youtube: string;
    copyright: string;
    storeHours: string;
    gridSettings: {
        mobile: number;
        tablet: number;
        desktop: number;
    };
    updatedAt: Date;
}

const SiteSettingsSchema = new Schema<ISiteSettings>(
    {
        logoText: { type: String, default: 'V2' },
        logoSubtext: { type: String, default: 'Fashion Hub' },
        slogan: { type: String, default: 'A Smart Fashion Hub' },
        email: { type: String, default: 'hello@v2fashion.com' },
        phone: { type: String, default: '+91 90338 83395' },
        address: { type: String, default: '' },
        instagram: { type: String, default: '' },
        twitter: { type: String, default: '' },
        facebook: { type: String, default: '' },
        youtube: { type: String, default: '' },
        copyright: { type: String, default: '© 2025 V2Fashion. All rights reserved.' },
        storeHours: { type: String, default: 'Mon - Sat: 10:00 AM - 09:00 PM\nSun: 10:00 AM - 07:00 PM' },
        gridSettings: {
            mobile: { type: Number, default: 2 },
            tablet: { type: Number, default: 2 },
            desktop: { type: Number, default: 4 },
        },
    },
    { timestamps: { createdAt: false, updatedAt: true } }
);

export const SiteSettings = mongoose.model<ISiteSettings>('SiteSettings', SiteSettingsSchema);
