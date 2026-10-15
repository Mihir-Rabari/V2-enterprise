'use client';

/**
 * Next.js port of frontend/components/home/EssentialsSection.tsx
 *
 * Adaptations for the Next.js app (behavior-identical):
 *  - `displayFeatured` typed with the merged `ApiProduct` instead of `any[]`
 *    (strict tsc); the home page already derives it from `useProducts()`.
 *  - `homeSections` typed with the merged `HomeSectionContent` plus the two
 *    optional fields this section reads (`essentialsTagline` /
 *    `essentialsTitle`) — the Vite source accessed them through an `any` prop;
 *    the runtime settings shape is unchanged.
 *
 * Preserved verbatim: the search input, mobile filter trigger with active-count
 * badge, sort dropdown, "N Pieces Available" counter, the sticky desktop
 * filter sidebar (rendered via the `renderEssentialsSidebarContent` callback),
 * the AnimatePresence grid/empty-state swap and the no-matches empty state.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, ChevronDown, ArrowRight } from 'lucide-react';
import ProductCard from '../ProductCard';
import { ApiProduct } from '../../hooks/useProducts';
import { HomeSectionContent } from '../../types';

interface EssentialsSectionProps {
    homeSections: HomeSectionContent & { essentialsTagline?: string; essentialsTitle?: string };
    displayFeatured: ApiProduct[];
    essentialsSearchQuery: string;
    setEssentialsSearchQuery: (q: string) => void;
    activeEssentialsFilterCount: number;
    setIsMobileFiltersOpen: (o: boolean) => void;
    essentialsSortBy: string;
    setEssentialsSortBy: (s: string) => void;
    renderEssentialsSidebarContent: () => React.ReactNode;
}

const EssentialsSection: React.FC<EssentialsSectionProps> = ({
    homeSections,
    displayFeatured,
    essentialsSearchQuery,
    setEssentialsSearchQuery,
    activeEssentialsFilterCount,
    setIsMobileFiltersOpen,
    essentialsSortBy,
    setEssentialsSortBy,
    renderEssentialsSidebarContent
}) => {

    return (
        <section key="essentials" className="py-12 md:py-20 bg-white">
            <div className="max-w-[1800px] mx-auto px-6 lg:px-12">
                <div className="flex flex-col gap-10 mb-10">
                    <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-8">
                        <div className="space-y-4 text-center md:text-left">
                            <span className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.4em] block">
                                {homeSections.essentialsTagline || 'The Collection'}
                            </span>
                            <h2 className="font-serif text-5xl md:text-7xl italic text-luxury-black tracking-tighter">
                                {homeSections.essentialsTitle || 'Curated Essentials'}
                            </h2>
                        </div>
                        <div className="flex items-center gap-6 w-full md:w-auto">
                            <div className="relative flex-1 md:w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search the collection..."
                                    className="w-full bg-gray-50 border-none px-12 py-4 text-[11px] font-bold uppercase tracking-widest focus:ring-1 focus:ring-luxury-gold outline-none transition-all placeholder:text-gray-300"
                                    value={essentialsSearchQuery}
                                    onChange={(e) => setEssentialsSearchQuery(e.target.value)}
                                />
                                {essentialsSearchQuery && (
                                    <button onClick={() => setEssentialsSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-luxury-black">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setIsMobileFiltersOpen(true)}
                                className="lg:hidden flex items-center justify-center gap-2 bg-gray-50 text-luxury-black border border-gray-200 px-5 py-4 text-[10px] font-bold uppercase tracking-widest hover:border-luxury-gold transition-all"
                            >
                                <Filter size={14} />
                                <span className="hidden xs:inline">Filters</span>
                                {activeEssentialsFilterCount > 0 && <span className="bg-luxury-gold text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px]">{activeEssentialsFilterCount}</span>}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-y border-gray-100 py-6">
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-luxury-gold bg-luxury-gold/5 px-4 py-2 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-luxury-gold animate-pulse" />
                                {displayFeatured.length} Pieces Available
                            </div>
                        </div>
                        <div className="hidden lg:flex items-center gap-4">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sort:</span>
                            {/* appearance-none + explicit chevron: the bare native <select> shipped with the OS
                                arrow AND a pr-8 reserve for a custom chevron that was never rendered. */}
                            <div className="relative flex items-center">
                                <select
                                    className="appearance-none bg-transparent border-none text-[10px] font-bold uppercase tracking-widest focus:ring-0 cursor-pointer text-luxury-black hover:text-luxury-gold transition-colors pr-5"
                                    value={essentialsSortBy}
                                    onChange={(e) => setEssentialsSortBy(e.target.value)}
                                >
                                    <option value="Newest">Newest</option>
                                    <option value="Price: Low to High">Price: Low to High</option>
                                    <option value="Price: High to Low">Price: High to Low</option>
                                    <option value="Trending">Trending</option>
                                </select>
                                <ChevronDown size={12} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-luxury-gold" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-16">
                    <aside className="hidden lg:block w-72 shrink-0 space-y-10 sticky top-32 h-fit max-h-[calc(100vh-160px)] overflow-y-auto pr-4 scrollbar-hide">
                        {renderEssentialsSidebarContent()}
                    </aside>

                    <div className="flex-1">
                        <AnimatePresence initial={false}>
                            {displayFeatured.length > 0 ? (
                                <motion.div
                                    key="essentials-grid"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-10 gap-y-12 md:gap-y-16"
                                >
                                    {displayFeatured.map((product) => (
                                        <ProductCard
                                            key={product.id}
                                            id={product.id}
                                            name={product.name}
                                            price={product.price}
                                            image={product.photo}
                                            hoverImage={product.photos?.[1]}
                                            category={product.category?.name || product.mainCategory}
                                            isTrending={product.isTrending}
                                            isNewArrival={product.isNewArrival}
                                            sizes={product.sizes}
                                            theme="light"
                                        />
                                    ))}
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="py-24 text-center space-y-6"
                                >
                                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8">
                                        <Search size={32} className="text-gray-200" />
                                    </div>
                                    <h3 className="font-serif text-4xl italic text-luxury-black">No matches found.</h3>
                                    <p className="text-gray-400 max-w-sm mx-auto text-sm leading-relaxed">
                                        We couldn't find any pieces matching your current filters. Try adjusting your search or clearing the selection.
                                    </p>
                                    <button
                                        onClick={() => { setEssentialsSearchQuery(''); }}
                                        className="inline-block border-b border-luxury-gold pb-1 text-[10px] font-bold uppercase tracking-widest text-luxury-gold hover:text-luxury-black hover:border-luxury-black transition-all"
                                    >
                                        View Full Collection
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default EssentialsSection;
