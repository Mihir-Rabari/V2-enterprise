import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import { ArrowRight, ArrowUpRight, TrendingUp, Sparkles, Star, ShieldCheck, Zap, Send, Filter, ChevronDown, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { 
    HeroContent, CommitmentContent, Product, HomeSectionContent, 
    MarqueeItem, JournalPost, LookbookItem, Review, 
    HeroSlide, Slider, Category, SiteSettings, PromotionalSlide 
} from '../types';
// No initialData imports allowed. 100% dynamic.
import { AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, useMemo } from 'react';
import FilterAccordion from '../components/FilterAccordion';
import { useProducts } from '../hooks/useProducts';
import { reviewsAPI, sliderAPI, settingsAPI, categoriesAPI, contentAPI, filtersAPI, resolveLocalAssetUrl } from '../lib/apiClient';
import { usePageMeta } from '../hooks/usePageMeta';
import { getOptimizedImageUrl } from '../src/utils/mediaUtils';

// Lazy load below-the-fold sections
const NewStandardSection = React.lazy(() => import('../components/home/NewStandardSection'));
const CategoriesSection = React.lazy(() => import('../components/home/CategoriesSection'));
const CommitmentSection = React.lazy(() => import('../components/home/CommitmentSection'));
const JournalSection = React.lazy(() => import('../components/home/JournalSection'));
const LookbookSection = React.lazy(() => import('../components/home/LookbookSection'));
const EssentialsSection = React.lazy(() => import('../components/home/EssentialsSection'));
const MarqueeSection = React.lazy(() => import('../components/home/MarqueeSection'));
const PromotionalSlider = React.lazy(() => import('../components/PromotionalSlider'));
const ClientVoicesSection = React.lazy(() => import('../components/home/ClientVoicesSection'));

interface HeroProps {
    slides: HeroSlide[];
}

const Hero: React.FC<HeroProps> = ({ slides }) => {
    const [index, setIndex] = React.useState(0);
    // SSR-safe lazy initializer — avoids window access before hydration
    const [width, setWidth] = React.useState(() =>
        typeof window !== 'undefined' ? window.innerWidth : 1024
    );
    const activeSlides = slides.filter(s => String(s.status || '').toUpperCase() === 'ACTIVE');
    const current = activeSlides[index] || activeSlides[0];

    React.useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    React.useEffect(() => {
        if (activeSlides.length <= 1) return;

        const currentDuration = current?.duration || 5000;

        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % activeSlides.length);
        }, currentDuration);

        return () => clearInterval(timer);
    }, [activeSlides.length, index, current?.duration]);

    const videoUrl = React.useMemo(() => {
        if (!current) return '';
        if (width < 640) return current.mobileUrl || current.url;
        if (width < 1024) return current.tabletUrl || current.url;
        return current.laptopUrl || current.url;
    }, [current, width]);

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
                        {current.type === 'video' || (videoUrl && videoUrl.match(/\.(mp4|mov|webm|ogg)$/i)) ? (
                            <video
                                autoPlay
                                loop
                                muted
                                playsInline
                                key={videoUrl}
                                preload="auto"
                                width="1920"
                                height="1080"
                                className="w-full h-full object-cover opacity-60 scale-105"
                            >
                                 <source src={resolveLocalAssetUrl(videoUrl)} type="video/mp4" />
                            </video>
                        ) : (
                            <img
                                src={resolveLocalAssetUrl(getOptimizedImageUrl(current.url, { width: 1920, quality: 75 }))}
                                alt={current.title}
                                fetchPriority="high"
                                decoding="sync"
                                width="1920"
                                height="1080"
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

const Home: React.FC = () => {
    // API Hooks
    const { products, loading: productsLoading } = useProducts({ limit: 300, groupByColor: true });
    const [allReviews, setAllReviews] = useState<Review[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const [essentialsSearchQuery, setEssentialsSearchQuery] = useState('');
    const [essentialsSortBy, setEssentialsSortBy] = useState('Newest');
    const [selectedEssentialsCategories, setSelectedEssentialsCategories] = useState<string[]>([]);
    const [selectedEssentialsPriceList, setSelectedEssentialsPriceList] = useState<string[]>([]);
    const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
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
        return Array.from(new Set(products.map(p => (p as any)[key]).filter(Boolean))).sort() as string[];
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
    const [homeSections, setHomeSections] = useState<HomeSectionContent>({} as HomeSectionContent);
    const [marqueeItems, setMarqueeItems] = useState<MarqueeItem[]>([]);
    const [lookbookItems, setLookbookItems] = useState<LookbookItem[]>([]);
    const [commitment, setCommitment] = useState<CommitmentContent>({} as CommitmentContent);
    const [siteSettings, setSiteSettings] = useState<SiteSettings>({} as SiteSettings);
    const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
    const [promotionalSlides, setPromotionalSlides] = useState<PromotionalSlide[]>([]);
    const [bottomPromoSlides, setBottomPromoSlides] = useState<PromotionalSlide[]>([]);
    const [categorySlides, setCategorySlides] = useState<PromotionalSlide[]>([]);
    const [bestCategorySlides, setBestCategorySlides] = useState<PromotionalSlide[]>([]);
    const [newArrivalSlides, setNewArrivalSlides] = useState<PromotionalSlide[]>([]);
    const [journalPosts, setJournalPosts] = useState<JournalPost[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [heroRes, categoriesRes, settingsRes] = await Promise.allSettled([
                    sliderAPI.getHero(),
                    categoriesAPI.getAll(),
                    settingsAPI.get()
                ]);

                if (heroRes.status === 'fulfilled' && heroRes.value.data.success) {
                    setHeroSlides(heroRes.value.data.data);
                }
                
                if (categoriesRes.status === 'fulfilled' && categoriesRes.value.data.success) {
                    const sortedCats = categoriesRes.value.data.data;
                    setAllCategories(sortedCats);
                    setCategories(sortedCats.filter((c: any) => !c.parentId || c.parentId === "" || c.parentId === null));
                }

                if (settingsRes.status === 'fulfilled' && settingsRes.value.data.success) {
                    const s = settingsRes.value.data.data;
                    setSiteSettings(s);
                    if (s.homeSections) setHomeSections(s.homeSections);
                    if (s.commitment) setCommitment(s.commitment);
                }

                const [reviewsRes, promoRes, marqueeRes, filtersRes, lookbookRes] = await Promise.allSettled([
                    reviewsAPI.getHomepage(),
                    sliderAPI.getPromotional(),
                    sliderAPI.getMarquee(),
                    filtersAPI.getSuggestions(),
                    contentAPI.getByType('LOOKBOOK_ITEM')
                ]);

                if (reviewsRes.status === 'fulfilled') {
                    setAllReviews(reviewsRes.value.data.data ?? []);
                }
                setReviewsLoading(false);

                if (promoRes.status === 'fulfilled' && promoRes.value.data.success) {
                    const pData = promoRes.value.data.data || [];
                    setPromotionalSlides(pData.filter((s: any) => {
                        const t = String(s.type || '').toUpperCase();
                        return (t === 'PROMOTIONAL' || !s.type) && String(s.status || '').toUpperCase() === 'ACTIVE';
                    }));
                    setBottomPromoSlides(pData.filter((s: any) => String(s.type || '').toUpperCase() === 'BOTTOM_PROMOTIONAL' && String(s.status || '').toUpperCase() === 'ACTIVE'));
                    setCategorySlides(pData.filter((s: any) => String(s.type || '').toUpperCase() === 'CATEGORY' && String(s.status || '').toUpperCase() === 'ACTIVE'));
                    setBestCategorySlides(pData.filter((s: any) => String(s.type || '').toUpperCase() === 'BEST_CATEGORY' && String(s.status || '').toUpperCase() === 'ACTIVE'));
                    setNewArrivalSlides(pData.filter((s: any) => String(s.type || '').toUpperCase() === 'NEW_ARRIVAL' && String(s.status || '').toUpperCase() === 'ACTIVE'));
                }

                if (marqueeRes.status === 'fulfilled' && marqueeRes.value.data.success) {
                    setMarqueeItems(marqueeRes.value.data.data);
                }

                if (filtersRes.status === 'fulfilled' && filtersRes.value.data.success) {
                    setFilterSuggestions(filtersRes.value.data.data);
                }

                if (lookbookRes.status === 'fulfilled' && lookbookRes.value.data.success) {
                    setLookbookItems(lookbookRes.value.data.data);
                }
            } catch (err) {
                console.error("Home Data Fetch Error:", err);
                setReviewsLoading(false);
            }
        };

        fetchData();
    }, []);

    // DERIVE DYNAMIC OPTIONS
    const categoryTree = useMemo(() => {
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
    }, [allCategories]);

    // Filter display products for Essentials (Optimized with useMemo)
    const displayFeatured = useMemo(() => {
        let filtered = products;

        if (essentialsSearchQuery) {
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(essentialsSearchQuery.toLowerCase()) || 
                (p.category?.name || p.mainCategory || '').toLowerCase().includes(essentialsSearchQuery.toLowerCase())
            );
        }

        if (selectedEssentialsCategories.length > 0) {
            filtered = filtered.filter(p => {
                const pCatParent = p.category?.parent?.name;
                const pCatName = p.category?.name;
                const pMainCat = p.mainCategory;
                return selectedEssentialsCategories.some(selected =>
                    selected === pCatParent || selected === pCatName || selected === pMainCat
                );
            });
        }

        if (selectedEssentialsPriceList.length > 0) {
            filtered = filtered.filter(p => {
                const priceNum = Number(p.price) || 0;
                return selectedEssentialsPriceList.some(range => {
                    if (range === 'Under ₹1000') return priceNum < 1000;
                    if (range === '₹1000 - ₹2000') return priceNum >= 1000 && priceNum <= 2000;
                    if (range === 'Over ₹2000') return priceNum > 2000;
                    return false;
                });
            });
        }

        Object.entries(selectedFilters).forEach(([key, values]: [string, string[]]) => {
            if (values.length > 0) {
                filtered = filtered.filter(p => {
                    if (key === 'color') return values.includes(p.color || '') || p.variants?.some(v => values.includes(v.color || ''));
                    if (key === 'size') return values.some(val => p.sizes?.includes(val) || p.variants?.some(v => v.size === val));
                    return true;
                });
            }
        });

        return [...filtered].sort((a, b) => {
            const priceA = Number(a.price) || 0;
            const priceB = Number(b.price) || 0;
            if (essentialsSortBy === 'Price: Low to High') return priceA - priceB;
            if (essentialsSortBy === 'Price: High to Low') return priceB - priceA;
            if (essentialsSortBy === 'Trending') {
                if (a.isTrending && !b.isTrending) return -1;
                if (!a.isTrending && b.isTrending) return 1;
            }
            if (essentialsSortBy === 'Newest') {
                return String(b.id || b._id).localeCompare(String(a.id || a._id));
            }
            return String(b.id || b._id).localeCompare(String(a.id || a._id));
        }).slice(0, 8);
    }, [products, essentialsSearchQuery, selectedEssentialsCategories, selectedEssentialsPriceList, selectedFilters, essentialsSortBy]);

    const activeEssentialsFilterCount = selectedEssentialsCategories.length + selectedEssentialsPriceList.length + Object.values(selectedFilters).flat().length;

    const newDropProduct = products.find(p => p.isNewArrival) || products[0];

    const displayCategories = useMemo(() => {
        return categories.length > 0
            ? categories.map(c => ({
                title: c.name,
                image: c.image || 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=800',
                link: `/${encodeURIComponent(c.name)}`
            }))
            : [];
    }, [categories]);

    const renderEssentialsSidebarContent = useCallback(() => (
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
            {dynamicFiltersList.map(filter => {
                const options = getOptionsFor(filter.key);
                if (options.length === 0) return null;
                return (
                    <FilterAccordion
                        key={filter.key}
                        title={filter.label}
                        options={options}
                        selected={selectedFilters[filter.key] || []}
                        onToggle={(val: string) => toggleFilter(filter.key, val)}
                    />
                );
            })}
        </div>
    ), [categoryTree, essentialsSortBy, selectedEssentialsCategories, selectedEssentialsPriceList, selectedFilters]);

    return (
        <>
            <div className="bg-white">
                {Array.from(new Set(homeSections.sectionOrder || [])).map((sectionId) => {
                    switch (sectionId) {
                        case 'hero':
                            return <Hero key="hero" slides={heroSlides} />;
                        case 'marquee':
                            return (
                                <React.Suspense key="marquee" fallback={<div className="h-16 md:h-24 bg-luxury-black animate-pulse" />}>
                                    <MarqueeSection items={marqueeItems} />
                                </React.Suspense>
                            );
                        case 'new-standard':
                            if (homeSections.newStandard && !homeSections.newStandard.isVisible) return null;
                            return (
                                <React.Suspense key="new-standard" fallback={<div className="h-screen bg-gray-50 animate-pulse" />}>
                                    <NewStandardSection
                                        ns={homeSections.newStandard}
                                        newDropProduct={newDropProduct}
                                        isHovered={isHovered}
                                        setIsHovered={setIsHovered}
                                    />
                                </React.Suspense>
                            );
                        case 'categories':
                            return (
                                <React.Suspense key="categories" fallback={<div className="h-96 bg-zinc-50 animate-pulse" />}>
                                    <CategoriesSection
                                        homeSections={homeSections}
                                        displayCategories={displayCategories}
                                    />
                                </React.Suspense>
                            );
                        case 'promotional_slider':
                            return (
                                <React.Suspense key="promotional_slider" fallback={<div className="h-96 bg-white animate-pulse" />}>
                                    <PromotionalSlider slides={promotionalSlides} />
                                </React.Suspense>
                            );
                        case 'category-slider':
                            if (categorySlides.length === 0) return null;
                            return (
                                <React.Suspense key="category-slider" fallback={<div className="h-96 bg-white animate-pulse" />}>
                                    <PromotionalSlider slides={categorySlides} />
                                </React.Suspense>
                            );
                        case 'best-category-slider':
                            if (bestCategorySlides.length === 0) return null;
                            return (
                                <React.Suspense key="best-category-slider" fallback={<div className="h-96 bg-white animate-pulse" />}>
                                    <PromotionalSlider slides={bestCategorySlides} />
                                </React.Suspense>
                            );
                        case 'new-arrival-slider':
                            if (newArrivalSlides.length === 0) return null;
                            return (
                                <React.Suspense key="new-arrival-slider" fallback={<div className="h-96 bg-white animate-pulse" />}>
                                    <PromotionalSlider slides={newArrivalSlides} />
                                </React.Suspense>
                            );
                        case 'promotional':
                            return homeSections.promotionalBanner.isVisible && (
                                <section key="promotional" className="py-24 bg-white overflow-hidden">
                                    <div className="max-w-[1800px] mx-auto px-6 lg:px-12">
                                        <React.Suspense fallback={<div className="h-96 bg-white animate-pulse" />}>
                                            <PromotionalSlider slides={bottomPromoSlides} />
                                        </React.Suspense>
                                    </div>
                                </section>
                            );
                        case 'essentials':
                            return (
                                <React.Suspense key="essentials" fallback={<div className="min-h-screen bg-white animate-pulse" />}>
                                    <EssentialsSection
                                        homeSections={homeSections}
                                        displayFeatured={displayFeatured}
                                        essentialsSearchQuery={essentialsSearchQuery}
                                        setEssentialsSearchQuery={setEssentialsSearchQuery}
                                        activeEssentialsFilterCount={activeEssentialsFilterCount}
                                        setIsMobileFiltersOpen={setIsMobileFiltersOpen}
                                        essentialsSortBy={essentialsSortBy}
                                        setEssentialsSortBy={setEssentialsSortBy}
                                        renderEssentialsSidebarContent={renderEssentialsSidebarContent}
                                    />
                                </React.Suspense>
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
                                            {trendingProducts.map((product) => (
                                                <motion.div
                                                    key={product.id}
                                                    initial={{ opacity: 0, scale: 0.98 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                                                >
                                                    <ProductCard
                                                        key={product.id}
                                                        id={product.id}
                                                        name={product.name}
                                                        price={product.price}
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
                            return (
                                <React.Suspense key="testimonials" fallback={<div className="h-96 bg-zinc-50 animate-pulse" />}>
                                    <ClientVoicesSection reviews={allReviews.filter(r => r.homepageVisible && String(r.status || '').toUpperCase() === 'ACTIVE')} />
                                </React.Suspense>
                            );
                        case 'journal':
                            return (
                                <React.Suspense key="journal" fallback={<div className="h-96 bg-white animate-pulse" />}>
                                    <JournalSection homeSections={homeSections} journalPosts={journalPosts} />
                                </React.Suspense>
                            );
                        case 'lookbook':
                            return (
                                <React.Suspense key="lookbook" fallback={<div className="h-96 bg-stone-50 animate-pulse" />}>
                                    <LookbookSection lookbookItems={lookbookItems} />
                                </React.Suspense>
                            );
                        case 'commitment':
                            return (
                                <React.Suspense key="commitment" fallback={<div className="h-96 bg-white animate-pulse" />}>
                                    <CommitmentSection commitment={commitment} />
                                </React.Suspense>
                            );
                        case 'social':
                            return null;
                        default:
                            return null;
                    }
                })}
            </div>

            {/* Mobile Sidebar - Portaled to circumvent stacking contexts */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isMobileFiltersOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[10000] lg:hidden"
                                onClick={() => setIsMobileFiltersOpen(false)}
                            />
                            <motion.div
                                initial={{ x: '-100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '-100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="fixed inset-y-0 left-0 w-[85vw] max-w-sm bg-white shadow-2xl z-[10000] flex flex-col lg:hidden"
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
                </AnimatePresence>,
                document.body
            )}
        </>
    );
};

export default Home;
