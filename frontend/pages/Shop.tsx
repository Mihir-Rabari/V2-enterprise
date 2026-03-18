import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { Search, ChevronDown, X, Filter, TrendingUp, Sparkles } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import FilterAccordion from '../components/FilterAccordion';
import { useProducts } from '../hooks/useProducts';
import { settingsAPI, categoriesAPI, filtersAPI } from '../lib/apiClient';
import { initialSiteSettings } from '../data/initialData';
import { SiteSettings, Category } from '../types';
import { motion, AnimatePresence } from 'framer-motion';



const Shop: React.FC = () => {
    const { category, subcategory } = useParams<{ category: string, subcategory: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryTerm = searchParams.get('q') || '';

    let defaultCat = searchParams.get('category');
    if (subcategory) defaultCat = decodeURIComponent(subcategory);
    else if (category) defaultCat = decodeURIComponent(category);

    const initialCategory = (defaultCat && defaultCat.toLowerCase() !== 'all') ? defaultCat : 'All';
    const location = useLocation();
    const isNewArrivalsPage = location.pathname === '/new-arrivals';

    const { products: rawProducts, loading: productsLoading } = useProducts({ status: 'ACTIVE', limit: 500, groupByColor: true });
    const [siteSettings, setSiteSettings] = useState<SiteSettings>(initialSiteSettings);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [filterSuggestions, setFilterSuggestions] = useState<Record<string, string[]>>({});

    const products = rawProducts; // Preserve original category data from API

    const [selectedCategories, setSelectedCategories] = useState<string[]>(
        initialCategory && initialCategory !== 'All' ? [initialCategory] : []
    );
    const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);

    // NEW: Comprehensive Selected Filters (fabric, collar, etc.)
    const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});

    const [searchQuery, setSearchQuery] = useState(queryTerm);
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
    const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'Newest');

    useEffect(() => {
        const sortParam = searchParams.get('sort');
        if (sortParam && ['Newest', 'Trending', 'Price: Low to High', 'Price: High to Low', 'A - Z'].includes(sortParam)) {
            setSortBy(sortParam);
        }
    }, [searchParams]);

    useEffect(() => {
        if (initialCategory) {
            if (initialCategory === 'All') setSelectedCategories([]);
            else setSelectedCategories([initialCategory]);
        }
    }, [initialCategory]);

    useEffect(() => {
        settingsAPI.get().then(res => {
            if (res.data.success && res.data.data) {
                setSiteSettings(res.data.data);
            }
        }).catch(err => console.error(err));

        categoriesAPI.getAll().then(res => {
            if (res.data.success && res.data.data) {
                setAllCategories(res.data.data);
            }
        }).catch(err => console.error(err));

        filtersAPI.getSuggestions().then(res => {
            if (res.data.success && res.data.data) {
                setFilterSuggestions(res.data.data);
            }
        }).catch(err => console.error(err));
    }, []);

    useEffect(() => {
        setSearchQuery(queryTerm);
        if (queryTerm !== searchQuery) {
            setSelectedCategories([]);
            setSelectedFilters({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryTerm]);

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

    const getOptionsFor = (key: string) => {
        // Use the globally synced filter suggestions from the API
        if (filterSuggestions && Array.isArray(filterSuggestions[key])) {
            return filterSuggestions[key];
        }
        
        // Fallback to deriving from loaded products if API fails
        if (key === 'color') {
            const colors = new Set<string>();
            rawProducts.forEach(p => {
                if (p.color) colors.add(p.color);
                p.variants?.forEach(v => { if (v.color) colors.add(v.color) });
            });
            return Array.from(colors).sort();
        }
        if (key === 'size') {
            const sizes = new Set<string>();
            rawProducts.forEach(p => {
                p.sizes?.forEach(s => sizes.add(s));
                p.variants?.forEach(v => { if (v.size) sizes.add(v.size) });
            });
            return Array.from(sizes).sort();
        }
        return Array.from(new Set(rawProducts.map(p => (p as any)[key]).filter(Boolean))).sort();
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

    const toggleCategory = (cat: string) => {
        setSelectedCategories(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
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

    // FILTER LOGIC
    let filteredProducts = products;

    if (isNewArrivalsPage) {
        filteredProducts = filteredProducts.filter(p => p.isNewArrival === true);
    }

    if (searchQuery) {
        filteredProducts = filteredProducts.filter(p =>
            p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.mainCategory?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.subCategory?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }

    if (selectedCategories.length > 0) {
        filteredProducts = filteredProducts.filter(p =>
            selectedCategories.includes(p.subCategory || '') ||
            selectedCategories.includes(p.mainCategory || '')
        );
    }

    if (selectedPriceRanges.length > 0) {
        filteredProducts = filteredProducts.filter(p => {
            const price = p.price || 0;
            return selectedPriceRanges.some(range => {
                if (range === 'Under ₹1000') return price < 1000;
                if (range === '₹1000 - ₹2000') return price >= 1000 && price <= 2000;
                if (range === 'Over ₹2000') return price > 2000;
                return false;
            });
        });
    }

    Object.entries(selectedFilters).forEach(([key, values]: [string, string[]]) => {
        if (values.length > 0) {
            filteredProducts = filteredProducts.filter(p => {
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

    // SORT LOGIC
    filteredProducts = [...filteredProducts].sort((a, b) => {
        switch (sortBy) {
            case 'Price: Low to High':
                return (a.price || 0) - (b.price || 0);
            case 'Price: High to Low':
                return (b.price || 0) - (a.price || 0);
            case 'A - Z':
                return (a.name || '').localeCompare(b.name || '');
            case 'Trending':
                if (a.isTrending && !b.isTrending) return -1;
                if (!a.isTrending && b.isTrending) return 1;
                return String(b.id).localeCompare(String(a.id));
            case 'Newest':
            default:
                return String(b.id).localeCompare(String(a.id));
        }
    });

    const activeFilterCount = selectedCategories.length + selectedPriceRanges.length + Object.values(selectedFilters).reduce((acc: number, curr: string[]) => acc + curr.length, 0);

    const renderSidebarContent = () => (
        <div className="w-full">
            <FilterAccordion title="Sort By" isSort currentSort={sortBy} onSortChange={setSortBy} options={[]} selected={[]} onToggle={() => { }} />
            <FilterAccordion title="Product Category" options={categoryTree} selected={selectedCategories} onToggle={toggleCategory} isNested />
            <FilterAccordion title="Price" isPriceRange selected={selectedPriceRanges} onToggle={togglePrice} options={[]} />

            {dynamicFiltersList.map(filter => {
                const options = getOptionsFor(filter.key);
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
            {/* Page Header */}
            {/* Mobile Filter Toggle Overlay Bar (Sticky) */}
            <div className="lg:hidden sticky top-[72px] z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 py-3 shadow-sm">
                <div className="px-6 flex items-center justify-between w-full">
                    <button
                        onClick={() => setIsMobileFiltersOpen(true)}
                        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-luxury-black bg-gray-50 px-5 py-2.5 rounded border border-gray-200"
                    >
                        <Filter size={14} /> Filters
                        {activeFilterCount > 0 && (
                            <span className="bg-luxury-black text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] ml-1">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        {filteredProducts.length} DESIGNS FOUND
                    </div>
                </div>
            </div>

            {/* Mobile Sidebar - Handled via Portal */}
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
                                    {renderSidebarContent()}
                                </div>

                                <div className="p-5 border-t border-gray-100 bg-white space-y-3">
                                    <div className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                                        {filteredProducts.length} Results
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => { setSelectedCategories([]); setSelectedPriceRanges([]); setSelectedFilters({}); }}
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

            {/* Main Application Area (Desktop) */}
            <div className="max-w-[1700px] mx-auto px-6 lg:px-12 py-8 lg:py-12">
                <div className="flex flex-col lg:flex-row items-start gap-10">

                    {/* Left Sidebar (Desktop) */}
                    <div className="hidden lg:flex flex-col w-[260px] flex-shrink-0 sticky top-[100px] max-h-[calc(100vh-120px)] overflow-hidden">
                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                            <span className="font-bold text-sm uppercase tracking-widest">Filters</span>
                            {activeFilterCount > 0 && (
                                <button
                                    onClick={() => { setSelectedCategories([]); setSelectedPriceRanges([]); setSelectedFilters({}); }}
                                    className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold hover:text-luxury-black transition-colors"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>
                        <div className="text-[10px] font-medium text-gray-400 mb-6 uppercase tracking-widest flex-shrink-0 border-b border-gray-100 pb-4">
                            {filteredProducts.length} DESIGNS FOUND
                        </div>

                        {/* Scrollable Accords Array */}
                        <div className="flex-1 overflow-y-auto w-full no-scrollbar pr-2 pb-8">
                            {renderSidebarContent()}
                        </div>
                    </div>

                    {/* Right Product Grid */}
                    <div className="flex-1 min-w-0 w-full">
                        {filteredProducts.length > 0 ? (
                            <div className="relative">
                                <style>{`
                                    .shop-grid-dynamic {
                                        display: grid;
                                        grid-template-columns: repeat(${siteSettings.gridSettings?.mobile || 2}, minmax(0, 1fr));
                                        gap: 2.5rem 1rem;
                                    }
                                    @media (min-width: 640px) {
                                        .shop-grid-dynamic {
                                            grid-template-columns: repeat(${siteSettings.gridSettings?.tablet || 2}, minmax(0, 1fr));
                                            gap: 4rem 2rem;
                                        }
                                    }
                                    @media (min-width: 1024px) {
                                        .shop-grid-dynamic {
                                            grid-template-columns: repeat(${siteSettings.gridSettings?.desktop || 4}, minmax(0, 1fr));
                                            gap: 5rem 2rem;
                                        }
                                    }
                                `}</style>
                                <div className="shop-grid-dynamic w-full">
                                    {filteredProducts.map(product => (
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
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="py-32 flex flex-col items-center justify-center text-center space-y-6 bg-gray-50 rounded-2xl border border-gray-100">
                                <h3 className="font-serif text-3xl italic text-gray-300">No matches found.</h3>
                                <p className="text-sm text-gray-400">Try adjusting your filters or search query.</p>
                                <button
                                    onClick={() => { setSelectedCategories([]); setSelectedPriceRanges([]); setSelectedFilters({}); setSearchQuery(''); }}
                                    className="px-8 py-4 bg-white border border-gray-200 uppercase text-xs font-bold tracking-widest rounded transition-colors hover:border-black"
                                >
                                    Clear All Filters
                                </button>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Shop;
