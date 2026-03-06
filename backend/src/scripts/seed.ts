import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { SiteSettings } from '../models/SiteSettings';
import { Coupon } from '../models/Coupon';
import { HeroSlide } from '../models/HeroSlide';
import { Slider } from '../models/Slider';
import { Review } from '../models/Review';
import { JournalPost } from '../models/JournalPost';
import { Content } from '../models/Content';
import { ContactMessage } from '../models/ContactMessage';
import { Order } from '../models/Order';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/v2_enterprise";

async function main() {
    console.log('🌱 Seeding MongoDB database...');

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Drop the database for a completely clean slate (including indexes)
        if (mongoose.connection.db) {
            await mongoose.connection.db.dropDatabase();
            console.log('🧹 Dropped database for a clean slate');
        } else {
            console.log('⚠️ Warning: Database not found, skipping drop');
        }

        // ── Site Settings ─────────────────────────────────────────────────────────
        await SiteSettings.create({
            logoText: 'V2',
            logoSubtext: 'Fashion Hub',
            logoImage: '/v2_logo.webp', // Default logo path or actual URL
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
            commitment: {
                tagline: "OUR COMMITMENT",
                title: "Sustainable\nLuxury.",
                description: "We believe in creating timeless pieces that respect both the wearer and the environment. Every garment is crafted with longevity in mind.\n\nOur transparent supply chain ensures ethical practices at every step, from raw material sourcing to the final stitch."
            },
            homeSections: {
                categoriesTitle: "Discover",
                featuredTagline: "TRENDING",
                featuredTitle: "Curated Essentials",
                featuredLinkText: "Discover the Philosophy",
                featuredButtonText: "Explore More",
                commitmentAboutLinkText: "Learn About Us",
                commitmentJournalLinkText: "Read Journal",
                sectionOrder: ['hero', 'marquee', 'new-standard', 'trending', 'categories', 'promotional_slider', 'essentials', 'promotional', 'testimonials', 'social', 'commitment'],
                categoryColumns: 4,
                trendingProductIds: [],
                categories: [
                    { title: "Knitwear", image: "https://images.pexels.com/photos/5709661/pexels-photo-5709661.jpeg?auto=compress&cs=tinysrgb&w=800", link: "/shop?category=Knitwear" },
                    { title: "Outerwear", image: "https://images.pexels.com/photos/837140/pexels-photo-837140.jpeg?auto=compress&cs=tinysrgb&w=800", link: "/shop?category=Outerwear" },
                    { title: "Tailoring", image: "https://images.pexels.com/photos/5935754/pexels-photo-5935754.jpeg?auto=compress&cs=tinysrgb&w=800", link: "/shop?category=Tailoring" },
                    { title: "Denim", image: "https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=800", link: "/shop?category=Denim" }
                ],
                promotionalSliders: [
                    {
                        image: 'https://images.pexels.com/photos/1884581/pexels-photo-1884581.jpeg?auto=compress&cs=tinysrgb&w=800',
                        title: 'New Season Arrival',
                        subtitle: 'UP TO 50% OFF SELECT PIECES',
                        buttonText: 'Shop Newest',
                        link: '/shop?sort=Newest'
                    },
                    {
                        image: 'https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=800',
                        title: 'Exquisite Knitwear',
                        subtitle: 'CURATED ESSENTIALS',
                        buttonText: 'Explore Knitwear',
                        link: '/shop?category=Knitwear'
                    }
                ],
                promotionalBanner: {
                    image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&q=80&w=2670',
                    title: 'Limited Collection\n2026 Release',
                    subtitle: 'EXCLUSIVE DROP',
                    link: '/shop?sort=Newest',
                    buttonText: 'View Collection',
                    isVisible: true
                },
                newStandard: {
                    isVisible: true,
                    tagline: 'The New Standard',
                    title: 'Elevate Your \n Everyday.',
                    description: 'Discover the latest additions to our collection. Meticulously crafted for the modern individual who values silence over noise.',
                    image: '',
                    link: '/new-arrivals?sort=Newest',
                    buttonText: 'The New Collection'
                }
            },
            aboutContent: {
                heroImage: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&q=80&w=2670",
                heroTagline: "Est. 2026",
                heroTitle: "Defining\nModern\nHeritage.",
                visionTagline: "The Vision",
                visionTitle: "Elevating the\nEveryday.",
                visionDescription1: "V2 was born from a desire to strip away the unnecessary and focus on what truly matters: exceptional fit, premium materials, and uncompromising construction.",
                visionDescription2: "We don't follow trends. We create foundation pieces that build a wardrobe meant to be worn, loved, and lived in for years to come.",
                visionImage: "https://images.unsplash.com/photo-1550597375-711e64627289?auto=format&fit=crop&q=80&w=1200",
                visionArchiveText: "Archive / 01",
                values: [
                    { title: "Honest Craft.", description: "Working with generational artisans who understand the soul of the fabric." },
                    { title: "Silent Design.", description: "Aesthetics that speak through silhouette and texture rather than loud branding." },
                    { title: "Enduring Quality.", description: "Garments engineered to age beautifully and withstand the test of time." }
                ],
                footerImage: "https://images.unsplash.com/photo-1523381294911-8d3cead13475?auto=format&fit=crop&q=80&w=2670"
            }
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
            role: 'ADMIN',
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
        console.log(`✅ Admin user seeded — ${customer.email}`);

        // ── Categories ────────────────────────────────────────────────────────────
        const menswear = await Category.create({
            name: 'MENSWEAR',
            slug: 'menswear',
            status: 'ACTIVE',
            description: 'Premium curated selection of contemporary menswear, from tailored suits to elevated essentials.',
            image: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=800'
        });
        const womenswear = await Category.create({
            name: 'WOMENSWEAR',
            slug: 'womenswear',
            status: 'ACTIVE',
            description: 'Sophisticated womenswear designed for the modern individual who values silhouette and texture.',
            image: 'https://images.pexels.com/photos/4066293/pexels-photo-4066293.jpeg?auto=compress&cs=tinysrgb&w=800'
        });

        // Sub-categories
        await Category.create({ name: 'Tailoring', slug: 'tailoring', parentId: menswear._id, status: 'ACTIVE', description: 'Exceptional cuts and premium fabrics for the discerning gentleman.' });
        await Category.create({ name: 'Denim', slug: 'denim', parentId: menswear._id, status: 'ACTIVE', description: 'Selvedge and high-quality denim built to age beautifully.' });
        await Category.create({ name: 'Essentials', slug: 'essentials', parentId: womenswear._id, status: 'ACTIVE', description: 'Foundation pieces that anchor every sophisticated wardrobe.' });
        await Category.create({ name: 'Outerwear', slug: 'outerwear', parentId: womenswear._id, status: 'ACTIVE', description: 'Impeccably constructed coats and jackets for every season.' });
        console.log(`✅ Categories seeded (Clothing Only)`);

        // ── Products ──────────────────────────────────────────────────────────────
        const products = [
            // ── SHIRT-01: Premium Linen Blend Shirt (Mens) ─────────────────
            {
                name: 'Premium Linen Blend Shirt',
                styleCode: 'SHIRT-01',
                color: 'Optic White', colorHex: '#FFFFFF',
                fabric: 'Linen Blend', patternType: 'Plain',
                collar: 'Spread Collar', sleeve: 'Full Sleeve',
                neck: 'Collar Neck', pocket: 'Single Pocket',
                length: '28', chest: '42', waist: '40', shoulder: '18.5', sleeveLength: '25.5',
                videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                price: 2499,
                originalPrice: 3499,
                discount: '28% OFF',
                photo: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=800',
                hoverImage: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=800',
                mainCategory: 'MENSWEAR', subCategory: 'Tailoring',
                description: 'Refined linen blend shirt offering unparalleled breathability. Perfect for warm days and semi-formal occasions.',
                materialCare: '55% Linen, 45% Cotton.\nMachine wash cold on gentle cycle.\nDo not bleach.\nIron on medium heat.',
                sizes: ['S', 'M', 'L', 'XL'],
                variants: [
                    { size: 'S', color: 'Optic White', quantity: 10 },
                    { size: 'M', color: 'Optic White', quantity: 15 },
                    { size: 'L', color: 'Optic White', quantity: 8 },
                    { size: 'XL', color: 'Optic White', quantity: 5 },
                ],
                isNewArrival: true, isTrending: true, tags: ['Linen', 'Formal', 'Summer'],
                status: 'ACTIVE',
            },
            {
                name: 'Premium Linen Blend Shirt',
                styleCode: 'SHIRT-01',
                color: 'Navy Blue', colorHex: '#000080',
                fabric: 'Linen Blend', patternType: 'Plain',
                collar: 'Spread Collar', sleeve: 'Full Sleeve',
                neck: 'Collar Neck', pocket: 'Single Pocket',
                length: '28', chest: '42', waist: '40', shoulder: '18.5', sleeveLength: '25.5',
                price: 2499,
                originalPrice: 3499,
                photo: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=800',
                mainCategory: 'MENSWEAR', subCategory: 'Tailoring',
                description: 'Refined linen blend shirt in a classic navy shade. Impeccable drape and comfort.',
                materialCare: '55% Linen, 45% Cotton.\nMachine wash cold.\nWash with like colors.',
                sizes: ['M', 'L', 'XL'],
                variants: [
                    { size: 'M', color: 'Navy Blue', quantity: 12 },
                    { size: 'L', color: 'Navy Blue', quantity: 10 },
                    { size: 'XL', color: 'Navy Blue', quantity: 7 },
                ],
                isTrending: true, tags: ['Linen', 'Navy', 'Classic'],
                status: 'ACTIVE',
            },

            // ── DENIM-01: Selvedge Slim Fit Denim (Mens) ──────────────────
            {
                name: 'Selvedge Slim Fit Denim',
                styleCode: 'DENIM-01',
                color: 'Raw Indigo', colorHex: '#1A237E',
                fabric: '14oz Selvedge Denim', patternType: 'Solid',
                length: '32', waist: '32',
                price: 4999,
                originalPrice: 6999,
                discount: '₹2000 OFF',
                photo: 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=800',
                hoverImage: 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=800',
                mainCategory: 'MENSWEAR', subCategory: 'Denim',
                description: 'Signature selvedge denim woven on vintage looms. Designed to mold to your body over time.',
                materialCare: '100% Cotton Selvedge Denim.\nWash sparingly.\nTurn inside out before washing.\nCold wash only.',
                sizes: ['30', '32', '34', '36'],
                variants: [
                    { size: '30', color: 'Raw Indigo', quantity: 8 },
                    { size: '32', color: 'Raw Indigo', quantity: 14 },
                    { size: '34', color: 'Raw Indigo', quantity: 10 },
                    { size: '36', color: 'Raw Indigo', quantity: 6 },
                ],
                isTrending: true, tags: ['Denim', 'Selvedge', 'Classic'],
                status: 'ACTIVE',
            },

            // ── TEE-01: Organic Cotton Essential Tee (Womens) ───────────────
            {
                name: 'Organic Cotton Essential Tee',
                styleCode: 'TEE-01',
                color: 'Desert Sage', colorHex: '#879F84',
                fabric: 'Organic Cotton', patternType: 'Plain',
                neck: 'Round Neck', sleeve: 'Half Sleeve',
                length: '24', chest: '36',
                price: 1299,
                photo: 'https://images.pexels.com/photos/4066293/pexels-photo-4066293.jpeg?auto=compress&cs=tinysrgb&w=800',
                mainCategory: 'WOMENSWEAR', subCategory: 'Essentials',
                description: 'Wardrobe staple from 100% organic cotton. Exceptionally soft and sustainable.',
                materialCare: '100% Organic Cotton.\nTumble dry low.\nMachine wash cold.',
                sizes: ['XS', 'S', 'M', 'L'],
                variants: [
                    { size: 'S', color: 'Desert Sage', quantity: 20 },
                    { size: 'M', color: 'Desert Sage', quantity: 18 },
                ],
                tags: ['Organic', 'Cotton', 'Basic'],
                status: 'ACTIVE',
            },
            {
                name: 'Organic Cotton Essential Tee',
                styleCode: 'TEE-01',
                color: 'Midnight Black', colorHex: '#121212',
                fabric: 'Organic Cotton', patternType: 'Plain',
                neck: 'Round Neck', sleeve: 'Half Sleeve',
                price: 1299,
                photo: 'https://images.pexels.com/photos/4066293/pexels-photo-4066293.jpeg?auto=compress&cs=tinysrgb&w=800', // Need replacement for black color
                mainCategory: 'WOMENSWEAR', subCategory: 'Essentials',
                description: 'The definitive black tee. Minimalist design with maximum comfort.',
                materialCare: '100% Organic Cotton.\nMachine wash cold.\nDo not iron on print/labels.',
                sizes: ['S', 'M', 'L'],
                variants: [
                    { size: 'S', color: 'Midnight Black', quantity: 25 },
                    { size: 'M', color: 'Midnight Black', quantity: 30 },
                    { size: 'L', color: 'Midnight Black', quantity: 15 },
                ],
                isTrending: true, tags: ['Essential', 'Black', 'Minimal'],
                status: 'ACTIVE',
            },

            // ── TSHIRT-02: Luxury Heavyweight Oversized Tee (Mens) ──────────
            {
                name: 'Luxury Heavyweight Tee',
                styleCode: 'TSHIRT-02',
                color: 'Bone', colorHex: '#E3DAC9',
                fabric: '240 GSM Cotton', patternType: 'Solid',
                neck: 'High Neck', sleeve: 'Drop Shoulder Sleeve',
                length: '29', chest: '46', shoulder: '22',
                price: 1899,
                originalPrice: 2499,
                photo: 'https://images.pexels.com/photos/1018911/pexels-photo-1018911.jpeg?auto=compress&cs=tinysrgb&w=800',
                hoverImage: 'https://images.pexels.com/photos/1018914/pexels-photo-1018914.jpeg?auto=compress&cs=tinysrgb&w=800',
                mainCategory: 'MENSWEAR', subCategory: 'Essentials',
                description: 'Boxy, oversized fit tee crafted from ultra-heavyweight cotton for a structured drape.',
                materialCare: '100% Premium Heavyweight Cotton.\nWash inside out.\nDo not tumble dry.\nSteam from distance.',
                sizes: ['M', 'L', 'XL'],
                variants: [
                    { size: 'M', color: 'Bone', quantity: 15 },
                    { size: 'L', color: 'Bone', quantity: 20 },
                    { size: 'XL', color: 'Bone', quantity: 12 },
                ],
                isNewArrival: true, tags: ['Oversized', 'Heavyweight', 'Streetwear'],
                status: 'ACTIVE',
            }
        ];

        for (const p of products) {
            await Product.create(p);
        }
        console.log(`✅ ${products.length} product entries seeded with variants and styleCodes`);


        // ── Coupon ────────────────────────────────────────────────────────────────
        await Coupon.create({
            code: 'V2FIRST',
            discountType: 'percentage',
            discountValue: 10,
            minOrderValue: 999,
        });
        console.log('✅ Demo coupon seeded — V2FIRST');

        // ── Reviews ──────────────────────────────────────────────────────────────
        const reviewData = [
            {
                productId: (await Product.findOne({ name: 'Selvedge Slim Fit Denim' }))?._id,
                customerName: 'Rohit Mehta',
                customerEmail: 'rohit@example.com',
                rating: 4,
                reviewText: 'Excellent denim quality. A bit stiff at first but breaks in beautifully.',
                status: 'ACTIVE',
                homepageVisible: true,
                date: new Date('2026-02-16')
            },
            {
                productId: (await Product.findOne({ name: 'Premium Linen Blend Shirt' }))?._id,
                customerName: 'Aarav Gupta',
                customerEmail: 'aarav@example.com',
                rating: 5,
                reviewText: 'Incredible texture and fits impeccably. I bought two more directly after receiving the first one.',
                status: 'ACTIVE',
                homepageVisible: true,
                date: new Date('2026-02-20')
            }
        ];

        for (const r of reviewData) {
            if (r.productId) {
                await Review.create(r);
            }
        }
        console.log('✅ Reviews seeded');

        // ── Journal Posts ────────────────────────────────────────────────────────
        await JournalPost.create([
            {
                title: 'The Architecture of Silence',
                category: 'Design Philosophy',
                image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200',
                excerpt: 'Exploring how minimalism creates space for thought in both fashion and living.',
                date: new Date('2026-02-14'),
                status: 'ACTIVE'
            },
            {
                title: 'Fabric as Narrative',
                category: 'Craftsmanship',
                image: 'https://images.unsplash.com/photo-1574201635302-388dd92a4c3f?auto=format&fit=crop&q=80&w=1200',
                excerpt: 'Why we choose organic Peruvian cotton and the story it tells through touch.',
                date: new Date('2026-01-28'),
                status: 'ACTIVE'
            }
        ]);
        console.log('✅ Journal posts seeded');

        // ── Hero Slides ───────────────────────────────────────────────────────────
        await HeroSlide.create([
            {
                type: 'video',
                url: '/The_Dior_Men_s_Summer_2022_Campaign_Video_720P.mp4',
                tagline: 'COLLECTION 2026',
                title: 'THE ART OF\nDISCIPLINE',
                description: 'Meticulously crafted for the modern individual who values silence over noise. Discover the latest additions to our curated essential series.',
                ctaText: 'The New Collection',
                ctaLink: '/new-arrivals',
                duration: 7000,
                order: 1,
                status: 'ACTIVE'
            },
            {
                type: 'image',
                url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=2000',
                tagline: 'MENSWEAR ZENITH',
                title: 'TIMELESS\nMODERNISM',
                description: 'Exploring the intersection of architectural precision and wearable comfort. Our tailoring collection redefines the professional wardrobe.',
                ctaText: 'Explore Tailoring',
                ctaLink: '/shop?category=Tailoring',
                duration: 5000,
                order: 2,
                status: 'ACTIVE'
            }
        ]);
        console.log('✅ Hero slides seeded (including video)');

        // ── Sliders (Promotional & Marquee) ───────────────────────────────────────
        await Slider.create([
            {
                type: 'PROMOTIONAL',
                image: 'https://images.pexels.com/photos/1884581/pexels-photo-1884581.jpeg?auto=compress&cs=tinysrgb&w=800',
                title: 'New Season Arrival',
                subtitle: 'UP TO 50% OFF SELECT PIECES',
                buttonText: 'Shop Newest',
                link: '/shop?sort=Newest',
                status: 'ACTIVE'
            }
        ]);
        console.log('✅ Promotional and Category sliders seeded');

        // ── Dynamic Content ────────────────────────────────────────────────────────
        await Content.insertMany([
            { type: 'TAGLINE', title: 'We redefine modern luxury with minimalistic elegance.', status: 'ACTIVE' },
            { type: 'SOCIAL_POST', image: 'https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'Morning essentials.', likes: '2.4k', status: 'ACTIVE' },
            { type: 'FEATURE_ITEM', caption: 'Truck', title: 'Free Delivery', text: 'On all orders above ₹999', status: 'ACTIVE' },
            { type: 'FEATURE_ITEM', caption: 'CreditCard', title: 'Secure Payment', text: '100% secure payment processing', status: 'ACTIVE' },
            { type: 'MARQUEE', text: "V2 ENTERPRISE", status: 'ACTIVE' },
            { type: 'MARQUEE', text: "COLLECTION 2026", status: 'ACTIVE' },
            { type: 'MARQUEE', text: "THE ART OF DISCIPLINE", status: 'ACTIVE' },
            { type: 'MARQUEE', text: "LUXURY REDEFINED", status: 'ACTIVE' }
        ]);
        console.log('✅ Dynamic content seeded');

        // ── Contact Messages ──────────────────────────────────────────────────────
        await ContactMessage.create([
            {
                name: 'Neha Sharma',
                email: 'neha.sharma@example.com',
                message: 'I am interested in the premium linen shirts. Do you have bulk discounts for corporate gifting?',
                status: 'UNREAD',
                date: new Date('2026-02-28')
            }
        ]);
        console.log('✅ Contact messages seeded');

        // ── Orders ────────────────────────────────────────────────────────────────
        const linenShirt = await Product.findOne({ name: 'Premium Linen Blend Shirt', colorHex: '#FFFFFF' });
        const selvedgeDenim = await Product.findOne({ name: 'Selvedge Slim Fit Denim' });

        if (linenShirt && selvedgeDenim) {
            await Order.create([
                {
                    orderId: 'ORD-1001',
                    userId: customer._id,
                    items: [
                        {
                            productId: linenShirt._id,
                            productName: linenShirt.name,
                            productPhoto: linenShirt.photo,
                            quantity: 1,
                            size: 'M',
                            color: 'White',
                            priceAtTime: 2499
                        }
                    ],
                    total: 2499,
                    method: 'Prepaid',
                    status: 'DELIVERED',
                    address: customer.addresses![0].street + ', ' + customer.addresses![0].city,
                    phone: customer.phone,
                    waybill: 'WB123456789',
                    discount: 0
                }
            ]);
            console.log('✅ Demo orders seeded');
        }

        console.log('\n✨ Database seeded successfully!');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        await mongoose.connection.close();
    }
}

main();
