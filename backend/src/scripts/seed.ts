import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { SiteSettings } from '../models/SiteSettings';
import { Coupon } from '../models/Coupon';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/v2_enterprise";

async function main() {
    console.log('🌱 Seeding MongoDB database...');

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Drop the database for a completely clean slate (including indexes)
        await mongoose.connection.db.dropDatabase();
        console.log('🧹 Dropped database for a clean slate');

        // ── Site Settings ─────────────────────────────────────────────────────────
        await SiteSettings.create({
            logoText: 'V2',
            logoSubtext: 'Fashion Hub',
            slogan: 'A Smart Fashion Hub',
            email: 'hello@v2fashion.com',
            phone: '+91 90338 83395',
            address: 'Ground Floor, Plot No 1761/A2, Panchshil Co.Society, Sardar Nagar Road, Bhavnagar, Gujarat, 364001',
            instagram: 'https://instagram.com/v2_fashion',
            facebook: 'https://facebook.com/facebook',
            twitter: 'https://twitter.com/twitter',
            youtube: 'https://youtube.com/youtube',
            copyright: '© 2025 V2Fashion. All rights reserved.',
            storeHours: 'Mon - Sat: 10:00 AM - 09:00 PM\nSun: 10:00 AM - 07:00 PM',
            gridSettings: { mobile: 2, tablet: 2, desktop: 4 },
        });
        console.log('✅ Site settings seeded');

        // ── Admin User ────────────────────────────────────────────────────────────
        const adminPassword = await bcrypt.hash('admin@v2', 12);
        await User.create({
            name: 'V2 Admin',
            email: 'admin@v2fashion.com',
            password: adminPassword,
            phone: '9033883395',
            role: 'ADMIN',
        });
        console.log('✅ Admin user seeded — admin@v2fashion.com / admin@v2');

        // ── Demo Customer ─────────────────────────────────────────────────────────
        const custPassword = await bcrypt.hash('password123', 12);
        const customer = await User.create({
            name: 'Kunal Raykangor',
            email: 'kunal.raykangor1994@gmail.com',
            password: custPassword,
            phone: '9033883395',
            role: 'CUSTOMER',
            addresses: [
                {
                    label: 'Home',
                    street: 'Ground Floor, Plot No 1761/A2, Panchshil Co.Society, Sardar Nagar Road',
                    city: 'Bhavnagar',
                    state: 'Gujarat',
                    zipCode: '364001',
                    isDefault: true,
                }
            ],
        });
        console.log(`✅ Demo customer seeded — ${customer.email}`);

        // ── Categories ────────────────────────────────────────────────────────────
        const menswear = await Category.create({ name: 'MENSWEAR', slug: 'menswear', status: 'ACTIVE' });
        const womenswear = await Category.create({ name: 'WOMENSWEAR', slug: 'womenswear', status: 'ACTIVE' });
        const accessories = await Category.create({ name: 'ACCESSORIES', slug: 'accessories', status: 'ACTIVE' });

        // Sub-categories
        await Category.create({ name: 'Tailoring', slug: 'tailoring', parentId: menswear._id, status: 'ACTIVE' });
        await Category.create({ name: 'Denim', slug: 'denim', parentId: menswear._id, status: 'ACTIVE' });
        await Category.create({ name: 'Essentials', slug: 'essentials', parentId: womenswear._id, status: 'ACTIVE' });
        await Category.create({ name: 'Outerwear', slug: 'outerwear', parentId: womenswear._id, status: 'ACTIVE' });
        console.log(`✅ Categories seeded`);

        // ── Products ──────────────────────────────────────────────────────────────
        const products = [
            {
                name: 'Premium Linen Blend Shirt', slug: 'premium-linen-blend-shirt', price: 2499,
                photo: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=800',
                hoverImage: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=800',
                mainCategory: 'MENSWEAR', subCategory: 'Tailoring',
                description: 'Crafted from a refined linen blend, this shirt offers unparalleled breathability.',
                colors: ['White', 'Beige', 'Navy'], sizes: ['S', 'M', 'L', 'XL'],
                isNewArrival: true, isTrending: true, tags: ['Linen', 'Formal', 'Summer'],
            },
            {
                name: 'Selvedge Slim Fit Denim', slug: 'selvedge-slim-fit-denim', price: 4999,
                photo: 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=800',
                mainCategory: 'MENSWEAR', subCategory: 'Denim',
                description: 'Our signature selvedge denim woven on vintage looms for a perfect slim fit.',
                colors: ['Indigo', 'Black'], sizes: ['30', '32', '34', '36'],
                isTrending: true, tags: ['Denim', 'Selvedge', 'Classic'],
            },
            {
                name: 'Organic Cotton Essential Tee', slug: 'organic-cotton-essential-tee', price: 1299,
                photo: 'https://images.pexels.com/photos/4066293/pexels-photo-4066293.jpeg?auto=compress&cs=tinysrgb&w=800',
                mainCategory: 'WOMENSWEAR', subCategory: 'Essentials',
                description: 'A timeless wardrobe staple from 100% organic Peruvian cotton.',
                colors: ['White', 'Sage', 'Charcoal'], sizes: ['XS', 'S', 'M', 'L'],
                tags: ['Organic', 'Cotton', 'Basic'],
            },
            {
                name: 'Merino Wool Oversized Knit', slug: 'merino-wool-oversized-knit', price: 3599,
                photo: 'https://images.pexels.com/photos/5709661/pexels-photo-5709661.jpeg?auto=compress&cs=tinysrgb&w=800',
                mainCategory: 'WOMENSWEAR', subCategory: 'Outerwear',
                description: 'Luxuriously soft merino wool in an oversized silhouette — perfect for layering.',
                colors: ['Oatmeal', 'Stone'], sizes: ['S', 'M', 'L'],
                isNewArrival: true, isTrending: true, tags: ['Merino', 'Wool', 'Knitwear'],
            },
        ];

        for (const p of products) {
            await Product.create(p);
        }
        console.log(`✅ ${products.length} products seeded`);

        // ── Coupon ────────────────────────────────────────────────────────────────
        await Coupon.create({
            code: 'V2FIRST',
            discountType: 'percentage',
            discountValue: 10,
            minOrderValue: 999,
        });
        console.log('✅ Demo coupon seeded — V2FIRST (10% off on orders above ₹999)');

        console.log('\n✨ Database seeded successfully!');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        await mongoose.connection.close();
    }
}

main();
