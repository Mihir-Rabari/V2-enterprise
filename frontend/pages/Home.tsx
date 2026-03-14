import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import { ArrowRight, ArrowUpRight, TrendingUp, Sparkles, Star, ShieldCheck, Zap, Send, Filter, ChevronDown, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { HeroContent, CommitmentContent, Product, HomeSectionContent, MarqueeItem, JournalPost, LookbookItem, Review, HeroSlide, Slider, Category, SiteSettings, PromotionalSlide } from '../types';
import { initialHeroContent, initialCommitment, initialProducts, initialHomeSections, initialMarquee, initialJournal, initialLookbook, initialReviews, initialHeroSlides, initialSiteSettings } from '../data/initialData';
import PromotionalSlider from '../components/PromotionalSlider';
import { AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import FilterAccordion from '../components/FilterAccordion';
import { useProducts } from '../hooks/useProducts';
import { reviewsAPI, sliderAPI, settingsAPI, categoriesAPI, contentAPI, filtersAPI } from '../lib/apiClient';

interface HeroProps {
    slides: HeroSlide[];
}

const Hero: React.FC<HeroProps> = ({ slides }) => {
    const [index, setIndex] = React.useState(0);
    const activeSlides = slides.filter(s => s.status.toUpperCase() === 'ACTIVE');
    const current = activeSlides[index] || activeSlides[0];

    React.useEffect(() => {
        if (activeSlides.length <= 1) return;

        const currentDuration = current?.duration || 5000;

        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % activeSlides.length);
        }, currentDuration);

        return () => clearInterval(timer);
    }, [activeSlides.length, index, current?.duration]);

    if (!current) return null;

    return (
        <section className="relative h-screen w-full overflow-hidden bg-luxury-black">
            <AnimatePresence mode="wait">
                <motion.div
                    key={current.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0"
                >
                    <div className="absolute inset-0">
                        {current.type === 'video' ? (
                            <video
                                autoPlay
                                loop
                                muted
                                playsInline
                                key={current.url}
                                className="w-full h-full object-cover opacity-60 scale-105"
                            >
                                <source src={current.url} type="video/mp4" />
                            </video>
                        ) : (
                            <img
                                src={current.url}
                                alt={current.title}
                                className="w-full h-full object-cover opacity-60 scale-105"
                            />
                        )}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-luxury-black/80 via-luxury-black/20 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-luxury-black/90 via-transparent to-transparent" />

                    <div className="relative h-full max-w-[1800px] mx-auto px-6 lg:px-12 flex flex-col justify-center items-start z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                            className="max-w-5xl space-y-12"
                        >
                            <div className="space-y-8">
                                <motion.div
                                    initial={{ opacity: 0, x: -30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.8, duration: 0.8 }}
                                    className="flex items-center gap-4"
                                >
                                    <div className="w-12 h-[1px] bg-luxury-gold" />
                                    <span className="text-luxury-gold text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.4em]">{current.tagline}</span>
                                </motion.div>

                                <h1 className="font-serif text-[12vw] sm:text-[10vw] md:text-[140px] leading-[0.8] tracking-tighter text-white mix-blend-overlay opacity-90">
                                    {current.title.split('\n').map((line, i) => (
                                        <span key={i} className="block">{line}</span>
                                    ))}
                                </h1>

                                {current.description && (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 0.6 }}
                                        transition={{ delay: 1.2, duration: 1 }}
                                        className="max-w-xl text-white font-serif italic text-lg sm:text-xl leading-relaxed"
                                    >
                                        {current.description}
                                    </motion.p>
                                )}
                            </div>

                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1.4, duration: 0.8 }}
                                className="flex flex-col sm:flex-row gap-6 pt-4"
                            >
                                <Link to={current.ctaLink} className="group relative overflow-hidden bg-white text-luxury-black px-10 py-5 text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-500 hover:px-14">
                                    <span className="relative z-10 flex items-center gap-2">
                                        {current.ctaText} <ArrowRight size={14} />
                                    </span>
                                    <div className="absolute inset-0 bg-luxury-gold translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                                </Link>
                            </motion.div>
                        </motion.div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Pagination Indicators */}
            {activeSlides.length > 1 && (
                <div className="absolute bottom-12 right-12 z-20 flex flex-col gap-4">
                    {activeSlides.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setIndex(i)}
                            className="group flex items-center gap-4 text-right"
                        >
                            <span className={`text-[10px] font-bold tracking-widest transition-all duration-500 ${index === i ? 'text-luxury-gold' : 'text-white/20 group-hover:text-white/50'}`}>
                                0{i + 1}
                            </span>
                            <div className={`h-[1px] transition-all duration-700 ${index === i ? 'w-12 bg-luxury-gold' : 'w-4 bg-white/20 group-hover:w-8 group-hover:bg-white/50'}`} />
                        </button>
                    ))}
                </div>
            )}
        </section>
    );
};

const MarqueeSection: React.FC<{ items: MarqueeItem[] }> = ({ items }) => {
    return (
        <div className="bg-luxury-black py-4 md:py-8 border-y border-white/10 overflow-hidden flex relative z-20">
            <motion.div
                className="flex whitespace-nowrap gap-8 md:gap-32"
                animate={{ x: [0, -1000] }}
                transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
            >
                {[...items, ...items, ...items, ...items].map((item, i) => (
                    <span key={i} className="text-white text-base sm:text-lg md:text-xl lg:text-xl font-medium uppercase tracking-tighter opacity-80 font-serif italic">
                        {item.text} <span className="text-luxury-gold mx-4 md:mx-8">•</span>
                    </span>
                ))}
            </motion.div>
        </div>
    );
};

const ClientVoicesSection: React.FC<{ reviews: any[] }> = ({ reviews }) => (
    <section className="py-24 md:py-40 bg-white">
        <div className="max-w-[1800px] mx-auto px-6 lg:px-12">
            <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-16 md:mb-24 gap-8">
                <div className="space-y-4 text-center md:text-left w-full md:w-auto">
                    <span className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.4em] flex items-center justify-center md:justify-start gap-2"><Star size={10} strokeWidth={2} className="text-luxury-gold" />Testimonials</span>
                    <h2 className="font-serif text-4xl md:text-7xl italic text-luxury-black tracking-tighter">Client Voices</h2>
                </div>
            </div>

            <div className="flex overflow-x-auto gap-6 pb-8 -mx-6 px-6 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-8 md:overflow-visible md:mx-0 md:px-0 scrollbar-hide snap-x">
                {reviews.map((review, i) => (
                    <div key={review.id} className="min-w-[85vw] md:min-w-0 bg-zinc-50 p-8 md:p-12 space-y-6 flex flex-col justify-between snap-center">
                        <div className="space-y-4">
                            <div className="flex gap-1">
                                {[...Array(review.rating)].map((_, i) => (
                                    <span key={i} className="text-luxury-gold text-xs">★</span>
                                ))}
                            </div>
                            <p className="font-serif text-xl md:text-2xl italic leading-relaxed text-luxury-black">
                                "{review.reviewText}"
                            </p>
                        </div>
                        <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                                <img src={review.product?.photo || review.productPhoto} alt="Product" className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-luxury-black">{review.customerName}</p>
                                <p className="text-[9px] text-gray-500 uppercase tracking-wider">Verified Client</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
);




const Home: React.FC = () => {
    // API Hooks
    const { products, loading: productsLoading } = useProducts({ limit: 300, groupByColor: true });
    const [allReviews, setAllReviews] = useState<Review[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const [activeFeatureCategory, setActiveFeatureCategory] = useState<string>('All');
    const [activeTrendingCategory, setActiveTrendingCategory] = useState<string>('All');
    const [essentialsSearchQuery, setEssentialsSearchQuery] = useState('');
    const [essentialsSortBy, setEssentialsSortBy] = useState('Relevance');
    const [selectedEssentialsCategories, setSelectedEssentialsCategories] = useState<string[]>([]);
    const [selectedEssentialsPriceList, setSelectedEssentialsPriceList] = useState<string[]>([]);
    const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
    const [isEssentialsSortOpen, setIsEssentialsSortOpen] = useState(false);
    const [isEssentialsCategoryOpen, setIsEssentialsCategoryOpen] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
    const [filterSuggestions, setFilterSuggestions] = useState<Record<string, string[]>>({});

    const dynamicFiltersList = [
        { key: 'color', label: 'Color' },
        { key: 'size', label: 'Size' },
        { key: 'patternType', label: 'Pattern Type' },
        { key: 'fabric', label: 'Fabric' },
        { key: 'collar', label: 'Collar' },
        { key: 'sleeve', label: 'Sleeve' },
        { key: 'neck', label: 'Neck' },
        { key: 'pocket', label: 'Pocket' },
        { key: 'length', label: 'Length' },
        { key: 'chest', label: 'Chest' },
        { key: 'waist', label: 'Waist' },
        { key: 'shoulder', label: 'Shoulder' },
        { key: 'sleeveLength', label: 'Sleeve Length' },
    ];

    const getOptionsFor = (key: string) => {
        if (filterSuggestions && Array.isArray(filterSuggestions[key])) {
            return filterSuggestions[key];
        }
        if (key === 'color') {
            const colors = new Set<string>();
            products.forEach(p => {
                if (p.color) colors.add(p.color);
                p.variants?.forEach(v => { if (v.color) colors.add(v.color) });
            });
            return Array.from(colors).sort();
        }
        if (key === 'size') {
            const sizes = new Set<string>();
            products.forEach(p => {
                p.sizes?.forEach(s => sizes.add(s));
                p.variants?.forEach(v => { if (v.size) sizes.add(v.size) });
            });
            return Array.from(sizes).sort();
        }
        return Array.from(new Set(products.map(p => (p as any)[key]).filter(Boolean))).sort();
    };

    const toggleFilter = (key: string, value: string) => {
        setSelectedFilters(prev => {
            const current = prev[key] || [];
            const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
            if (next.length === 0) {
                const copy = { ...prev };
                delete copy[key];
                return copy;
            }
            return { ...prev, [key]: next };
        });
    };

    // Configuration States
    const [homeSections, setHomeSections] = useState<HomeSectionContent>(initialHomeSections);
    const [marqueeItems, setMarqueeItems] = useState<MarqueeItem[]>(initialMarquee || []);
    const [socialPosts, setSocialPosts] = useState<any[]>([]);
    const [lookbookItems, setLookbookItems] = useState<LookbookItem[]>([]);
    const [commitment, setCommitment] = useState<CommitmentContent>(initialCommitment);
    const [siteSettings, setSiteSettings] = useState<SiteSettings>(initialSiteSettings);
    const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(initialHeroSlides);
    const [promotionalSlides, setPromotionalSlides] = useState<PromotionalSlide[]>([]);
    const [bottomPromoSlides, setBottomPromoSlides] = useState<PromotionalSlide[]>([]);
    const [journalPosts, setJournalPosts] = useState<JournalPost[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            // Fetch Reviews
            reviewsAPI.getHomepage()
                .then(res => {
                    setAllReviews(res.data.data ?? []);
                    setReviewsLoading(false);
                })
                .catch(() => setReviewsLoading(false));

            // Fetch Hero Slides
            sliderAPI.getHero()
                .then(res => {
                    if (res.data.success && res.data.data.length > 0) {
                        setHeroSlides(res.data.data);
                    }
                })
                .catch(err => console.error('Error fetching hero slides:', err));

            // Fetch Promotional Sliders
            try {
                const promoRes = await sliderAPI.getPromotional();
                if (promoRes.data.success && promoRes.data.data.length > 0) {
                    const activePromoSlides = promoRes.data.data.filter((s: any) => s.type === 'PROMOTIONAL' && s.status?.toUpperCase() === 'ACTIVE');
                    setPromotionalSlides(activePromoSlides);
                    const bottomPromoSlidesData = promoRes.data.data.filter((s: any) => s.type === 'BOTTOM_PROMOTIONAL' && s.status?.toUpperCase() === 'ACTIVE');
                    setBottomPromoSlides(bottomPromoSlidesData);
                }
            } catch (err) {
                console.error('Error fetching promotional sliders:', err);
            }

            // Fetch Marquee Items
            sliderAPI.getMarquee()
                .then(res => {
                    if (res.data.success && res.data.data.length > 0) {
                        setMarqueeItems(res.data.data);
                    }
                })
                .catch(err => console.error('Error fetching marquee items:', err));

            // Fetch Categories
            categoriesAPI.getAll()
                .then(res => {
                    if (res.data.success && res.data.data) {
                        setAllCategories(res.data.data);
                        // ONLY show categories that don't have a parentId (Main Categories)
                        setCategories(res.data.data.filter((c: any) => !c.parentId || c.parentId === "" || c.parentId === null));
                    }
                })
                .catch(err => console.error('Error fetching categories:', err));

            // Fetch filter suggestions globally
            filtersAPI.getSuggestions()
                .then(res => {
                    if (res.data.success && res.data.data) {
                        setFilterSuggestions(res.data.data);
                    }
                })
                .catch(err => console.error('Error fetching filters:', err));

            // Fetch Site Settings
            settingsAPI.get()
                .then(res => {
                    if (res.data.success && res.data.data) {
                        setSiteSettings(res.data.data);
                        if (res.data.data.homeSections) setHomeSections(res.data.data.homeSections);
                        if (res.data.data.commitment) setCommitment(res.data.data.commitment);
                    }
                })
                .catch(err => console.error('Error fetching settings:', err));


            contentAPI.getByType('LOOKBOOK_ITEM')
                .then(res => {
                    if (res.data.success && res.data.data) {
                        setLookbookItems(res.data.data);
                    }
                })
                .catch(err => console.error('Error fetching lookbook items:', err));
        };

        fetchData();
    }, []);

    const reviews = allReviews.filter(r => r.homepageVisible && r.status.toUpperCase() === 'ACTIVE');

    // DERIVE DYNAMIC OPTIONS
    const buildCategoryTree = () => {
        const mains = allCategories.filter(c => !c.parentId && !c.parentCategory);
        return mains.map(m => ({
            label: m.name,
            value: m.name,
            subOptions: allCategories
                .filter(c => {
                    const pid = typeof c.parentId === 'object' ? (c.parentId as any)?._id || (c.parentId as any)?.id : c.parentId;
                    return String(pid) === String(m.id) || String(pid) === String(m._id) || c.parentCategory === m.name;
                })
                .map(s => ({ label: s.name, value: s.name }))
        }));
    };

    const categoryTree = buildCategoryTree();

    // Derived states
    const featuredProducts = products.filter(p => p.isTrending);
    // Fallback if no trending products picked
    const baseFeatured = featuredProducts.length > 0 ? featuredProducts : products.filter(p => p.status === 'Active' || p.status === 'ACTIVE').slice(0, 8);

    // Category extraction and filtering
    const featureCategories = ['All', ...Array.from(new Set(baseFeatured.map(p => p.category?.parent?.name || p.category?.name || p.mainCategory || '').filter(Boolean)))];
    const displayFeatured = activeFeatureCategory === 'All'
        ? baseFeatured
        : baseFeatured.filter(p => (p.category?.parent?.name || p.category?.name || p.mainCategory) === activeFeatureCategory);

    const newDropProduct = products.find(p => p.isNewArrival) || products[0];

    // Use categories from API or fallback to homeSections.categories
    const displayCategories = categories.length > 0
        ? categories.map(c => ({
            title: c.name,
            image: c.image || 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=800',
            link: `/${encodeURIComponent(c.name)}`
        }))
        : (homeSections.categories || []);

    return (
        <div className="bg-white">
            {Array.from(new Set(homeSections.sectionOrder || [])).map((sectionId) => {
                switch (sectionId) {
                    case 'hero':
                        return <Hero key="hero" slides={heroSlides} />;
                    case 'marquee':
                        return <MarqueeSection key="marquee" items={marqueeItems} />;
                    case 'new-standard':
                        if (homeSections.newStandard && !homeSections.newStandard.isVisible) return null;
                        const ns = homeSections.newStandard || { tagline: '', title: '', description: '', link: '', buttonText: '' };
                        return (
                            <section key="new-standard" className="py-20 md:py-40 max-w-[1600px] mx-auto px-6 lg:px-12">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 items-center">
                                    <div className="space-y-6 md:space-y-10 order-2 md:order-1">
                                        <span className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.4em] block">{ns.tagline || 'The New Standard'}</span>
                                        <h2 className="font-serif text-5xl md:text-6xl lg:text-8xl italic text-luxury-black tracking-tighter leading-[0.85] whitespace-pre-line">
                                            {ns.title || 'Elevate Your \n Everyday.'}
                                        </h2>
                                        <div className="w-24 h-[1px] bg-luxury-gold/50" />
                                        <p className="text-gray-500 font-serif italic text-lg md:text-xl max-w-md leading-relaxed">
                                            {ns.description || 'Discover the latest additions to our collection. Meticulously crafted for the modern individual who values silence over noise.'}
                                        </p>
                                        <Link to={ns.link || '/new-arrivals?sort=Newest'} className="inline-block bg-luxury-black text-white px-10 md:px-12 py-4 md:py-5 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-luxury-gold transition-colors text-center w-full md:w-auto">
                                            {ns.buttonText || 'The New Collection'}
                                        </Link>
                                    </div>
                                    <div
                                        className="relative aspect-[4/5] md:aspect-square bg-gray-100 overflow-hidden group order-1 md:order-2"
                                        onMouseEnter={() => setIsHovered(true)}
                                        onMouseLeave={() => setIsHovered(false)}
                                    >
                                        <div className="relative w-full h-full">
                                            <motion.img
                                                animate={{
                                                    opacity: isHovered && (ns.hoverImage || newDropProduct?.photos?.[1]) ? 0 : 1,
                                                    scale: isHovered ? 1.05 : 1
                                                }}
                                                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                                                src={ns.image || newDropProduct?.photo}
                                                alt={ns.title || 'New Drop'}
                                                className="w-full h-full object-cover"
                                            />
                                            {(ns.hoverImage || newDropProduct?.photos?.[1]) && (
                                                <motion.img
                                                    initial={{ opacity: 0 }}
                                                    animate={{
                                                        opacity: isHovered ? 1 : 0,
                                                        scale: isHovered ? 1.05 : 1
                                                    }}
                                                    transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                                                    src={ns.hoverImage || newDropProduct?.photos?.[1]}
                                                    alt={`${ns.title || 'New Drop'} hover`}
                                                    className="absolute inset-0 w-full h-full object-cover"
                                                />
                                            )}
                                        </div>
                                        {!ns.image && newDropProduct && (
                                            <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 bg-white/90 backdrop-blur-sm p-4 md:p-6 max-w-[200px] md:max-w-xs transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 z-10">
                                                <h4 className="font-serif text-xl md:text-3xl italic text-luxury-black truncate">{newDropProduct.name}</h4>
                                                <p className="text-[10px] font-bold uppercase tracking-widest mt-1 md:mt-2">Now Available — ₹{newDropProduct.price}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        );
                    case 'categories':
                        return (
                            <section key="categories" className="py-20 md:py-28 bg-zinc-50">
                                <div className="max-w-[1800px] mx-auto px-6 lg:px-12">
                                    <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-16 gap-8">
                                        <div className="space-y-4 text-center md:text-left">
                                            <span className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.4em] block">Discover</span>
                                            <h2 className="font-serif text-5xl md:text-6xl italic text-luxury-black tracking-tighter">
                                                {homeSections.categoriesTitle}
                                            </h2>
                                        </div>
                                        <Link to="/shop" className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] hover:text-luxury-gold transition-colors pb-2">
                                            View All Categories <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                        </Link>
                                    </div>

                                    <div className={`flex overflow-x-auto gap-4 snap-x pb-8 -mx-6 px-6 scrollbar-hide md:grid md:grid-cols-${homeSections.categoryColumns || 3} md:gap-6 md:overflow-visible md:mx-0 md:px-0 md:pb-0`}>
                                        {displayCategories.map((cat, i) => (
                                            <Link to={cat.link} key={i} className="group relative aspect-[3/4] overflow-hidden block min-w-[75vw] md:min-w-0 snap-center md:snap-align-none">
                                                <motion.div
                                                    initial={{ opacity: 0, y: 20 }}
                                                    whileInView={{ opacity: 1, y: 0 }}
                                                    viewport={{ once: true }}
                                                    transition={{ delay: i * 0.1, duration: 0.8 }}
                                                    className="w-full h-full"
                                                >
                                                    <img
                                                        src={cat.image}
                                                        alt={cat.title}
                                                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                                                    <div className="absolute bottom-8 left-8 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                                        <h3 className="text-white font-serif text-4xl italic tracking-tight mb-2">{cat.title}</h3>
                                                        <span className="text-white/80 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2">
                                                            Explore <ArrowRight size={12} />
                                                        </span>
                                                    </div>
                                                </motion.div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        );
                    case 'promotional_slider':
                        return <PromotionalSlider key="promotional_slider" slides={promotionalSlides.length > 0 ? promotionalSlides : (homeSections.promotionalSliders || [])} />;
                    case 'promotional':
                        return homeSections.promotionalBanner.isVisible && (
                            <section key="promotional" className="py-24 bg-white overflow-hidden">
                                <div className="max-w-[1800px] mx-auto px-6 lg:px-12">
                                    <PromotionalSlider slides={bottomPromoSlides.length > 0 ? bottomPromoSlides : (homeSections.promotionalSliders || [])} />
                                </div>
                            </section>
                        );
                    case 'essentials':
                        // Get all possible featured products
                        const allFeatured = products;

                        // Extract unique categories for the bar
                        const essentialsCategories = Array.from(new Set(allFeatured.map(p => p.category?.parent?.name || p.category?.name || p.mainCategory || p.subCategory).filter(Boolean))) as string[];

                        // Filter display products
                        let displayFeatured = allFeatured;

                        // Apply Search
                        if (essentialsSearchQuery) {
                            displayFeatured = displayFeatured.filter(p => p.name.toLowerCase().includes(essentialsSearchQuery.toLowerCase()) || (p.category?.name || p.mainCategory || p.subCategory || '').toLowerCase().includes(essentialsSearchQuery.toLowerCase()));
                        }

                        // Apply Categories
                        if (selectedEssentialsCategories.length > 0) {
                            displayFeatured = displayFeatured.filter(p => {
                                const pCatParent = p.category?.parent?.name;
                                const pCatName = p.category?.name;
                                const pMainCat = p.mainCategory;
                                const pSubCat = p.subCategory;

                                return selectedEssentialsCategories.some(selected =>
                                    selected === pCatParent ||
                                    selected === pCatName ||
                                    selected === pMainCat ||
                                    selected === pSubCat
                                );
                            });
                        }

                        // Apply Price Filter
                        if (selectedEssentialsPriceList.length > 0) {
                            displayFeatured = displayFeatured.filter(p => {
                                const priceNum = Number(p.price) || 0;
                                return selectedEssentialsPriceList.some(range => {
                                    if (range === 'Under ₹1000') return priceNum < 1000;
                                    if (range === '₹1000 - ₹2000') return priceNum >= 1000 && priceNum <= 2000;
                                    if (range === 'Over ₹2000') return priceNum > 2000;
                                    return false;
                                });
                            });
                        }

                        // Apply Advanced Filters (from Shop page)
                        Object.entries(selectedFilters).forEach(([key, values]: [string, string[]]) => {
                            if (values.length > 0) {
                                displayFeatured = displayFeatured.filter(p => {
                                    if (key === 'color') {
                                        return values.includes(p.color || '') || p.variants?.some(v => values.includes(v.color || ''));
                                    }
                                    if (key === 'size') {
                                        return values.some(val => p.sizes?.includes(val) || p.variants?.some(v => v.size === val));
                                    }
                                    return values.includes((p as any)[key]);
                                });
                            }
                        });

                        // Apply sorting
                        displayFeatured = [...displayFeatured].sort((a, b) => {
                            const priceA = Number(a.price) || 0;
                            const priceB = Number(b.price) || 0;

                            if (essentialsSortBy === 'Price: Low to High') return priceA - priceB;
                            if (essentialsSortBy === 'Price: High to Low') return priceB - priceA;
                            return String(b.id || b._id).localeCompare(String(a.id || a._id)); // Relevance/Default
                        });

                        // Max 8 products
                        displayFeatured = displayFeatured.slice(0, 8);

                        const activeEssentialsFilterCount = selectedEssentialsCategories.length + selectedEssentialsPriceList.length + Object.values(selectedFilters).reduce((acc: number, curr: string[]) => acc + curr.length, 0);

                        const renderEssentialsSidebarContent = () => (
                            <div className="w-full">
                                <FilterAccordion
                                    title="Sort By"
                                    isSort
                                    currentSort={essentialsSortBy}
                                    onSortChange={setEssentialsSortBy}
                                    options={[]}
                                    selected={[]}
                                    onToggle={() => { }}
                                />
                                <FilterAccordion
                                    title="Product Category"
                                    options={categoryTree}
                                    selected={selectedEssentialsCategories}
                                    onToggle={(cat: string) => {
                                        if (selectedEssentialsCategories.includes(cat)) setSelectedEssentialsCategories(prev => prev.filter(c => c !== cat));
                                        else setSelectedEssentialsCategories(prev => [...prev, cat]);
                                    }}
                                    isNested
                                />
                                <FilterAccordion
                                    title="Price"
                                    isPriceRange
                                    selected={selectedEssentialsPriceList}
                                    onToggle={(range: string) => {
                                        if (selectedEssentialsPriceList.includes(range)) setSelectedEssentialsPriceList(prev => prev.filter(r => r !== range));
                                        else setSelectedEssentialsPriceList(prev => [...prev, range]);
                                    }}
                                    options={[]}
                                />
                                {dynamicFiltersList.map(filter => (
                                    <FilterAccordion
                                        key={filter.key}
                                        title={filter.label}
                                        options={getOptionsFor(filter.key)}
                                        selected={selectedFilters[filter.key] || []}
                                        onToggle={(val: string) => toggleFilter(filter.key, val)}
                                    />
                                ))}
                            </div>
                        );

                        return (
                            <section key="essentials" className="bg-white text-luxury-black py-24 md:py-32 overflow-hidden relative border-t border-gray-100">
                                <div className="max-w-[1800px] mx-auto px-6 lg:px-12 relative z-10">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                                        <h2 className="font-serif text-3xl md:text-5xl italic tracking-tighter text-luxury-black">Curated Essentials</h2>
                                    </div>

                                    {/* Mobile Filter Toggle Overlay Bar */}
                                    <div className="lg:hidden z-30 bg-white/90 backdrop-blur-md border border-gray-100 py-3 shadow-sm rounded-lg mb-8">
                                        <div className="px-6 flex items-center justify-between w-full">
                                            <button
                                                onClick={() => setIsMobileFiltersOpen(true)}
                                                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-luxury-black bg-gray-50 px-5 py-2.5 rounded border border-gray-200"
                                            >
                                                <Filter size={14} /> Filters
                                                {activeEssentialsFilterCount > 0 && (
                                                    <span className="bg-luxury-black text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] ml-1">
                                                        {activeEssentialsFilterCount}
                                                    </span>
                                                )}
                                            </button>
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                {displayFeatured.length} DESIGNS FOUND
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mobile Sidebar */}
                                    <AnimatePresence>
                                        {isMobileFiltersOpen && (
                                            <>
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 lg:hidden"
                                                    onClick={() => setIsMobileFiltersOpen(false)}
                                                />
                                                <motion.div
                                                    initial={{ x: '-100%' }}
                                                    animate={{ x: 0 }}
                                                    exit={{ x: '-100%' }}
                                                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                                    className="fixed inset-y-0 left-0 w-[85vw] max-w-sm bg-white shadow-2xl z-50 flex flex-col lg:hidden"
                                                >
                                                    <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                                                        <h3 className="font-serif text-2xl italic tracking-tight">Filters</h3>
                                                        <button onClick={() => setIsMobileFiltersOpen(false)} className="p-2 bg-white rounded-full text-gray-500 shadow-sm border border-gray-100 hover:bg-gray-100">
                                                            <X size={16} />
                                                        </button>
                                                    </div>

                                                    <div className="flex-1 overflow-y-auto px-6 pt-2 pb-6">
                                                        {renderEssentialsSidebarContent()}
                                                    </div>

                                                    <div className="p-5 border-t border-gray-100 bg-white space-y-3">
                                                        <div className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                                                            {displayFeatured.length} Results
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <button
                                                                onClick={() => { setSelectedEssentialsCategories([]); setSelectedEssentialsPriceList([]); setSelectedFilters({}); }}
                                                                className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 border border-gray-200 rounded hover:bg-gray-50"
                                                            >
                                                                Clear
                                                            </button>
                                                            <button
                                                                onClick={() => setIsMobileFiltersOpen(false)}
                                                                className="flex-[2] py-3 text-[10px] font-bold uppercase tracking-widest bg-luxury-black text-white rounded hover:bg-luxury-gold transition-colors"
                                                            >
                                                                Apply Filters
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>

                                    <div className="flex flex-col lg:flex-row items-start gap-10">
                                        {/* Left Sidebar (Desktop) */}
                                        <div className="hidden lg:flex flex-col w-[260px] flex-shrink-0 sticky top-[100px] max-h-[850px] overflow-hidden">
                                            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                                <span className="font-bold text-sm uppercase tracking-widest">Filters</span>
                                                {activeEssentialsFilterCount > 0 && (
                                                    <button
                                                        onClick={() => { setSelectedEssentialsCategories([]); setSelectedEssentialsPriceList([]); setSelectedFilters({}); }}
                                                        className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold hover:text-luxury-black transition-colors"
                                                    >
                                                        Clear All
                                                    </button>
                                                )}
                                            </div>
                                            <div className="text-[10px] font-medium text-gray-400 mb-6 uppercase tracking-widest flex-shrink-0 border-b border-gray-100 pb-4">
                                                {displayFeatured.length} DESIGNS FOUND
                                            </div>

                                            {/* Scrollable Accords Array */}
                                            <div className="flex-1 overflow-y-auto w-full no-scrollbar pr-2 pb-8">
                                                {renderEssentialsSidebarContent()}
                                            </div>
                                        </div>

                                        {/* Right Product Grid */}
                                        <div className="flex-1 min-w-0 w-full">
                                            {displayFeatured.length > 0 ? (
                                                <div className="relative">
                                                    <style>{`
                                                        .home-grid-dynamic {
                                                            display: grid;
                                                            grid-template-columns: repeat(${siteSettings.gridSettings?.mobile || 2}, minmax(0, 1fr));
                                                            gap: 2.5rem 1rem;
                                                        }
                                                        @media (min-width: 640px) {
                                                            .home-grid-dynamic {
                                                                grid-template-columns: repeat(${siteSettings.gridSettings?.tablet || 2}, minmax(0, 1fr));
                                                                gap: 4rem 2rem;
                                                            }
                                                        }
                                                        @media (min-width: 1024px) {
                                                            .home-grid-dynamic {
                                                                grid-template-columns: repeat(${siteSettings.gridSettings?.desktop || 4}, minmax(0, 1fr));
                                                                gap: 5rem 2rem;
                                                            }
                                                        }
                                                    `}</style>
                                                    <div className="home-grid-dynamic w-full">
                                                        {displayFeatured.map((product, i) => (
                                                            <motion.div
                                                                key={product.id}
                                                                initial={{ opacity: 0, y: 30 }}
                                                                whileInView={{ opacity: 1, y: 0 }}
                                                                viewport={{ once: true }}
                                                                transition={{ delay: i * 0.05, duration: 0.8 }}
                                                                className="group flex flex-col space-y-4"
                                                            >
                                                                <ProductCard
                                                                    {...product}
                                                                    image={product.photo}
                                                                    hoverImage={product.hoverImage || product.photos?.[1]}
                                                                    isTrending={product.isTrending}
                                                                    isNewArrival={product.isNewArrival}
                                                                    sizes={product.sizes}
                                                                />
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="py-32 flex flex-col items-center justify-center text-center space-y-6 bg-gray-50 rounded-2xl border border-gray-100">
                                                    <h3 className="font-serif text-3xl italic text-gray-300">No matches found.</h3>
                                                    <p className="text-sm text-gray-400">Try adjusting your filters or search query.</p>
                                                    <button
                                                        onClick={() => { setSelectedEssentialsCategories([]); setSelectedEssentialsPriceList([]); setSelectedFilters({}); setEssentialsSearchQuery(''); }}
                                                        className="px-8 py-4 bg-white border border-gray-200 uppercase text-xs font-bold tracking-widest rounded transition-colors hover:border-black"
                                                    >
                                                        Clear All Filters
                                                    </button>
                                                </div>
                                            )}

                                            {displayFeatured.length > 0 && (
                                                <div className="mt-16 flex justify-center">
                                                    <Link
                                                        to="/shop"
                                                        className="group flex items-center gap-3 bg-luxury-black text-white px-10 py-5 text-[10px] font-bold uppercase tracking-[0.4em] rounded-full hover:bg-luxury-gold transition-all transform hover:scale-105 active:scale-95 shadow-xl"
                                                    >
                                                        View More <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        );
                    case 'trending':
                        const trendingProducts = products.filter(p => p.isTrending).slice(0, 4);
                        if (trendingProducts.length === 0) return null;
                        return (
                            <section key="trending" className="bg-white text-luxury-black py-24 md:py-40 overflow-hidden relative border-t border-gray-100">
                                <div className="max-w-[1800px] mx-auto px-6 lg:px-12 relative z-10">
                                    <div className="flex justify-between items-center mb-16 md:mb-24">
                                        <h2 className="font-serif text-4xl md:text-7xl italic tracking-tighter text-luxury-black leading-tight">Trending Now</h2>
                                    </div>

                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10">
                                        {trendingProducts.map((product, i) => (
                                            <motion.div
                                                key={product.id}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                whileInView={{ opacity: 1, scale: 1 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: i * 0.15, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                                            >
                                                <ProductCard
                                                    {...product}
                                                    image={product.photo}
                                                    hoverImage={product.hoverImage || product.photos?.[1]}
                                                    isTrending={product.isTrending}
                                                    isNewArrival={product.isNewArrival}
                                                    sizes={product.sizes}
                                                />
                                            </motion.div>
                                        ))}
                                    </div>

                                    <div className="mt-20 flex justify-center">
                                        <Link
                                            to="/shop?sort=Trending"
                                            className="group flex items-center gap-3 bg-luxury-black text-white px-10 py-5 text-[10px] font-bold uppercase tracking-[0.4em] rounded-full hover:bg-luxury-gold transition-all transform hover:scale-105 active:scale-95 shadow-xl"
                                        >
                                            Show More <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                        </Link>
                                    </div>
                                </div>
                            </section>
                        );
                    case 'testimonials':
                        return <ClientVoicesSection key="testimonials" reviews={reviews} />;
                    case 'social':
                        return null;
                    case 'commitment':
                        return (
                            <section key="commitment" className="py-48 flex flex-col items-center justify-center text-center space-y-12 px-6 bg-luxury-gray">
                                <div className="space-y-6">
                                    <span className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.4em] flex items-center justify-center gap-2"><ShieldCheck size={11} strokeWidth={2} />{commitment.tagline}</span>
                                    <h2 className="font-serif text-[40px] sm:text-[60px] md:text-[80px] italic text-luxury-black leading-tight max-w-5xl tracking-tighter whitespace-pre-line">
                                        {commitment.title}
                                    </h2>
                                </div>
                                <div className="w-px h-24 bg-luxury-gold/50" />
                                <p className="text-gray-500 text-xl font-serif italic max-w-2xl leading-relaxed">
                                    {commitment.description}
                                </p>
                                <div className="flex gap-12 pt-8">
                                    <Link to="/about" className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] hover:text-luxury-gold transition-colors">
                                        Our Story <ArrowUpRight size={14} className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                    <Link to="/contact" className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] hover:text-luxury-gold transition-colors">
                                        Visit Studio <ArrowUpRight size={14} className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </div>
                            </section>
                        );
                    default:
                        return null;
                }
            })}
        </div >
    );
};

export default Home;
