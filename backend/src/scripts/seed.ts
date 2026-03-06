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

        // Drop the database for a completely clean slate
        if (mongoose.connection.db) {
            await mongoose.connection.db.dropDatabase();
            console.log('🧹 Dropped database for a clean slate');
        }

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
            commitment: {
                tagline: "OUR COMMITMENT",
                title: "Sustainable\nLuxury.",
                description: "We believe in creating timeless pieces that respect both the wearer and the environment. Every garment is crafted with longevity in mind.\n\nOur transparent supply chain ensures ethical practices at every step."
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
        console.log(`✅ Users seeded`);

        // ── Categories ────────────────────────────────────────────────────────────
        const menswear = await Category.create({
            name: 'MENSWEAR',
            slug: 'menswear',
            status: 'ACTIVE',
            image: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=800'
        });
        const womenswear = await Category.create({
            name: 'WOMENSWEAR',
            slug: 'womenswear',
            status: 'ACTIVE',
            image: 'https://images.pexels.com/photos/4066293/pexels-photo-4066293.jpeg?auto=compress&cs=tinysrgb&w=800'
        });

        await Category.create({ name: 'Tailoring', slug: 'tailoring', parentId: menswear._id, status: 'ACTIVE' });
        await Category.create({ name: 'Denim', slug: 'denim', parentId: menswear._id, status: 'ACTIVE' });
        await Category.create({ name: 'Essentials', slug: 'essentials', parentId: womenswear._id, status: 'ACTIVE' });
        await Category.create({ name: 'Outerwear', slug: 'outerwear', parentId: womenswear._id, status: 'ACTIVE' });
        console.log(`✅ Categories seeded (Clothing Only)`);

        // ── Products ──────────────────────────────────────────────────────────────
        const productData = [
            {
                name: 'Premium Linen Blend Shirt',
                styleCode: 'SHIRT-01',
                color: 'White', colorHex: '#FFFFFF',
                videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                price: 2499,
                photo: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=800',
                hoverImage: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=800',
                mainCategory: 'MENSWEAR', subCategory: 'Tailoring',
                description: 'Refined linen blend shirt offering unparalleled breathability. Perfect for warm days.',
                materialCare: '55% Linen, 45% Cotton.\nMachine wash cold on gentle cycle.\nDo not bleach.\nIron on medium heat.',
                sizes: ['S', 'M', 'L', 'XL'],
                variants: [
                    { size: 'S', color: 'White', quantity: 10 },
                    { size: 'M', color: 'White', quantity: 15 },
                    { size: 'L', color: 'White', quantity: 8 },
                ],
                isNewArrival: true, isTrending: true, tags: ['Linen', 'Formal', 'Summer'],
                status: 'ACTIVE',
            },
            {
                name: 'Selvedge Slim Fit Denim',
                styleCode: 'DENIM-01',
                color: 'Indigo', colorHex: '#4B5563',
                price: 4999,
                photo: 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=800',
                hoverImage: 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=800',
                mainCategory: 'MENSWEAR', subCategory: 'Denim',
                description: 'Signature selvedge denim woven on vintage looms. Ages beautifully.',
                materialCare: '100% Cotton Selvedge Denim.\nWash sparingly.\nTurn inside out before washing.\nCold wash only.',
                sizes: ['30', '32', '34', '36'],
                variants: [
                    { size: '32', color: 'Indigo', quantity: 14 },
                    { size: '34', color: 'Indigo', quantity: 10 },
                ],
                isTrending: true, tags: ['Denim', 'Selvedge', 'Classic'],
                status: 'ACTIVE',
            },
            {
                name: 'Organic Cotton Essential Tee',
                styleCode: 'TEE-01',
                color: 'Sage', colorHex: '#879F84',
                price: 1299,
                photo: 'https://images.pexels.com/photos/4066293/pexels-photo-4066293.jpeg?auto=compress&cs=tinysrgb&w=800',
                mainCategory: 'WOMENSWEAR', subCategory: 'Essentials',
                description: 'Wardrobe staple from 100% organic cotton. Soft and breathable.',
                materialCare: '100% Organic Cotton.\nTumble dry low.\nMachine wash cold with like colors.',
                sizes: ['XS', 'S', 'M', 'L'],
                variants: [
                    { size: 'S', color: 'Sage', quantity: 20 },
                    { size: 'M', color: 'Sage', quantity: 18 },
                ],
                tags: ['Organic', 'Cotton', 'Basic'],
                status: 'ACTIVE',
            },
            {
                name: 'Merino Wool Oversized Knit',
                styleCode: 'KNIT-01',
                color: 'Oatmeal', colorHex: '#E0D6CC',
                price: 3599,
                photo: 'https://images.pexels.com/photos/5935754/pexels-photo-5935754.jpeg?auto=compress&cs=tinysrgb&w=800',
                mainCategory: 'WOMENSWEAR', subCategory: 'Outerwear',
                description: 'Luxuriously soft merino wool in an oversized silhouette.',
                materialCare: '100% Extra Fine Merino Wool.\nHand wash cold/Dry clean only.\nReshape while damp.\nDry flat.',
                sizes: ['S', 'M', 'L'],
                variants: [
                    { size: 'S', color: 'Oatmeal', quantity: 7 },
                    { size: 'M', color: 'Oatmeal', quantity: 12 },
                ],
                isNewArrival: true, isTrending: true, tags: ['Merino', 'Wool', 'Knitwear'],
                status: 'ACTIVE',
            },
            {
                name: 'Structured Wool Coat',
                styleCode: 'COAT-01',
                color: 'Charcoal', colorHex: '#36454F',
                price: 8999,
                photo: 'https://images.pexels.com/photos/837140/pexels-photo-837140.jpeg?auto=compress&cs=tinysrgb&w=800',
                mainCategory: 'MENSWEAR', subCategory: 'Outerwear',
                description: 'Tailored coat made from premium Italian wool. Structured fit.',
                materialCare: 'Outer: 80% Wool, 20% Nylon.\nProfessional dry clean only.',
                sizes: ['M', 'L', 'XL'],
                variants: [
                    { size: 'M', color: 'Charcoal', quantity: 6 },
                    { size: 'L', color: 'Charcoal', quantity: 9 },
                ],
                isNewArrival: true, tags: ['Wool', 'Coat', 'Tailoring'],
                status: 'ACTIVE',
            },
            {
                name: 'Fluid Midi Dress',
                styleCode: 'DRESS-01',
                color: 'Ivory', colorHex: '#FFFFF0',
                price: 3299,
                photo: 'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?auto=compress&cs=tinysrgb&w=800',
                mainCategory: 'WOMENSWEAR', subCategory: 'Essentials',
                description: 'Fluid midi dress cut from sustainable TENCEL. Effortless elegance.',
                materialCare: '100% TENCEL™ Lyocell.\nMachine wash cold in laundry bag.\nDo not tumble dry.',
                sizes: ['XS', 'S', 'M', 'L'],
                variants: [
                    { size: 'S', color: 'Ivory', quantity: 14 },
                    { size: 'M', color: 'Ivory', quantity: 16 },
                ],
                isNewArrival: true, isTrending: true, tags: ['Dress', 'Midi'],
                status: 'ACTIVE',
            },
            {
                name: 'French Terry Hoodie',
                styleCode: 'HOODIE-01',
                color: 'Ash Grey', colorHex: '#B2BEB5',
                price: 2799,
                photo: 'https://images.pexels.com/photos/7679720/pexels-photo-7679720.jpeg?auto=compress&cs=tinysrgb&w=800',
                mainCategory: 'MENSWEAR', subCategory: 'Essentials',
                description: 'Mid-weight French terry with a relaxed silhouette.',
                materialCare: '100% Cotton French Terry.\nMachine wash warm with like colors.\nTumble dry medium.',
                sizes: ['S', 'M', 'L', 'XL'],
                variants: [
                    { size: 'M', color: 'Ash Grey', quantity: 20 },
                    { size: 'L', color: 'Ash Grey', quantity: 16 },
                ],
                isNewArrival: true, tags: ['Hoodie', 'Casual'],
                status: 'ACTIVE',
            },
            {
                name: 'Pleated Trousers',
                styleCode: 'TROUS-01',
                color: 'Black', colorHex: '#000000',
                price: 2999,
                photo: 'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?auto=compress&cs=tinysrgb&w=800',
                mainCategory: 'WOMENSWEAR', subCategory: 'Tailoring',
                description: 'High-waisted trousers with deep pleats for a relaxed silhouette.',
                materialCare: '60% Rayon, 35% Nylon, 5% Spandex.\nMachine wash cold on gentle.',
                sizes: ['XS', 'S', 'M', 'L'],
                variants: [
                    { size: 'S', color: 'Black', quantity: 10 },
                    { size: 'M', color: 'Black', quantity: 8 },
                ],
                isTrending: true, tags: ['Trousers', 'Tailoring'],
                status: 'ACTIVE',
            },
        ];

        for (const p of productData) {
            await Product.create(p);
        }
        console.log(`✅ ${productData.length} product entries seeded (Clothing Only)`);

        // ── Coupon ────────────────────────────────────────────────────────────────
        await Coupon.create({
            code: 'V2FIRST',
            discountType: 'percentage',
            discountValue: 10,
            minOrderValue: 999,
        });

        // ── Reviews ──────────────────────────────────────────────────────────────
        const reviews = [
            {
                productName: 'Selvedge Slim Fit Denim',
                customerName: 'Rohit Mehta',
                customerEmail: 'rohit@example.com',
                rating: 4,
                reviewText: 'Excellent denim quality. A bit stiff at first but breaks in beautifully.',
                status: 'ACTIVE',
                homepageVisible: true,
                date: new Date('2026-02-16')
            },
            {
                productName: 'Merino Wool Oversized Knit',
                customerName: 'Sneha Rao',
                customerEmail: 'sneha@example.com',
                rating: 5,
                reviewText: 'So soft and cozy! The oversized fit is exactly what I was looking for.',
                status: 'ACTIVE',
                homepageVisible: true,
                date: new Date('2026-02-18')
            },
            {
                productName: 'Premium Linen Blend Shirt',
                customerName: 'Aarav Gupta',
                customerEmail: 'aarav@example.com',
                rating: 5,
                reviewText: 'Incredible texture and fits impeccably.',
                status: 'ACTIVE',
                homepageVisible: true,
                date: new Date('2026-02-20')
            },
            {
                productName: 'Structured Wool Coat',
                customerName: 'Vikram Singh',
                customerEmail: 'vikram.singh@example.com',
                rating: 4,
                reviewText: 'Great structure and warmth. Highly recommend.',
                status: 'ACTIVE',
                homepageVisible: true,
                date: new Date('2026-02-22')
            }
        ];

        for (const r of reviews) {
            const product = await Product.findOne({ name: r.productName });
            if (product) {
                const { productName, ...reviewData } = r;
                await Review.create({ ...reviewData, productId: product._id });
            }
        }
        console.log('✅ Reviews seeded');

        // ── Journal Posts ────────────────────────────────────────────────────────
        await JournalPost.create([
            {
                title: 'The Architecture of Silence',
                category: 'Design Philosophy',
                image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200',
                excerpt: 'Exploring how minimalism creates space for thought.',
                date: new Date('2026-02-14'),
                status: 'ACTIVE'
            },
            {
                title: 'Fabric as Narrative',
                category: 'Craftsmanship',
                image: 'https://images.unsplash.com/photo-1574201635302-388dd92a4c3f?auto=format&fit=crop&q=80&w=1200',
                excerpt: 'Why we choose organic Peruvian cotton.',
                date: new Date('2026-01-28'),
                status: 'ACTIVE'
            }
        ]);

        // ── Hero Slides ───────────────────────────────────────────────────────────
        await HeroSlide.create([
            {
                type: 'video',
                url: '/The_Dior_Men_s_Summer_2022_Campaign_Video_720P.mp4',
                tagline: 'COLLECTION 2026',
                title: 'THE ART OF\nDISCIPLINE',
                description: 'Meticulously crafted for the modern individual who values silence over noise.',
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
                description: 'Exploring the intersection of architectural precision and wearable comfort.',
                ctaText: 'Explore Tailoring',
                ctaLink: '/shop?category=Tailoring',
                duration: 5000,
                order: 2,
                status: 'ACTIVE'
            },
            {
                type: 'image',
                url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=2000',
                tagline: 'ESSENTIALS HUB',
                title: 'SILENT\nLUXURY',
                description: 'The pieces you reach for every day, elevated with premium fabrics.',
                ctaText: 'View Essentials',
                ctaLink: '/shop?category=Essentials',
                duration: 6000,
                order: 3,
                status: 'ACTIVE'
            }
        ]);
        console.log('✅ Hero slides seeded');

        // ── Promotional Sliders ───────────────────────────────────────────────────
        await Slider.create([
            {
                type: 'PROMOTIONAL',
                image: 'https://images.pexels.com/photos/1884581/pexels-photo-1884581.jpeg?auto=compress&cs=tinysrgb&w=800',
                title: 'New Season Arrival',
                subtitle: 'UP TO 50% OFF SELECT PIECES',
                buttonText: 'Shop Newest',
                link: '/shop?sort=Newest',
                status: 'ACTIVE'
            },
            {
                type: 'PROMOTIONAL',
                image: 'https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=800',
                title: 'New Arrivals',
                subtitle: 'CURATED ESSENTIALS',
                buttonText: 'Explore New',
                link: '/shop?filter=New Arrivals',
                status: 'ACTIVE'
            }
        ]);

        // ── Dynamic Content ────────────────────────────────────────────────────────
        await Content.insertMany([
            { type: 'TAGLINE', title: 'We redefine modern luxury with minimalistic elegance.', status: 'ACTIVE' },
            { type: 'TAGLINE', title: 'Crafting the future of fashion for the contemporary mind.', status: 'ACTIVE' },
            { type: 'SOCIAL_POST', image: 'https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'Morning essentials.', likes: '2.4k', status: 'ACTIVE' },
            { type: 'SOCIAL_POST', image: 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'Texture and light.', likes: '1.8k', status: 'ACTIVE' },
            { type: 'FEATURE_ITEM', caption: 'Truck', title: 'Free Delivery', text: 'On all orders above ₹999', status: 'ACTIVE' },
            { type: 'FEATURE_ITEM', caption: 'CreditCard', title: 'Secure Payment', text: '100% secure payment processing', status: 'ACTIVE' },
            { type: 'FEATURE_ITEM', caption: 'RefreshCw', title: '14-Day Returns', text: 'Easy returns and exchanges', status: 'ACTIVE' },
            { type: 'FEATURE_ITEM', caption: 'Headphones', title: '24/7 Support', text: 'Dedicated customer assistance', status: 'ACTIVE' },
            { type: 'MARQUEE', text: "V2 ENTERPRISE", status: 'ACTIVE' },
            { type: 'MARQUEE', text: "COLLECTION 2026", status: 'ACTIVE' },
            { type: 'MARQUEE', text: "THE ART OF DISCIPLINE", status: 'ACTIVE' },
            { type: 'MARQUEE', text: "LUXURY REDEFINED", status: 'ACTIVE' },
            { type: 'MARQUEE', text: "SMART FASHION HUB", status: 'ACTIVE' },
            { type: 'MARQUEE', text: "BHAVNAGAR STUDIO", status: 'ACTIVE' }
        ]);

        // ── Contact Messages ──────────────────────────────────────────────────────
        await ContactMessage.create([
            {
                name: 'Neha Sharma',
                email: 'neha.sharma@example.com',
                message: 'I am interested in bulk discounts.',
                status: 'UNREAD',
                date: new Date('2026-02-28')
            },
            {
                name: 'Rahul Verma',
                email: 'rahul.verma@example.com',
                message: 'The quality of the denim is outstanding!',
                status: 'READ',
                date: new Date('2026-02-25')
            }
        ]);

        // ── Orders ────────────────────────────────────────────────────────────────
        const shirt = await Product.findOne({ name: 'Premium Linen Blend Shirt' });
        const denim = await Product.findOne({ name: 'Selvedge Slim Fit Denim' });

        if (shirt && denim) {
            await Order.create([
                {
                    orderId: 'ORD-1001',
                    userId: customer._id,
                    items: [
                        {
                            productId: shirt._id,
                            productName: shirt.name,
                            productPhoto: shirt.photo,
                            quantity: 1,
                            size: 'M',
                            color: 'White',
                            priceAtTime: 2499
                        }
                    ],
                    total: 2499,
                    method: 'Prepaid',
                    status: 'DELIVERED',
                    address: 'Bhavnagar, Gujarat',
                    phone: '9033883395',
                    discount: 0
                },
                {
                    orderId: 'ORD-1002',
                    userId: customer._id,
                    items: [
                        {
                            productId: denim._id,
                            productName: denim.name,
                            productPhoto: denim.photo,
                            quantity: 1,
                            size: '32',
                            color: 'Indigo',
                            priceAtTime: 4999
                        }
                    ],
                    total: 4999,
                    method: 'COD',
                    status: 'PENDING',
                    address: 'Bhavnagar, Gujarat',
                    phone: '9033883395',
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
