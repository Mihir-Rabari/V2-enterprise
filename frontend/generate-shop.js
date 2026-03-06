const fs = require('fs');

const content = `import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Search, ChevronDown, X, Filter, TrendingUp, Sparkles } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { useProducts } from '../hooks/useProducts';
import { settingsAPI } from '../lib/apiClient';
import { initialSiteSettings } from '../data/initialData';
import { SiteSettings } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const FilterAccordion = ({ title, options, selected, onToggle, isPriceRange = false, isSort = false, currentSort, onSortChange }: any) => {
    const [isOpen, setIsOpen] = useState(true);
    if (!isSort && !isPriceRange && options.length === 0) return null;
    
    return (
        <div className="border-b border-gray-100 py-4">
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full text-left font-bold text-[11px] uppercase tracking-widest text-luxury-black bg-transparent outline-none">
                {title}
                <ChevronDown size={14} className={\`transition-transform duration-300 \${isOpen ? 'rotate-180' : ''}\`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4 grid gap-3">
                        {isSort ? (
                           ['Newest', 'Trending', 'Price: Low to High', 'Price: High to Low', 'A - Z'].map(range => (
                                <label key={range} className="flex items-center gap-3 cursor-pointer group">
                                    <input type="radio" checked={currentSort === range} onChange={() => onSortChange(range)} className="w-4 h-4 rounded-full border-gray-300 text-luxury-black focus:ring-luxury-black accent-black" />
                                    <span className="text-sm font-medium text-gray-500 group-hover:text-black transition-colors">{range}</span>
                                </label>
                            ))
                        ) : isPriceRange ? (
                            ['Under ₹1000', '₹1000 - ₹2000', 'Over ₹2000'].map(range => (
                                <label key={range} className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" checked={selected.includes(range)} onChange={() => onToggle(range)} className="w-4 h-4 rounded border-gray-300 text-luxury-black focus:ring-luxury-black accent-black" />
                                    <span className="text-sm font-medium text-gray-500 group-hover:text-black transition-colors">{range}</span>
                                </label>
                            ))
                        ) : (
                            options.map((opt: string) => (
                                <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" checked={selected.includes(opt)} onChange={() => onToggle(opt)} className="w-4 h-4 rounded border-gray-300 text-luxury-black focus:ring-luxury-black accent-black" />
                                    <span className="text-sm font-medium text-gray-500 group-hover:text-black transition-colors">{opt}</span>
                                </label>
                            ))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const Shop: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const queryTerm = searchParams.get('q') || '';
    const initialCategory = searchParams.get('category') || 'All';
    const location = useLocation();
    const isNewArrivalsPage = location.pathname === '/new-arrivals';

    const { products: rawProducts, loading: productsLoading } = useProducts({ status: 'ACTIVE', limit: 500 });
    const [siteSettings, setSiteSettings] = useState<SiteSettings>(initialSiteSettings);

    const products = rawProducts.map(p => ({
        ...p,
        mainCategory: p.category?.parent?.name ?? p.category?.name ?? '',
        subCategory: p.category?.parent ? p.category.name : '',
    }));

    const [selectedCategories, setSelectedCategories] = useState<string[]>(
        initialCategory && initialCategory !== 'All' ? [initialCategory] : []
    );
    const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);
    
    // NEW: Comprehensive Selected Filters
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
    }, []);

    useEffect(() => {
        setSearchQuery(queryTerm);
        // Clear dependent categories on fresh search
        if (queryTerm !== searchQuery) {
           setSelectedCategories([]);
           setSelectedFilters({});
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryTerm]);

    // DERIVATION FUNCTIONS
    const activeCategories = Array.from(new Set(rawProducts.map(p => p.category?.parent?.name || p.category?.name || (p as any).mainCategory || '').filter(Boolean))) as string[];

    const getOptionsFor = (key: string) => {
        if (key === 'color') {
            const colors = new Set<string>();
            rawProducts.forEach(p => {
                if (p.color) colors.add(p.color);
                p.variants?.forEach(v => { if(v.color) colors.add(v.color) });
            });
            return Array.from(colors).sort();
        }
        if (key === 'size') {
            const sizes = new Set<string>();
            rawProducts.forEach(p => {
                p.sizes?.forEach(s => sizes.add(s));
                p.variants?.forEach(v => { if(v.size) sizes.add(v.size) });
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

    Object.entries(selectedFilters).forEach(([key, values]) => {
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

    const activeFilterCount = selectedCategories.length + selectedPriceRanges.length + Object.values(selectedFilters).reduce((acc, curr) => acc + curr.length, 0);

    const renderSidebarContent = () => (
        <div className="w-full">
            <FilterAccordion title="Sort By" isSort currentSort={sortBy} onSortChange={setSortBy} />
            <FilterAccordion title="Product Category" options={activeCategories} selected={selectedCategories} onToggle={toggleCategory} />
            <FilterAccordion title="Price" isPriceRange selected={selectedPriceRanges} onToggle={togglePrice} />
            
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
            <div className="py-8 md:py-12 border-b border-gray-50 flex flex-col items-center">
                <div className="max-w-2xl w-full px-6 space-y-4 md:space-y-6 text-center">
                    <div className="space-y-2 md:space-y-3">
                        <span className="text-luxury-gold text-[9px] sm:text-[10px] font-bold uppercase tracking-luxury-widest flex items-center justify-center gap-2">
                            {isNewArrivalsPage ? <Sparkles size={10} strokeWidth={2} /> : <TrendingUp size={10} strokeWidth={2} />}
                            {isNewArrivalsPage ? 'Featured' : 'Collections'}
                        </span>
                        <h1 className="font-serif text-3xl sm:text-4xl md:text-6xl italic text-luxury-black tracking-tighter">
                            {isNewArrivalsPage ? 'New Collection' : 'Shop Our Collection'}
                        </h1>
                    </div>

                    <div className="relative group max-w-md mx-auto">
                        <input
                            type="text"
                            placeholder="SEARCH FOR STYLES..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-luxury-gray rounded-full px-12 py-3.5 text-[11px] font-bold tracking-luxury-widest focus:outline-none focus:ring-1 focus:ring-luxury-gold transition-all placeholder:text-gray-400 uppercase"
                        />
                        <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={1.5} />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-luxury-black">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Filter & Sort Toggle Row (Sticky) */}
            <div className="lg:hidden sticky top-[72px] z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 py-3">
                <div className="px-6 flex items-center justify-between w-full">
                    <button
                        onClick={() => setIsMobileFiltersOpen(true)}
                        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-luxury-black bg-gray-50 px-5 py-3 rounded border border-gray-200"
                    >
                        <Filter size={14} /> Filters
                        {activeFilterCount > 0 && (
                            <span className="bg-luxury-black text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] ml-1">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                    <div className="text-[10px] font-bold uppercase text-gray-400">
                        {filteredProducts.length} Items
                    </div>
                </div>
            </div>

            {/* Mobile Filters Sidebar */}
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
                                {renderSidebarContent()}
                            </div>

                            <div className="p-5 border-t border-gray-100 bg-white space-y-3">
                                <div className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                                    {filteredProducts.length} Results
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setSelectedCategories([]); setSelectedPriceRanges([]); setSelectedFilters({}); }}
                                        className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 border border-gray-200 rounded"
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

            {/* Main Content Area */}
            <div className="max-w-[1700px] mx-auto px-6 lg:px-12 py-8 lg:py-12">
                <div className="flex items-start gap-10">
                    
                    {/* Left Sidebar (Desktop) */}
                    <div className="hidden lg:block w-[260px] flex-shrink-0 sticky top-[95px] h-[calc(100vh-100px)] overflow-y-auto no-scrollbar pr-5 pb-12">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-xs uppercase tracking-widest">Filters</span>
                            {activeFilterCount > 0 && (
                                <button
                                    onClick={() => { setSelectedCategories([]); setSelectedPriceRanges([]); setSelectedFilters({}); }}
                                    className="text-[9px] font-bold uppercase tracking-widest text-luxury-gold hover:text-luxury-black transition-colors"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>
                        <div className="text-[10px] font-medium text-gray-400 mb-6 uppercase tracking-widest">{filteredProducts.length} Products Found</div>
                        
                        {renderSidebarContent()}
                    </div>

                    {/* Right Grid */}
                    <div className="flex-1 min-w-0">
                        {filteredProducts.length > 0 ? (
                            <div className="relative">
                                <style>{\`
                                    .shop-grid-dynamic {
                                        display: grid;
                                        grid-template-columns: repeat(\${siteSettings.gridSettings?.mobile || 2}, minmax(0, 1fr));
                                        gap: 2.5rem 1rem;
                                    }
                                    @media (min-width: 640px) {
                                        .shop-grid-dynamic {
                                            grid-template-columns: repeat(\${siteSettings.gridSettings?.tablet || 2}, minmax(0, 1fr));
                                            gap: 4rem 2rem;
                                        }
                                    }
                                    @media (min-width: 1024px) {
                                        .shop-grid-dynamic {
                                            grid-template-columns: repeat(\${siteSettings.gridSettings?.desktop || 4}, minmax(0, 1fr));
                                            gap: 5rem 2rem;
                                        }
                                    }
                                \`}</style>
                                <div className="shop-grid-dynamic">
                                    {filteredProducts.map(product => (
                                        <ProductCard
                                            key={product.id}
                                            id={product.id}
                                            name={product.name}
                                            price={product.price}
                                            image={product.photo}
                                            isTrending={product.isTrending}
                                            isNewArrival={product.isNewArrival}
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="py-32 flex flex-col items-center justify-center text-center space-y-6">
                                <h3 className="font-serif text-3xl italic text-gray-300">No matches found.</h3>
                                <p className="text-sm text-gray-400">Try adjusting your filters or search query.</p>
                                <button
                                    onClick={() => { setSelectedCategories([]); setSelectedPriceRanges([]); setSelectedFilters({}); setSearchQuery(''); }}
                                    className="px-6 py-3 border border-gray-200 uppercase text-xs font-bold tracking-widest rounded-full hover:bg-gray-50"
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
`;

fs.writeFileSync('k:/PRO_WORK/v2 - Copy/frontend/pages/Shop.tsx', content);
console.log('Shop.tsx overwritten successfully');
