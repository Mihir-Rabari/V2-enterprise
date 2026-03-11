import mongoose, { Schema, Document } from 'mongoose';

export interface ISiteSettings extends Document {
    logoText: string;
    logoSubtext: string;
    logoImage: string;
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
    commitment: {
        tagline: string;
        title: string;
        description: string;
    };
    aboutContent: {
        heroTagline: string;
        heroTitle: string;
        heroImage: string;
        visionTagline: string;
        visionTitle: string;
        visionDescription1: string;
        visionDescription2: string;
        visionImage: string;
        visionArchiveText: string;
        values: {
            title: string;
            description: string;
        }[];
        footerImage: string;
    };
    homeSections: {
        categoriesTitle: string;
        featuredTagline: string;
        featuredTitle: string;
        featuredLinkText: string;
        featuredButtonText: string;
        commitmentAboutLinkText: string;
        commitmentJournalLinkText: string;
        sectionOrder: string[];
        categoryColumns: number;
        categories: {
            title: string;
            image: string;
            link: string;
        }[];
        trendingProductIds: (string | number | mongoose.Types.ObjectId)[];
        promotionalSliders: {
            type: string; // Added
            image: string;
            title: string;
            subtitle: string;
            link: string;
            buttonText: string;
            duration?: number;
        }[];
        promotionalBanner: {
            image: string;
            title: string;
            subtitle: string;
            link: string;
            buttonText: string;
            isVisible: boolean;
        };
        newStandard?: {
            isVisible: boolean;
            tagline: string;
            title: string;
            description: string;
            image?: string;
            link: string;
            buttonText: string;
        };
    };
    updatedAt: Date;
}

const SiteSettingsSchema = new Schema<ISiteSettings>(
    {
        logoText: { type: String, default: 'V2' },
        logoSubtext: { type: String, default: 'Fashion Hub' },
        logoImage: { type: String, default: '' },
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
        commitment: {
            tagline: { type: String, default: 'Our Commitment' },
            title: { type: String, default: 'The Pursuit of\nExcellence' },
            description: { type: String, default: 'Every piece in our collection is a testament to the enduring allure of craft and the uncompromising pursuit of perfection.' }
        },
        aboutContent: {
            heroTagline: { type: String, default: 'Our Heritage' },
            heroTitle: { type: String, default: 'Crafting the\nFuture of Style' },
            heroImage: { type: String, default: 'https://images.pexels.com/photos/1884581/pexels-photo-1884581.jpeg?auto=compress&cs=tinysrgb&w=1600' },
            visionTagline: { type: String, default: 'The Vision' },
            visionTitle: { type: String, default: 'Beyond Fashion,\nA Statement of Being' },
            visionDescription1: { type: String, default: 'We believe that clothing is more than just fabric; it is an extension of one\'s identity.' },
            visionDescription2: { type: String, default: 'Our mission is to provide timeless pieces that resonate with the modern individual.' },
            visionImage: { type: String, default: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=1600' },
            visionArchiveText: { type: String, default: 'V2 ARCHIVE // EST. 2025' },
            values: [
                {
                    title: { type: String, default: 'Innovation' },
                    description: { type: String, default: 'Constantly pushing boundaries in design and material.' }
                },
                {
                    title: { type: String, default: 'Quality' },
                    description: { type: String, default: 'Uncompromising attention to detail in every stitch.' }
                },
                {
                    title: { type: String, default: 'Elegance' },
                    description: { type: String, default: 'Timeless style that transcends fleeting trends.' }
                }
            ],
            footerImage: { type: String, default: 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=1600' }
        },
        homeSections: {
            categoriesTitle: { type: String, default: 'Curated Collections' },
            featuredTagline: { type: String, default: 'The V2 Standard' },
            featuredTitle: { type: String, default: 'Curated Essentials' },
            featuredLinkText: { type: String, default: 'Explore All' },
            featuredButtonText: { type: String, default: 'Shop Now' },
            commitmentAboutLinkText: { type: String, default: 'Our Story' },
            commitmentJournalLinkText: { type: String, default: 'Visit Studio' },
            sectionOrder: { type: [String], default: ['hero', 'marquee', 'new-standard', 'categories', 'promotional', 'trending', 'testimonials', 'commitment'] },
            categoryColumns: { type: Number, default: 3 },
            trendingProductIds: { type: [Schema.Types.Mixed], default: [] },
            categories: [
                {
                    title: { type: String, default: '' },
                    image: { type: String, default: '' },
                    link: { type: String, default: '' }
                }
            ],
            promotionalSliders: [
                {
                    type: { type: String, enum: ['image', 'video'], default: 'image' },
                    image: { type: String, default: '' },
                    title: { type: String, default: '' },
                    subtitle: { type: String, default: '' },
                    link: { type: String, default: '' },
                    buttonText: { type: String, default: 'Explore' },
                    duration: { type: Number, default: 5000 }
                }
            ],
            promotionalBanner: {
                image: { type: String, default: '' },
                title: { type: String, default: '' },
                subtitle: { type: String, default: '' },
                link: { type: String, default: '' },
                buttonText: { type: String, default: 'Shop Now' },
                isVisible: { type: Boolean, default: true }
            },
            newStandard: {
                isVisible: { type: Boolean, default: true },
                tagline: { type: String, default: '' },
                title: { type: String, default: '' },
                description: { type: String, default: '' },
                image: { type: String, default: '' },
                link: { type: String, default: '' },
                buttonText: { type: String, default: 'Learn More' }
            }
        }
    },
    { timestamps: { createdAt: false, updatedAt: true } }
);

export const SiteSettings = mongoose.model<ISiteSettings>('SiteSettings', SiteSettingsSchema);
