import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // ── Site Settings ─────────────────────────────────────────────────────────
    await prisma.siteSettings.upsert({
        where: { id: 'global_settings' },
        update: {},
        create: {
            id: 'global_settings',
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
        },
    });
    console.log('✅ Site settings seeded');

    // ── Admin User ────────────────────────────────────────────────────────────
    const adminPassword = await bcrypt.hash('admin@v2', 12);
    await prisma.user.upsert({
        where: { email: 'admin@v2fashion.com' },
        update: {},
        create: {
            name: 'V2 Admin',
            email: 'admin@v2fashion.com',
            password: adminPassword,
            phone: '9033883395',
            role: 'ADMIN',
        },
    });
    console.log('✅ Admin user seeded — admin@v2fashion.com / admin@v2');

    // ── Demo Customer ─────────────────────────────────────────────────────────
    const custPassword = await bcrypt.hash('password123', 12);
    const customer = await prisma.user.upsert({
        where: { email: 'kunal.raykangor1994@gmail.com' },
        update: {},
        create: {
            name: 'Kunal Raykangor',
            email: 'kunal.raykangor1994@gmail.com',
            password: custPassword,
            phone: '9033883395',
            role: 'CUSTOMER',
            addresses: {
                create: {
                    label: 'Home',
                    street: 'Ground Floor, Plot No 1761/A2, Panchshil Co.Society, Sardar Nagar Road',
                    city: 'Bhavnagar',
                    state: 'Gujarat',
                    zipCode: '364001',
                    isDefault: true,
                },
            },
        },
    });
    console.log(`✅ Demo customer seeded — ${customer.email}`);

    // ── Categories ────────────────────────────────────────────────────────────
    const menswear = await prisma.category.upsert({
        where: { slug: 'menswear' },
        update: {},
        create: { name: 'MENSWEAR', slug: 'menswear', status: 'ACTIVE' },
    });
    const womenswear = await prisma.category.upsert({
        where: { slug: 'womenswear' },
        update: {},
        create: { name: 'WOMENSWEAR', slug: 'womenswear', status: 'ACTIVE' },
    });
    const accessories = await prisma.category.upsert({
        where: { slug: 'accessories' },
        update: {},
        create: { name: 'ACCESSORIES', slug: 'accessories', status: 'ACTIVE' },
    });
    // Sub-categories
    await prisma.category.upsert({ where: { slug: 'tailoring' }, update: {}, create: { name: 'Tailoring', slug: 'tailoring', parentId: menswear.id, status: 'ACTIVE' } });
    await prisma.category.upsert({ where: { slug: 'denim' }, update: {}, create: { name: 'Denim', slug: 'denim', parentId: menswear.id, status: 'ACTIVE' } });
    await prisma.category.upsert({ where: { slug: 'essentials' }, update: {}, create: { name: 'Essentials', slug: 'essentials', parentId: womenswear.id, status: 'ACTIVE' } });
    await prisma.category.upsert({ where: { slug: 'outerwear' }, update: {}, create: { name: 'Outerwear', slug: 'outerwear', parentId: womenswear.id, status: 'ACTIVE' } });
    console.log(`✅ Categories seeded`);

    // ── Products ──────────────────────────────────────────────────────────────
    const products = [
        {
            name: 'Premium Linen Blend Shirt', price: 2499,
            photo: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=800',
            hoverImage: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=800',
            mainCategory: 'MENSWEAR', subCategory: 'Tailoring',
            description: 'Crafted from a refined linen blend, this shirt offers unparalleled breathability.',
            colors: ['White', 'Beige', 'Navy'], sizes: ['S', 'M', 'L', 'XL'],
            isNew: true, isTrending: true, tags: ['Linen', 'Formal', 'Summer'],
        },
        {
            name: 'Selvedge Slim Fit Denim', price: 4999,
            photo: 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=800',
            mainCategory: 'MENSWEAR', subCategory: 'Denim',
            description: 'Our signature selvedge denim woven on vintage looms for a perfect slim fit.',
            colors: ['Indigo', 'Black'], sizes: ['30', '32', '34', '36'],
            isTrending: true, tags: ['Denim', 'Selvedge', 'Classic'],
        },
        {
            name: 'Organic Cotton Essential Tee', price: 1299,
            photo: 'https://images.pexels.com/photos/4066293/pexels-photo-4066293.jpeg?auto=compress&cs=tinysrgb&w=800',
            mainCategory: 'WOMENSWEAR', subCategory: 'Essentials',
            description: 'A timeless wardrobe staple from 100% organic Peruvian cotton.',
            colors: ['White', 'Sage', 'Charcoal'], sizes: ['XS', 'S', 'M', 'L'],
            tags: ['Organic', 'Cotton', 'Basic'],
        },
        {
            name: 'Merino Wool Oversized Knit', price: 3599,
            photo: 'https://images.pexels.com/photos/5709661/pexels-photo-5709661.jpeg?auto=compress&cs=tinysrgb&w=800',
            mainCategory: 'WOMENSWEAR', subCategory: 'Outerwear',
            description: 'Luxuriously soft merino wool in an oversized silhouette — perfect for layering.',
            colors: ['Oatmeal', 'Stone'], sizes: ['S', 'M', 'L'],
            isNew: true, isTrending: true, tags: ['Merino', 'Wool', 'Knitwear'],
        },
    ];

    for (const p of products) {
        await prisma.product.upsert({
            where: { id: products.indexOf(p) + 1 },
            update: {},
            create: p,
        });
    }
    console.log(`✅ ${products.length} products seeded`);

    // ── Coupon ────────────────────────────────────────────────────────────────
    await prisma.coupon.upsert({
        where: { code: 'V2FIRST' },
        update: {},
        create: {
            code: 'V2FIRST',
            discountType: 'percentage',
            discountValue: 10,
            minOrderValue: 999,
        },
    });
    console.log('✅ Demo coupon seeded — V2FIRST (10% off on orders above ₹999)');

    console.log('\n✨ Database seeded successfully!');
}

main()
    .catch(e => { console.error('❌ Seed failed:', e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
