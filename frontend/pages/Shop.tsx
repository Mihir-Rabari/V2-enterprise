import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { Search, ChevronDown, X, Filter, TrendingUp, Sparkles } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import FilterAccordion from '../components/FilterAccordion';
import { useProducts } from '../hooks/useProducts';
import { settingsAPI, categoriesAPI, filtersAPI } from '../lib/apiClient';
// No initialData imports allowed. 100% dynamic.
import { SiteSettings, Category } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageMeta } from '../hooks/usePageMeta';



const Shop: React.FC = () => {
    usePageMeta({
        title: 'Shop All | V2 Enterprise',
        description: 'Browse the full V2 Enterprise collection — premium kurtas, shirts, and luxury menswear. Filter by category, fabric, size, and more.',
        canonical: '/shop',
    });
    const { category, subcategory } = useParams<{ category: string, subcategory: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryTerm = searchParams.get('q') || '';

    let defaultCat = searchParams.get('category');
    if (subcategory) defaultCat = decodeURIComponent(subcategory);
    else if (category) defaultCat = decodeURIComponent(category);

    const initialCategory = (defaultCat && defaultCat.toLowerCase() !== 'all') ? defaultCat : 'All';
    const location = useLocation();
    const isNewArrivalsPage = location.pathname.replace(/\/$/, '') === '/new-arrivals';

    // Filter States
    const [selectedCategories, setSelectedCategories] = useState<string[]>(
        initialCategory && initialCategory !== 'All' ? [initialCategory] : []
    );
    const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);
    const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
    const [searchQuery, setSearchQuery] = useState(queryTerm);
    const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'Newest');
    const [page, setPage] = useState(1);

    // UI States
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
    const [siteSettings, setSiteSettings] = useState<SiteSettings>({} as SiteSettings);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [filterSuggestions, setFilterSuggestions] = useState<Record<string, string[]>>({});

    // ─── Fetch Params Construction ──────────────────────────────────────────

    const fetchParams = useMemo(() => {
        const params: any = {
            page,
            limit: 20,
            status: 'ACTIVE',
            groupByColor: true,
            sort: sortBy,
            search: searchQuery,
            // Map Sort
            ...(sortBy === 'Trending' && { isTrending: 'true' }),
        };

        // Categories mapping
        if (selectedCategories.length > 0) {
            const mainCats = selectedCategories.filter(name => {
                const cat = allCategories.find(c => c.name === name);
                return cat && !cat.parentId;
            });
            const subCats = selectedCategories.filter(name => {
                const cat = allCategories.find(c => c.name === name);
                return cat && cat.parentId;
            });
            
            if (mainCats.length > 0) params.mainCategories = mainCats;
            if (subCats.length > 0) params.subCategories = subCats;
        }

        // Price Mapping
        if (selectedPriceRanges.length > 0) {
            let minP = Infinity;
            let maxP = -Infinity;
            selectedPriceRanges.forEach(range => {
                if (range === 'Under ₹1000') { minP = Math.min(minP, 0); maxP = Math.max(maxP, 1000); }
                if (range === '₹1000 - ₹2000') { minP = Math.min(minP, 1000); maxP = Math.max(maxP, 2000); }
                if (range === 'Over ₹2000') { minP = Math.min(minP, 2000); maxP = Math.max(maxP, 1000000); }
            });
            params.minPrice = minP === Infinity ? undefined : minP;
            params.maxPrice = maxP === -Infinity ? undefined : maxP;
        }

        // Dynamic Filters Mapping
        (Object.entries(selectedFilters) as [string, string[]][]).forEach(([key, values]) => {
            if (values.length > 0) {
                // Pluralize keys for backend
                let apiKey = key;
                if (key === 'color') apiKey = 'colors';
                else if (key === 'size') apiKey = 'sizes';
                else if (key === 'patternType') apiKey = 'patternTypes';
                else if (!key.endsWith('s')) apiKey = `${key}s`;
                params[apiKey] = values;
            }
        });

        return params;
    }, [page, isNewArrivalsPage, searchQuery, sortBy, selectedCategories, selectedPriceRanges, selectedFilters, allCategories]);

    // Data Hook (Server-Side)
    const { products, loading: productsLoading, loadingMore, hasMore, total } = useProducts(fetchParams);

    // ─── Effects ───────────────────────────────────────────────────────────

    // Initial Data Load (Settings, Categories, Suggestions)
    useEffect(() => {
        settingsAPI.get().then(res => res.data.success && setSiteSettings(res.data.data)).catch(console.error);
        categoriesAPI.getAll().then(res => res.data.success && setAllCategories(res.data.data)).catch(console.error);
        filtersAPI.getSuggestions().then(res => res.data.success && setFilterSuggestions(res.data.data)).catch(console.error);
    }, []);

    // Reset page to 1 on filter change (except for 'page' change)
    useEffect(() => {
        setPage(1);
    }, [isNewArrivalsPage, searchQuery, sortBy, selectedCategories, selectedPriceRanges, selectedFilters]);

    // Keep Search Sync
    useEffect(() => {
        setSearchQuery(queryTerm);
        if (queryTerm !== searchQuery) {
            setSelectedCategories([]);
            setSelectedFilters({});
        }
    }, [queryTerm]);

    // Intersection Observer for Infinite Scroll
    const sentinelRef = React.useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!hasMore || productsLoading || loadingMore) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setPage(p => p + 1);
            }
        }, { threshold: 0.1 });

        if (sentinelRef.current) observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, productsLoading, loadingMore]);

    // ─── Handlers ─────────────────────────────────────────────────────────

    const toggleCategory = (cat: string) => {
        setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
    };

    const togglePrice = (price: string) => {
        setSelectedPriceRanges(prev => prev.includes(price) ? prev.filter(p => p !== price) : [...prev, price]);
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

    // ─── Render Helpers ────────────────────────────────────────────────────

    const categoryTree = useMemo(() => {
        const mains = allCategories.filter(c => !c.parentId || c.parentId === '0' || !allCategories.find(p => p.id === c.parentId));
        return mains.map(m => ({
            label: m.name,
            value: m.name,
            subOptions: allCategories
                .filter(c => String(c.parentId) === String(m.id))
                .map(s => ({ label: s.name, value: s.name }))
        }));
    }, [allCategories]);

    const getOptionsFor = (key: string) => {
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

    const activeFilterCount = selectedCategories.length + selectedPriceRanges.length + Object.values(selectedFilters).reduce((acc: number, curr: string[]) => acc + curr.length, 0);

    const renderSidebarContent = () => (
        <div className="w-full">
            <FilterAccordion title="Sort By" isSort currentSort={sortBy} onSortChange={setSortBy} options={[]} selected={[]} onToggle={() => { }} />
            <FilterAccordion title="Product Category" options={categoryTree} selected={selectedCategories} onToggle={toggleCategory} isNested />
            <FilterAccordion title="Price" isPriceRange selected={selectedPriceRanges} onToggle={togglePrice} options={[]} />

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
    );

    return (
        <div className="bg-white min-h-screen animate-fade-in relative">
            <div className="lg:hidden sticky top-[72px] z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 py-3 shadow-sm">
                <div className="px-6 flex items-center justify-between w-full">
                    <button
                        onClick={() => setIsMobileFiltersOpen(true)}
                        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-luxury-black bg-gray-50 px-5 py-2.5 rounded border border-gray-200"
                    >
                        <Filter size={14} /> Filters
                        {activeFilterCount > 0 && <span className="bg-luxury-black text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] ml-1">{activeFilterCount}</span>}
                    </button>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{total} DESIGNS FOUND</div>
                </div>
            </div>

            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isMobileFiltersOpen && (
                        <>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[10000] lg:hidden" onClick={() => setIsMobileFiltersOpen(false)} />
                            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-y-0 left-0 w-[85vw] max-w-sm bg-white shadow-2xl z-[10000] flex flex-col lg:hidden">
                                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                                    <h3 className="font-serif text-2xl italic tracking-tight">Filters</h3>
                                    <button onClick={() => setIsMobileFiltersOpen(false)} className="p-2 bg-white rounded-full text-gray-500 shadow-sm border border-gray-100 hover:bg-gray-100"><X size={16} /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto px-6 pt-2 pb-6">{renderSidebarContent()}</div>
                                <div className="p-5 border-t border-gray-100 bg-white space-y-3">
                                    <div className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{total} Results</div>
                                    <div className="flex gap-3">
                                        <button onClick={() => { setSelectedCategories([]); setSelectedPriceRanges([]); setSelectedFilters({}); }} className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 border border-gray-200 rounded hover:bg-gray-50">Clear</button>
                                        <button onClick={() => setIsMobileFiltersOpen(false)} className="flex-[2] py-3 text-[10px] font-bold uppercase tracking-widest bg-luxury-black text-white rounded hover:bg-luxury-gold transition-colors">Apply Filters</button>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}

            <div className="max-w-[1700px] mx-auto px-6 lg:px-12 py-8 lg:py-12">
                <div className="flex flex-col lg:flex-row items-start gap-10">
                    <div className="hidden lg:flex flex-col w-[260px] flex-shrink-0 sticky top-[100px] max-h-[calc(100vh-120px)] overflow-hidden">
                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                            <span className="font-bold text-sm uppercase tracking-widest">Filters</span>
                            {activeFilterCount > 0 && (
                                <button onClick={() => { setSelectedCategories([]); setSelectedPriceRanges([]); setSelectedFilters({}); }} className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold hover:text-luxury-black transition-colors">Clear All</button>
                            )}
                        </div>
                        <div className="text-[10px] font-medium text-gray-400 mb-6 uppercase tracking-widest flex-shrink-0 border-b border-gray-100 pb-4">{total} DESIGNS FOUND</div>
                        <div className="flex-1 overflow-y-auto w-full no-scrollbar pr-2 pb-8">{renderSidebarContent()}</div>
                    </div>

                    <div className="flex-1 min-w-0 w-full">
                        {productsLoading && page === 1 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-12 animate-pulse">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="space-y-4">
                                        <div className="aspect-[3/4] bg-gray-100 rounded-lg" />
                                        <div className="h-4 bg-gray-100 rounded w-2/3" />
                                        <div className="h-4 bg-gray-100 rounded w-1/3" />
                                    </div>
                                ))}
                            </div>
                        ) : products.length > 0 ? (
                            <div className="relative">
                                <style>{`
                                    .shop-grid-dynamic {
                                        display: grid;
                                        grid-template-columns: repeat(${siteSettings.gridSettings?.mobile || 2}, minmax(0, 1fr));
                                        gap: 2.5rem 1rem;
                                    }
                                    @media (min-width: 640px) { .shop-grid-dynamic { grid-template-columns: repeat(${siteSettings.gridSettings?.tablet || 2}, minmax(0, 1fr)); gap: 4rem 2rem; } }
                                    @media (min-width: 1024px) { .shop-grid-dynamic { grid-template-columns: repeat(${siteSettings.gridSettings?.desktop || 4}, minmax(0, 1fr)); gap: 5rem 2rem; } }
                                `}</style>
                                <div className="shop-grid-dynamic w-full">
                                    {products.map(product => (
                                        <ProductCard
                                            key={product.id}
                                            id={product.id}
                                            name={product.name}
                                            price={product.price}
                                            originalPrice={product.originalPrice}
                                            image={product.photo}
                                            hoverImage={product.hoverImage || product.photos?.[1]}
                                            isTrending={product.isTrending}
                                            isNewArrival={product.isNewArrival}
                                            sizes={product.sizes}
                                        />
                                    ))}
                                </div>

                                {hasMore && (
                                    <div ref={sentinelRef} className="py-20 flex flex-col items-center justify-center space-y-4">
                                        {loadingMore ? (
                                            <>
                                                <div className="w-8 h-8 border-2 border-luxury-gold border-t-transparent rounded-full animate-spin" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Loading more masterpieces...</span>
                                            </>
                                        ) : (
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">Scroll for more</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="py-32 flex flex-col items-center justify-center text-center space-y-6 bg-gray-50 rounded-2xl border border-gray-100">
                                <h3 className="font-serif text-3xl italic text-gray-300">No matches found.</h3>
                                <p className="text-sm text-gray-400">Try adjusting your filters or search query.</p>
                                <button onClick={() => { setSelectedCategories([]); setSelectedPriceRanges([]); setSelectedFilters({}); setSearchQuery(''); }} className="px-8 py-4 bg-white border border-gray-200 uppercase text-xs font-bold tracking-widest rounded transition-colors hover:border-black">Clear All Filters</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Shop;
