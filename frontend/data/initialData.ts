import { Product, Category, SiteSettings, HeroContent, FeatureItem, CommitmentContent, StaticPage, Review, Color, Tagline, Logo, BestsellerHeading, Slider, Order, ContactMessage, Customer, AboutPageContent, HomeSectionContent, MarqueeItem, JournalPost, SocialPost, LookbookItem, HeroSlide } from '../types';

export const initialOrders: any[] = [
    { id: 1, orderId: '#V2-1764685082542', waybill: '', customer: 'Kunal Raykangor', email: 'kunal.raykangor1994@gmail.com', phone: '9033883395', method: 'cod', total: 500, status: 'CANCELLED' },
    { id: 2, orderId: '#V2-1764685082999', waybill: '123456789', customer: 'Rahul Sharma', email: 'rahul@gmail.com', phone: '9876543210', method: 'online', total: 1200, status: 'DELIVERED' },
];

export const initialRefundOrders: any[] = [
    { id: 3, orderId: '#V2-1764685082111', waybill: '', customer: 'Amit Verma', email: 'amit@gmail.com', phone: '9123456780', method: 'online', total: 850, status: 'REFUNDED' },
];

export const initialContacts: ContactMessage[] = [
    { id: 1, name: 'Arjun Kapoor', email: 'arjun.k@example.com', message: 'I was wondering if the linen shirts are back in stock in XL navy?', date: '2026-02-14', status: 'Unread' },
    { id: 2, name: 'Sanya Malhotra', email: 'sanya.m@example.com', message: 'Do you offer international shipping to the UK?', date: '2026-02-15', status: 'Read' },
];

export const initialCustomers: Customer[] = [
    {
        id: 1,
        name: 'Kunal Raykangor',
        firstName: 'Kunal',
        lastName: 'Raykangor',
        email: 'kunal.raykangor1994@gmail.com',
        password: 'password123',
        phone: '9033883395',
        ordersCount: 5,
        joinedDate: '2023-01-15',
        role: 'ADMIN',
        addresses: [
            { id: 1, label: 'Home', street: 'Ground Floor, Plot No 1761/A2, Panchshil Co.Society, Sardar Nagar Road', city: 'Bhavnagar', state: 'Gujarat', zipCode: '364001', isDefault: true }
        ]
    },
    {
        id: 2,
        name: 'Jane Smith',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        password: 'password123',
        phone: '9876543210',
        ordersCount: 12,
        joinedDate: '2023-03-22',
        role: 'CUSTOMER',
        addresses: []
    },
];

export const initialSiteSettings: SiteSettings = {
    id: 'global-settings',
    logoText: 'V2',
    logoSubtext: 'Fashion Hub',
    email: 'hello@v2fashion.com',
    phone: '+91 90338 83395',
    address: 'Ground Floor, Plot No 1761/A2, Panchshil Co.Society, Sardar Nagar Road, Bhavnagar, Gujarat, 364001',
    instagram: 'https://instagram.com/v2_fashion',
    twitter: 'https://twitter.com/twitter', // Fixed some dummy links
    facebook: 'https://facebook.com/facebook',
    youtube: 'https://youtube.com/youtube',
    slogan: 'A Smart Fashion Hub',
    copyright: '© 2025 V2Fashion. All rights reserved.',
    storeHours: 'Mon - Sat: 10:00 AM - 09:00 PM\nSun: 10:00 AM - 07:00 PM',
    gridSettings: {
        mobile: 2,
        tablet: 2,
        desktop: 4
    }
};

export const initialHeroContent: HeroContent = {
    id: 'hero-main',
    videoUrl: '/The_Dior_Men_s_Summer_2022_Campaign_Video_720P.mp4',
    tagline: 'New Collection 2026',
    title: 'Elevated \n Comfort',
    description: 'Minimalist essentials designed for the modern individual. Quality, fit, and style in every stitch.',
    primaryBtnText: 'Shop Now',
    secondaryBtnText: 'View Arrivals'
};

export const initialFeatures: FeatureItem[] = [
    { id: 1, icon: 'Truck', title: 'Live Order Tracking', description: 'Track your shipment via Number' },
    { id: 2, icon: 'CreditCard', title: 'Flexible Payment', description: 'Prepaid (Razorpay) & COD' },
    { id: 3, icon: 'RefreshCw', title: '14-Day Exchange', description: 'Product exchange within 14 days' },
    { id: 4, icon: 'Headphones', title: 'Customer Support', description: 'Fast assistance for orders' }
];

export const initialCommitment: CommitmentContent = {
    id: 'commitment-main',
    tagline: 'Our Commitment',
    title: 'Quality is the \n New Identity.',
    description: 'We focus on the essentials. Every stitch and every fabric is chosen to ensure a perfect fit and long-lasting style. No noise, just quality.'
};

export const initialProducts: Product[] = [
    {
        id: 1,
        name: "Premium Linen Blend Shirt",
        price: 2499,
        photo: "https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=800",
        hoverImage: "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=800",
        mainCategory: "MENSWEAR",
        subCategory: "Tailoring",
        description: "Crafted from a refined linen blend, this shirt offers unparalleled breathability and a sophisticated drape. Perfect for both casual outings and evening events.",
        colors: ["White", "Beige", "Navy"],
        color: "White",
        styleCode: "V2-001",
        sizes: ['S', 'M', 'L', 'XL'],
        variants: [],
        materialCare: '100% Egyptian Cotton. Machine wash cold.',
        isNewArrival: true,
        isTrending: true,
        tags: ["Linen", "Formal", "Summer"],
        status: "ACTIVE"
    },
    {
        id: 2,
        name: "Selvedge Slim Fit Denim",
        price: 4999,
        photo: "https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=800",
        hoverImage: "https://images.pexels.com/photos/1598508/pexels-photo-1598508.jpeg?auto=compress&cs=tinysrgb&w=800",
        mainCategory: "MENSWEAR",
        subCategory: "Denim",
        description: "Our signature selvedge denim is woven on vintage looms and tailored for a modern slim fit that breaks in beautifully over time.",
        colors: ["Indigo", "Black"],
        color: "Indigo",
        styleCode: "V2-002",
        sizes: ["30", "32", "34", "36"],
        variants: [],
        materialCare: 'Raw Selvedge Denim. Wash sparingly, inside out.',
        isTrending: true,
        tags: ["Denim", "Selvedge", "Classic"],
        status: "ACTIVE"
    },
    {
        id: 3,
        name: "Organic Cotton Essential Tee",
        price: 1299,
        photo: "https://images.pexels.com/photos/4066293/pexels-photo-4066293.jpeg?auto=compress&cs=tinysrgb&w=800",
        hoverImage: "https://images.pexels.com/photos/4066290/pexels-photo-4066290.jpeg?auto=compress&cs=tinysrgb&w=800",
        mainCategory: "WOMENSWEAR",
        subCategory: "Essentials",
        description: "A timeless wardrobe staple made from 100% organic Peruvian cotton. Features a semi-relaxed fit and a soft-touch finish.",
        colors: ["White", "Sage", "Charcoal"],
        color: "White",
        styleCode: "V2-003",
        sizes: ["XS", "S", "M", "L"],
        variants: [],
        materialCare: '100% Organic Cotton. Machine wash cold.',
        tags: ["Organic", "Cotton", "Basic"],
        status: "ACTIVE"
    },
    {
        id: 4,
        name: "Merino Wool Oversized Knit",
        price: 3599,
        photo: "https://images.pexels.com/photos/5709661/pexels-photo-5709661.jpeg?auto=compress&cs=tinysrgb&w=800",
        mainCategory: "WOMENSWEAR",
        subCategory: "Outerwear",
        description: "Luxuriously soft merino wool knitted into an oversized silhouette. Ideal for layering during transitional seasons.",
        colors: ["Oatmeal", "Stone"],
        color: "Oatmeal",
        styleCode: "V2-004",
        sizes: ["S", "M", "L"],
        variants: [],
        materialCare: '100% Merino Wool. Hand wash cold or dry clean.',
        isNewArrival: true,
        isTrending: true,
        status: "ACTIVE"
    },
    {
        id: 5,
        name: "Structured Wool Coat",
        price: 8999,
        photo: "https://images.pexels.com/photos/837140/pexels-photo-837140.jpeg?auto=compress&cs=tinysrgb&w=800",
        mainCategory: "MENSWEAR",
        subCategory: "Outerwear",
        description: "A tailored coat made from premium Italian wool. clean lines and a structured fit define this winter essential.",
        colors: ["Charcoal", "Black"],
        color: "Charcoal",
        styleCode: "V2-005",
        sizes: ["M", "L", "XL"],
        variants: [],
        materialCare: 'Italian wool blend. Dry clean only.',
        status: "ACTIVE"
    },
    {
        id: 6,
        name: "Pleated Trousers",
        price: 2999,
        photo: "https://images.pexels.com/photos/5935754/pexels-photo-5935754.jpeg?auto=compress&cs=tinysrgb&w=800",
        mainCategory: "WOMENSWEAR",
        subCategory: "Tailoring",
        description: "High-waisted trousers with deep pleats for a relaxed yet elegant silhouette. Made from a fluid viscose blend.",
        colors: ["Black", "Cream"],
        color: "Black",
        styleCode: "V2-006",
        sizes: ["XS", "S", "M", "L"],
        variants: [],
        materialCare: 'Viscose blend. Dry clean recommended.',
        status: "ACTIVE"
    },
    {
        id: 7,
        name: "Leather Weekend Bag",
        price: 12999,
        photo: "https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=800",
        mainCategory: "ACCESSORIES",
        subCategory: "Bags",
        description: "Full-grain leather weekender bag. Vegetable-tanned and built to last a lifetime.",
        colors: ["Tan", "Brown"],
        color: "Tan",
        styleCode: "V2-007",
        sizes: ["One Size"],
        variants: [],
        materialCare: 'Premium Italian Leather. Wipe clean with damp cloth.',
        status: "ACTIVE"
    },
    {
        id: 8,
        name: "Silk Scarf",
        price: 1999,
        photo: "https://images.pexels.com/photos/375880/pexels-photo-375880.jpeg?auto=compress&cs=tinysrgb&w=800",
        mainCategory: "ACCESSORIES",
        subCategory: "Scarves",
        description: "100% Mulberry silk scarf with hand-rolled edges. Adds a touch of luxury to any outfit.",
        colors: ["Patterned"],
        color: "Patterned",
        styleCode: "V2-008",
        sizes: ["One Size"],
        variants: [],
        materialCare: '100% Mulberry Silk. Dry clean only.',
        status: "ACTIVE"
    }
];

export const initialMainCategories: Category[] = [
    { id: 1, name: "MENSWEAR", slug: "menswear", image: "https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=800", status: "ACTIVE" },
    { id: 2, name: "WOMENSWEAR", slug: "womenswear", image: "https://images.pexels.com/photos/4066293/pexels-photo-4066293.jpeg?auto=compress&cs=tinysrgb&w=800", status: "Active" }
];

export const initialSubCategories: Category[] = [
    { id: 1, name: "Tailoring", slug: "tailoring", parentCategory: "MENSWEAR", status: "Active" },
    { id: 2, name: "Denim", slug: "denim", parentCategory: "MENSWEAR", status: "Active" },
    { id: 3, name: "Essentials", slug: "essentials", parentCategory: "WOMENSWEAR", status: "Active" },
    { id: 4, name: "Outerwear", slug: "outerwear", parentCategory: "WOMENSWEAR", status: "Active" },
    { id: 5, name: 'Trousers', slug: 'trousers', parentCategory: 'WOMENSWEAR', status: 'Active' },
    { id: 6, name: 'Jackets', slug: 'jackets', parentCategory: 'MENSWEAR', status: 'Active' },
    { id: 7, name: 'Bags', slug: 'bags', parentCategory: 'ACCESSORIES', status: 'Active' },
    { id: 8, name: 'Scarves', slug: 'scarves', parentCategory: 'ACCESSORIES', status: 'Active' },
    { id: 9, name: 'Footwear', slug: 'footwear', parentCategory: 'ACCESSORIES', status: 'Active' }
];

export const initialReviews: Review[] = [
    {
        id: 1,
        productId: 1,
        productName: "Premium Linen Blend Shirt",
        productPhoto: initialProducts[0].photo,
        customerName: "Arjun Sharma",
        customerEmail: "arjun@example.com",
        rating: 5,
        reviewText: "The quality of the linen shirt is exceptional. Fits perfectly and feels tailored.",
        status: "Active",
        homepageVisible: true,
        date: "2026-02-14",
        photos: []
    },
    {
        id: 2,
        productId: 3,
        productName: "Organic Cotton Essential Tee",
        productPhoto: initialProducts[2].photo,
        customerName: "Priya Patel",
        customerEmail: "priya@example.com",
        rating: 5,
        reviewText: "Beautiful fabric and fast delivery. The unboxing experience was pure luxury.",
        status: "Active",
        homepageVisible: true,
        date: "2026-02-15",
        photos: []
    },
    {
        id: 3,
        productId: 2,
        productName: "Selvedge Slim Fit Denim",
        productPhoto: initialProducts[1].photo,
        customerName: "Vikram Malhotra",
        customerEmail: "vikram@example.com",
        rating: 5,
        reviewText: "Finally, a brand that understands understated elegance. The denim is world-class.",
        status: "Active",
        homepageVisible: false,
        date: "2026-02-10",
        photos: []
    },
    {
        id: 4,
        productId: 5,
        productName: "Structured Wool Coat",
        productPhoto: initialProducts[4].photo,
        customerName: "Aisha Khan",
        customerEmail: "aisha@example.com",
        rating: 4,
        reviewText: "The structured coat is a masterpiece. Worth every rupee.",
        status: "Active",
        homepageVisible: false,
        date: "2026-02-08",
        photos: []
    }
];

export const initialPages: StaticPage[] = [
    { id: 'home', title: 'Home Page', content: 'Management for your main page hero and features.', lastUpdated: '2026-02-15' },
    { id: 'about', title: 'Our Story', content: 'Heritage, Sustainability, and Craftsmanship.', lastUpdated: '2026-02-15' },
    { id: 'contact', title: 'Contact Us', content: 'Customer support and store location details.', lastUpdated: '2026-02-15' }
];

export const initialColors: Color[] = [
    { id: 1, name: "Gold", hex: "#D4AF37", status: "Active" },
    { id: 2, name: "Black", hex: "#000000", status: "Active" },
    { id: 3, name: "Chalk", hex: "#F5F5F5", status: "Active" }
];

export const initialLogos: Logo[] = [
    { id: 1, image: "/v2_logo.webp", location: "Header", status: "Active" }
];

export const initialTaglines: Tagline[] = [
    { id: 1, text: "Complimentary Shipping on all orders above ₹999 | 14 Day Returns", status: "Active" },
    { id: 2, text: "Exclusive Winter Collection Now Live | Shop the Archive", status: "Active" },
    { id: 3, text: "Join the Collective for Early Access to Private Sales", status: "Active" },
    { id: 4, text: "Sustainably Crafted Luxury Essentials for the Modern Wardrobe", status: "Active" }
];

export const initialBestsellers: BestsellerHeading[] = [
    { id: 1, heading: "Curated Excellence", status: "Active" }
];

export const initialSliders: Slider[] = [
    { id: 1, title: "Summer Sale", image: "https://picsum.photos/1200/600", link: "/shop", type: "PROMOTIONAL", status: "Active" }
];


export const initialAboutContent: AboutPageContent = {
    id: 'about-main',
    heroTagline: 'Our Heritage',
    heroTitle: 'The Art of \n Discipline',
    heroImage: 'https://images.pexels.com/photos/1884581/pexels-photo-1884581.jpeg?auto=compress&cs=tinysrgb&w=2000',
    visionTagline: 'The Vision',
    visionTitle: 'A Smart Fashion Hub \n for the Modern Individual.',
    visionDescription1: 'V2 Enterprise was born in Bhavnagar with a singular vision: to bridge the gap between high-end architectural design and everyday accessibility.',
    visionDescription2: 'We believe that clothing should be more than just fabric—it should be a smart investment in your identity. Our studio operates on the principles of precision, quality, and timeless appeal.',
    visionImage: 'https://images.pexels.com/photos/3735641/pexels-photo-3735641.jpeg?auto=compress&cs=tinysrgb&w=1200',
    visionArchiveText: 'Bhavnagar Studio Archive',
    values: [
        { title: "Smart Curation", description: "Every piece in our hub is hand-selected and tested for durability, fit, and aesthetic longevity." },
        { title: "Local Heritage", description: "Rooted in Gujarat, we bring a unique perspective to global fashion trends, focusing on what truly lasts." },
        { title: "Client First", description: "Our 14-day exchange and live tracking aren't just features—they are our commitment to your satisfaction." }
    ],
    footerImage: 'https://images.pexels.com/photos/298863/pexels-photo-298863.jpeg?auto=compress&cs=tinysrgb&w=2000'
};

export const initialHomeSections: HomeSectionContent = {
    id: 'home-sections',
    categoriesTitle: 'Shop Categories',
    featuredTagline: 'Featured',
    featuredTitle: 'Best Sellers',
    featuredLinkText: 'Shop All Products',
    featuredButtonText: 'View All',
    commitmentAboutLinkText: 'About Us',
    commitmentJournalLinkText: 'Visit Journal',
    sectionOrder: [
        'hero',
        'marquee',
        'new-standard',
        'trending',
        'categories',
        'promotional_slider',
        'essentials',
        'promotional',
        'testimonials',
        'testimonials',
        'commitment'
    ],
    categoryColumns: 3,
    trendingProductIds: [1, 2, 3, 4],
    promotionalSliders: [
        {
            id: 1,
            image: 'https://images.pexels.com/photos/298863/pexels-photo-298863.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
            title: 'Mid-Season Event',
            subtitle: 'UP TO 50% OFF SELECT PIECES',
            link: '/shop',
            buttonText: 'Discover Sale'
        },
        {
            id: 2,
            image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=2000',
            title: 'Lunar New Year',
            subtitle: 'EXCLUSIVE RED COLLECTION',
            link: '/shop?category=Red',
            buttonText: 'Shop Collection'
        }
    ],
    promotionalBanner: {
        image: 'https://images.pexels.com/photos/298863/pexels-photo-298863.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
        title: 'Mid-Season Event',
        subtitle: 'UP TO 50% OFF SELECT PIECES',
        link: '/shop',
        buttonText: 'Discover Sale',
        isVisible: true
    },
    categories: [
        { title: 'Tailoring', image: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=800', link: '/shop?category=Tailoring' },
        { title: 'Essentials', image: 'https://images.pexels.com/photos/4066293/pexels-photo-4066293.jpeg?auto=compress&cs=tinysrgb&w=800', link: '/shop?category=Essentials' },
        { title: 'Denim', image: 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=800', link: '/shop?category=Denim' },
        { title: 'Trousers', image: 'https://images.pexels.com/photos/1898555/pexels-photo-1898555.jpeg?auto=compress&cs=tinysrgb&w=800', link: '/shop?category=Trousers' },
        { title: 'Jackets', image: 'https://images.pexels.com/photos/16170/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800', link: '/shop?category=Jackets' },
        { title: 'Accessories', image: 'https://images.pexels.com/photos/190819/pexels-photo-190819.jpeg?auto=compress&cs=tinysrgb&w=800', link: '/shop?category=Accessories' }
    ],
    newStandard: {
        isVisible: true,
        tagline: 'The New Standard',
        title: 'Elevate Your \n Everyday.',
        description: 'Discover the latest additions to our collection. Meticulously crafted for the modern individual who values silence over noise.',
        image: '',
        link: '/new-arrivals?sort=Newest',
        buttonText: 'The New Collection'
    }
};

export const initialMarquee: MarqueeItem[] = [
    { id: 1, text: "V2 ENTERPRISE" },
    { id: 2, text: "COLLECTION 2026" },
    { id: 3, text: "THE ART OF DISCIPLINE" },
    { id: 4, text: "LUXURY REDEFINED" },
    { id: 5, text: "SMART FASHION HUB" },
    { id: 6, text: "BHAVNAGAR STUDIO" }
];

export const initialJournal: JournalPost[] = [
    {
        id: 1,
        title: "The Architecture of Silence",
        category: "Design Philosophy",
        image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200",
        excerpt: "Exploring how minimalism creates space for thought in both fashion and living.",
        date: "FEB 14, 2026"
    },
    {
        id: 2,
        title: "Fabric as Narrative",
        category: "Craftsmanship",
        image: "https://images.unsplash.com/photo-1574201635302-388dd92a4c3f?auto=format&fit=crop&q=80&w=1200",
        excerpt: "Why we choose organic Peruvian cotton and the story it tells through touch.",
        date: "JAN 28, 2026"
    }
];

export const initialSocial: SocialPost[] = [];

export const initialHeroSlides: HeroSlide[] = [
    {
        id: 1,
        type: 'video',
        url: '/The_Dior_Men_s_Summer_2022_Campaign_Video_720P.mp4',
        tagline: 'Collection 2026',
        title: 'THE ART OF\nDISCIPLINE',
        description: 'Meticulously crafted for the modern individual who values silence over noise. Discover the latest additions to our curated essential series.',
        ctaText: 'The New Collection',
        ctaLink: '/new-arrivals',
        duration: 7000,
        order: 1,
        status: 'Active'
    },
    {
        id: 2,
        type: 'image',
        url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=2000',
        tagline: 'Menswear Zenith',
        title: 'TIMELESS\nMODERNISM',
        description: 'Exploring the intersection of architectural precision and wearable comfort. Our tailoring collection redefines the professional wardrobe.',
        ctaText: 'Explore Tailoring',
        ctaLink: '/shop?category=Tailoring',
        duration: 5000,
        order: 2,
        status: 'Active'
    },
    {
        id: 3,
        type: 'image',
        url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=2000',
        tagline: 'Essentials Hub',
        title: 'SILENT\nLUXURY',
        description: 'The pieces you reach for every day, elevated with premium fabrics and thoughtful details. Quality that speaks for itself.',
        ctaText: 'View Essentials',
        ctaLink: '/shop?category=Essentials',
        duration: 6000,
        order: 3,
        status: 'Active'
    }
];

export const initialLookbook: LookbookItem[] = [
    { id: 1, image: "https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=800", caption: "Urban Silence", colSpan: 2 },
    { id: 2, image: "https://images.pexels.com/photos/157675/fashion-men-s-individuality-black-and-white-157675.jpeg?auto=compress&cs=tinysrgb&w=800", caption: "The Architect", colSpan: 1 },
    { id: 3, image: "https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=800", caption: "Linen textures", colSpan: 1 },
    { id: 4, image: "https://images.pexels.com/photos/837140/pexels-photo-837140.jpeg?auto=compress&cs=tinysrgb&w=800", caption: "Winter Coat", colSpan: 2 },
    { id: 5, image: "https://images.pexels.com/photos/1342609/pexels-photo-1342609.jpeg?auto=compress&cs=tinysrgb&w=800", caption: "Details", colSpan: 1 },
];
