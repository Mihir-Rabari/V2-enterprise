'use client';

/**
 * Next.js port of frontend/pages/Home.tsx (the "/" storefront home page).
 *
 * Route: app/(storefront)/page.tsx (server component, owns route metadata) →
 * this client component (hooks, framer-motion, browser APIs).
 *
 * ── MEDIA EXCLUSION — bundled Dior video ────────────────────────────────────
 * The Vite hero's <video> layer existed to autoplay the bundled campaign clip
 * `frontend/public/The_Dior_Men_s_Summer_2022_Campaign_Video_720P.mp4`
 * (referenced by the backend seed data as the first hero slide and a
 * BOTTOM_PROMOTIONAL slide). Per the migration media mandate, that file is NOT
 * copied into the Next.js app and NO video element ships with this port:
 *
 *  - The `HeroVideo` component (autoplaying <video> + canplaythrough handling)
 *    is removed entirely.
 *  - Video-type hero slides (and slides whose URL ends in a video extension)
 *    keep the exact same layout/typography/spacing via a lightweight,
 *    non-video treatment:
 *      • if the slide provides API/runtime poster art, that still image renders
 *        with the original cover/scale/hover classes (no new media, no
 *        replacement video);
 *      • otherwise a clean static treatment (subtle luxury gold/black CSS
 *        gradient on the existing `bg-luxury-black` canvas) fills the layer.
 *  - Image slides are untouched — they already render runtime backend/CDN
 *    media returned by `sliderAPI.getHero()`.
 *  - Initial-load resolution: the Vite app resolved the splash screen on the
 *    bundled video's `canplaythrough` (or a 5s fallback timer). With static
 *    media there is nothing to buffer, so poster slides resolve on the poster
 *    img's `onLoad` and poster-less video slides resolve immediately; the 5s
 *    fallback timer is preserved for image slides exactly like the original.
 *
 * ── Other adaptations (behavior-identical) ──────────────────────────────────
 *  - `Link` from next/link (`to` → `href`); `React.lazy` + `Suspense` replaced
 *    by `next/dynamic` (same below-the-fold code splitting; each dynamic keeps
 *    the original Suspense fallback as its `loading` placeholder).
 *  - Dead code from the Vite source dropped (documented in the PR): the
 *    unused `usePageMeta` / `useLocalStorage` imports, the never-read
 *    `videoReady`/`productsLoading` state, the unused Hero `videoUrl` memo and
 *    unused lucide/type imports. `reviewsLoading` (set, never read) is kept
 *    verbatim to preserve the fetch flow.
 *  - Latent strict-tsc fixes (behavior-neutral, each documented in the PR):
 *    filterSuggestions typed to include `customAttributes` (removes an invalid
 *    `as` cast), `_id`/`hoverImage` accesses that the merged ApiProduct type
 *    doesn't declare go through local casts, and `promotionalBanner` /
 *    `newStandard` access uses optional chaining so a settings document that
 *    omits them degrades gracefully instead of crashing mid-render.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import Link from 'next/link';
import ProductCard from '../ProductCard';
import FilterAccordion from '../FilterAccordion';
import { useProducts, ApiProduct } from '../../hooks/useProducts';
import { reviewsAPI, sliderAPI, categoriesAPI, contentAPI, filtersAPI, resolveLocalAssetUrl } from '../../lib/apiClient';
import { getOptimizedImageUrl } from '../../utils/mediaUtils';
import { useInitialLoad } from '../../context/InitialLoadContext';
import { useSettings } from '../../context/SettingsContext';
import {
    CommitmentContent, HomeSectionContent,
    MarqueeItem, JournalPost, LookbookItem, Review,
    HeroSlide, Category, PromotionalSlide, SiteSettings
} from '../../types';

// Lazy load below-the-fold sections (next/dynamic replaces the Vite app's
// React.lazy; each loading placeholder is the original Suspense fallback).
const NewStandardSection = dynamic(() => import('./NewStandardSection'), { loading: () => <div className="h-screen bg-gray-50 animate-pulse" /> });
const CategoriesSection = dynamic(() => import('./CategoriesSection'), { loading: () => <div className="h-96 bg-zinc-50 animate-pulse" /> });
const CommitmentSection = dynamic(() => import('./CommitmentSection'), { loading: () => <div className="h-96 bg-white animate-pulse" /> });
const JournalSection = dynamic(() => import('./JournalSection'), { loading: () => <div className="h-96 bg-white animate-pulse" /> });
const LookbookSection = dynamic(() => import('./LookbookSection'), { loading: () => <div className="h-96 bg-stone-50 animate-pulse" /> });
const EssentialsSection = dynamic(() => import('./EssentialsSection'), { loading: () => <div className="min-h-screen bg-white animate-pulse" /> });
const MarqueeSection = dynamic(() => import('./MarqueeSection'), { loading: () => <div className="min-h-[56px] md:min-h-[92px] bg-luxury-black animate-pulse" /> });
const PromotionalSlider = dynamic(() => import('../PromotionalSlider'), { loading: () => <div className="h-96 bg-white animate-pulse" /> });
const ClientVoicesSection = dynamic(() => import('./ClientVoicesSection'), { loading: () => <div className="h-96 bg-zinc-50 animate-pulse" /> });

/** Suggestions payload from filtersAPI.getSuggestions() — per-key option lists
 *  plus the `customAttributes` map the Vite source accessed via a cast. */
type FilterSuggestions = Record<string, string[]> & { customAttributes?: Record<string, string[]> };

/**
 * Runtime shape of the settings document this page reads. The Vite source
 * accessed `siteSettings.homeSections` / `siteSettings.commitment` even though
 * neither the legacy nor the merged `SiteSettings` type declares them (the
 * Vite dev server never typechecked strictly, so it compiled). Strict tsc
 * surfaces the latent error; this intersection type + cast preserves the
 * exact runtime behavior (fields read only when present).
 */
type SettingsWithHomeContent = SiteSettings & {
    homeSections?: HomeSectionContent;
    commitment?: CommitmentContent;
};

interface HeroProps {
    slides: HeroSlide[];
}

const Hero: React.FC<HeroProps> = ({ slides }) => {
    const [index, setIndex] = React.useState(0);
    // SSR-safe lazy initializer — avoids window access before hydration
    const [width, setWidth] = React.useState(() =>
        typeof window !== 'undefined' ? window.innerWidth : 1024
    );
    const { setIsInitialLoad } = useInitialLoad();
    const activeSlides = slides.filter(s => String(s.status || '').toUpperCase() === 'ACTIVE');
    const current = activeSlides[index] || activeSlides[0];

    React.useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);

        // Fallback timeout: Resolve initial load if media takes too long
        const fallbackTimer = setTimeout(() => {
            setIsInitialLoad(false);
        }, 5000);

        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(fallbackTimer);
        };
    }, [setIsInitialLoad]);

    React.useEffect(() => {
        if (activeSlides.length <= 1) return;

        const currentDuration = current?.duration || 5000;

        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % activeSlides.length);
        }, currentDuration);

        return () => clearInterval(timer);
    }, [activeSlides.length, index, current?.duration]);

    // Static media has nothing to buffer: a video slide without poster art
    // resolves the initial load immediately (see MEDIA EXCLUSION above);
    // poster-backed and image slides resolve via onLoad / the 5s fallback.
    React.useEffect(() => {
        if (!current) return;
        const isVideoSlide = current.type === 'video' || /\.(mp4|mov|webm|ogg)$/i.test(current.url);
        if (isVideoSlide && !current.poster) {
            setIsInitialLoad(false);
        }
    }, [current, setIsInitialLoad]);

    if (!current) return null;

    return (
        <section className="relative h-screen w-full overflow-hidden bg-luxury-black">
            {/* Persistent Media Stack (Preloading Layer) */}
            <div className="absolute inset-0 z-0">
                {activeSlides.map((slide, i) => {
                    const isCurrent = i === index;
                    const isNext = i === (index + 1) % activeSlides.length;

                    // Only render current and next to optimize performance, or all if few slides
                    if (!isCurrent && !isNext) return null;

                    const slideMediaUrl =
                        width < 640 ? slide.mobileUrl || slide.url :
                        width < 1024 ? slide.tabletUrl || slide.url :
                        slide.laptopUrl || slide.url;

                    const isVideoSlide = slide.type === 'video' || /\.(mp4|mov|webm|ogg)$/i.test(slideMediaUrl);

                    return (
                        <div
                            key={slide.id}
                            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${isCurrent ? 'opacity-100' : 'opacity-0'}`}
                        >
                            <div className="absolute inset-0 overflow-hidden">
                                {isVideoSlide ? (
                                    slide.poster ? (
                                        // Video slide (media excluded) — static treatment with the
                                        // slide's own runtime poster art, original cover/scale classes.
                                        <img
                                            src={resolveLocalAssetUrl(getOptimizedImageUrl(slide.poster, { width: 1920, quality: 75 }))}
                                            alt={slide.title}
                                            fetchPriority={isCurrent ? 'high' : 'low'}
                                            onLoad={() => { if (isCurrent) setIsInitialLoad(false); }}
                                            className="w-full h-full object-cover scale-105 transition-transform duration-[3000ms] group-hover/hero:scale-110"
                                        />
                                    ) : (
                                        // Video slide without poster — clean static treatment of the
                                        // same layer: subtle gold/charcoal gradient on the black canvas.
                                        <div
                                            aria-hidden="true"
                                            className="w-full h-full scale-105 transition-transform duration-[3000ms] group-hover/hero:scale-110"
                                            style={{
                                                background:
                                                    'radial-gradient(120% 90% at 70% 20%, rgba(191, 163, 122, 0.15), transparent 60%), radial-gradient(100% 80% at 20% 85%, rgba(255, 255, 255, 0.06), transparent 55%), #0a0a0a',
                                            }}
                                        />
                                    )
                                ) : (
                                    <img
                                        src={resolveLocalAssetUrl(getOptimizedImageUrl(slide.url, { width: 1920, quality: 75 }))}
                                        alt={slide.title}
                                        fetchPriority={isCurrent ? 'high' : 'low'}
                                        className="w-full h-full object-cover scale-105 transition-transform duration-[3000ms] group-hover/hero:scale-110"
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* Content Transition Layer */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={current.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 z-10"
                >
                    <Link href={current.ctaLink} className="block relative h-full w-full group/hero">
                        <div className="relative h-full max-w-[1800px] mx-auto px-6 lg:px-12 flex flex-col justify-center items-start z-10">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                                className="max-w-5xl space-y-12"
                            >
                                <div className="space-y-8">
                                    {(current.taglineVisible !== false && current.tagline) && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -30 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.4, duration: 0.8 }}
                                            className="flex items-center gap-4"
                                        >
                                            <div className="w-12 h-[1px] bg-luxury-gold" />
                                            <span className="text-luxury-gold text-[10px] sm:text-[12px] font-bold uppercase tracking-[0.6em] mb-6 block animate-fade-in-up text-shadow-luxury">{current.tagline}</span>
                                        </motion.div>
                                    )}

                                    {(current.titleVisible !== false && current.title) && (
                                        <h1 className="font-serif text-[12vw] sm:text-[10vw] md:text-[140px] leading-[0.8] tracking-tighter text-white text-shadow-luxury">
                                            {current.title.split('\n').map((line, i) => (
                                                <span key={i} className="block">{line}</span>
                                            ))}
                                        </h1>
                                    )}

                                    {(current.descriptionVisible !== false && current.description) && (
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 0.6 }}
                                            transition={{ delay: 0.6, duration: 1 }}
                                            className="max-w-xl text-white font-serif italic text-lg sm:text-xl leading-relaxed"
                                        >
                                            {current.description}
                                        </motion.p>
                                    )}
                                </div>

                                {(current.ctaVisible !== false && current.ctaText) && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.8, duration: 0.8 }}
                                        className="flex flex-col sm:flex-row gap-6 pt-4"
                                    >
                                        <div className="group/btn relative overflow-hidden bg-white text-luxury-black px-10 py-5 text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-500 hover:px-14">
                                            <span className="relative z-10 flex items-center gap-2">
                                                {current.ctaText} <ArrowRight size={14} />
                                            </span>
                                            <div className="absolute inset-0 bg-luxury-gold translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500 ease-out" />
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        </div>
                    </Link>
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

const HomePage: React.FC = () => {
    // API Hooks
    const { products } = useProducts({ limit: 300, groupByColor: true });
    const [allReviews, setAllReviews] = useState<Review[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const [essentialsSearchQuery, setEssentialsSearchQuery] = useState('');
    const [essentialsSortBy, setEssentialsSortBy] = useState('Newest');
    const [selectedEssentialsCategories, setSelectedEssentialsCategories] = useState<string[]>([]);
    const [selectedEssentialsPriceList, setSelectedEssentialsPriceList] = useState<string[]>([]);
    const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
    const [isHovered, setIsHovered] = useState(false);
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
    const [filterSuggestions, setFilterSuggestions] = useState<FilterSuggestions>({});

    const hardcodedFilterKeys = new Set(['color', 'size', 'patternType', 'fabric', 'collar', 'sleeve', 'neck', 'pocket', 'length', 'chest', 'waist', 'shoulder', 'sleeveLength']);

    const dynamicFiltersList: Array<{ key: string; label: string; _customValues?: string[] }> = [
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
        // Dynamic custom attribute filters (not already in hardcoded list)
        ...Object.entries(filterSuggestions?.customAttributes || {})
            .filter(([key]) => !hardcodedFilterKeys.has(key))
            .map(([key, values]) => ({ key: `custom_${key}`, label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), _customValues: values })),
    ];

    const getOptionsFor = (key: string, customValues?: string[]) => {
        // Custom attribute keys (prefixed with "custom_")
        if (key.startsWith('custom_')) {
            return Array.isArray(customValues) ? customValues : [];
        }
        if (filterSuggestions && Array.isArray(filterSuggestions[key]) && filterSuggestions[key].length > 0) {
            return filterSuggestions[key];
        }
        if (key === 'color') {
            const colors = new Set<string>();
            products.forEach(p => {
                if (p.color) colors.add(p.color);
                p.variants?.forEach((v: any) => { if (v.color) colors.add(v.color) });
            });
            return Array.from(colors).sort();
        }
        if (key === 'size') {
            const sizes = new Set<string>();
            products.forEach(p => {
                p.sizes?.forEach((s: string) => sizes.add(s));
                p.variants?.forEach((v: any) => { if (v.size) sizes.add(v.size) });
            });
            return Array.from(sizes).sort();
        }
        return Array.from(new Set(products.map((p: any) => p[key]).filter(Boolean))).sort() as string[];
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
    const [heroLoaded, setHeroLoaded] = useState(false);
    const [marqueeItems, setMarqueeItems] = useState<MarqueeItem[]>([]);
    const [lookbookItems, setLookbookItems] = useState<LookbookItem[]>([]);
    const [commitment, setCommitment] = useState<CommitmentContent>({} as CommitmentContent);
    const { settings: siteSettings } = useSettings();
    useEffect(() => {
        const runtimeSettings = siteSettings as SettingsWithHomeContent;
        if (runtimeSettings.homeSections) setHomeSections(runtimeSettings.homeSections);
        if (runtimeSettings.commitment) setCommitment(runtimeSettings.commitment);
    }, [siteSettings]);
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
                // The secondary requests do not depend on hero/categories, so start them together instead of after.
                const secondaryRequests = Promise.allSettled([
                    reviewsAPI.getHomepage(),
                    sliderAPI.getPromotional(),
                    sliderAPI.getMarquee(),
                    filtersAPI.getSuggestions(),
                    contentAPI.getByType('LOOKBOOK_ITEM')
                ]);
                const [heroRes, categoriesRes] = await Promise.allSettled([
                    sliderAPI.getHero(),
                    categoriesAPI.getAll()
                ]);

                if (heroRes.status === 'fulfilled' && heroRes.value.data.success) {
                    setHeroSlides(heroRes.value.data.data);
                }
                setHeroLoaded(true);

                if (categoriesRes.status === 'fulfilled' && categoriesRes.value.data.success) {
                    const sortedCats = categoriesRes.value.data.data;
                    setAllCategories(sortedCats);
                    setCategories(sortedCats.filter((c: any) => !c.parentId || c.parentId === "" || c.parentId === null));
                }

                const [reviewsRes, promoRes, marqueeRes, filtersRes, lookbookRes] = await secondaryRequests;

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
                    // `Category` has no `_id` field in the merged types; the Vite
                    // source read it anyway (strict-tsc latent error) — cast keeps
                    // the identical Mongo-id fallback comparison.
                    return String(pid) === String(m.id) || String(pid) === String((m as { _id?: string })._id) || c.parentCategory === m.name;
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
                    if (key === 'color') return values.includes(p.color || '') || p.variants?.some((v: any) => values.includes(v.color || ''));
                    if (key === 'size') return values.some(val => p.sizes?.includes(val) || p.variants?.some((v: any) => v.size === val));
                    if (key.startsWith('custom_')) {
                        const attrKey = key.slice('custom_'.length);
                        const attrVal = (p as any).customAttributes?.[attrKey];
                        return attrVal != null && values.includes(String(attrVal));
                    }
                    return values.includes((p as any)[key] || '');
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
                return String(b.id || (b as { _id?: string })._id).localeCompare(String(a.id || (a as { _id?: string })._id));
            }
            return String(b.id || (b as { _id?: string })._id).localeCompare(String(a.id || (a as { _id?: string })._id));
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
                const options = getOptionsFor(filter.key, filter._customValues);
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
    ), [categoryTree, essentialsSortBy, selectedEssentialsCategories, selectedEssentialsPriceList, selectedFilters, filterSuggestions, products]);

    return (
        <>
            <div className="bg-white">
                {!homeSections.sectionOrder?.length && <section className="h-screen w-full bg-luxury-black" />}
                {Array.from(new Set(homeSections.sectionOrder || [])).map((sectionId) => {
                    switch (sectionId) {
                        case 'hero':
                            // Reserve the hero's height until slides arrive so content below does not jump
                            return heroLoaded ? <Hero key="hero" slides={heroSlides} /> : <section key="hero-placeholder" className="h-screen w-full bg-luxury-black" />;
                        case 'marquee':
                            return <MarqueeSection key="marquee" items={marqueeItems} />;
                        case 'new-standard':
                            if (homeSections.newStandard && !homeSections.newStandard.isVisible) return null;
                            return (
                                <NewStandardSection
                                    key="new-standard"
                                    ns={homeSections.newStandard}
                                    newDropProduct={newDropProduct}
                                    isHovered={isHovered}
                                    setIsHovered={setIsHovered}
                                />
                            );
                        case 'categories':
                            return (
                                <CategoriesSection
                                    key="categories"
                                    homeSections={homeSections}
                                    displayCategories={displayCategories}
                                />
                            );
                        case 'promotional_slider':
                            return <PromotionalSlider key="promotional_slider" slides={promotionalSlides} />;
                        case 'category-slider':
                            if (categorySlides.length === 0) return null;
                            return <PromotionalSlider key="category-slider" slides={categorySlides} />;
                        case 'best-category-slider':
                            if (bestCategorySlides.length === 0) return null;
                            return <PromotionalSlider key="best-category-slider" slides={bestCategorySlides} />;
                        case 'new-arrival-slider':
                            if (newArrivalSlides.length === 0) return null;
                            return <PromotionalSlider key="new-arrival-slider" slides={newArrivalSlides} />;
                        case 'promotional':
                            return homeSections.promotionalBanner?.isVisible && (
                                <section key="promotional" className="py-12 bg-white overflow-hidden">
                                    <div className="max-w-[1800px] mx-auto px-6 lg:px-12">
                                        <PromotionalSlider slides={bottomPromoSlides} />
                                    </div>
                                </section>
                            );
                        case 'essentials':
                            return (
                                <EssentialsSection
                                    key="essentials"
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
                            );
                        case 'trending': {
                            const trendingProducts = products.filter(p => p.isTrending).slice(0, 4);
                            if (trendingProducts.length === 0) return null;
                            return (
                                <section key="trending" className="bg-white text-luxury-black py-12 md:py-20 overflow-hidden relative border-t border-gray-100">
                                    <div className="max-w-[1800px] mx-auto px-6 lg:px-12 relative z-10">
                                        <div className="flex justify-between items-center mb-10 md:mb-12">
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
                                                        hoverImage={(product as { hoverImage?: string }).hoverImage || product.photos?.[1]}
                                                        isTrending={product.isTrending}
                                                        isNewArrival={product.isNewArrival}
                                                        sizes={product.sizes}
                                                    />
                                                </motion.div>
                                            ))}
                                        </div>

                                        <div className="mt-12 flex justify-center">
                                            <Link
                                                href="/shop?sort=Trending"
                                                className="group flex items-center gap-3 bg-luxury-black text-white px-10 py-5 text-[10px] font-bold uppercase tracking-[0.4em] rounded-full hover:bg-luxury-gold transition-all transform hover:scale-105 active:scale-95 shadow-xl"
                                            >
                                                Show More <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                            </Link>
                                        </div>
                                    </div>
                                </section>
                            );
                        }
                        case 'testimonials':
                            return (
                                <ClientVoicesSection
                                    key="testimonials"
                                    reviews={allReviews.filter(r => r.homepageVisible && String(r.status || '').toUpperCase() === 'ACTIVE')}
                                />
                            );
                        case 'journal':
                            return (
                                <JournalSection key="journal" homeSections={homeSections} journalPosts={journalPosts} />
                            );
                        case 'lookbook':
                            return (
                                <LookbookSection key="lookbook" lookbookItems={lookbookItems} />
                            );
                        case 'commitment':
                            return (
                                <CommitmentSection key="commitment" commitment={commitment} />
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

export default HomePage;
