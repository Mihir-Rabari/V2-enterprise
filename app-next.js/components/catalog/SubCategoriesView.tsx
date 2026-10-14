'use client';

/**
 * SubCategoriesView — Next.js port of frontend/pages/SubCategories.tsx
 * (route `/[category]`, Vite: `<Route path=":category" element={<SubCategories />} />`).
 *
 * Behaviour-identical: client-side categoriesAPI fetch, subcategory resolution
 * by parent name (case-insensitive `parentCategory` / populated `parentId.name`
 * — the legacy "slug resolution"), loading spinner, and the legacy
 * no-subcategories forward to `/${category}/All` (which lands on the
 * `[category]/[subcategory]` Shop route, matching the React Router mapping).
 *
 * Migration notes:
 *  - `useParams` → `category` prop from the route entry (raw segment as the
 *    App Router provides it); display decoding via `safeDecode` (the source
 *    used `decodeURIComponent` directly).
 *  - `<Navigate to={`/${category}/All`} replace />` → a `router.replace()`
 *    side-effect that renders null while forwarding (the App Router has no
 *    render-time <Navigate>). The target is rebuilt as
 *    `/${encodeURIComponent(decodedCategory)}/All`, which produces the same
 *    encoded URL the Vite app navigated to (it interpolated the raw, encoded
 *    route param).
 *  - `Link` from react-router-dom → `Link` from next/link.
 *  - No usePageMeta in the source; the route entry exports generateMetadata
 *    (SEO_AUDIT.md §6: `/[category]` had no legacy title/canonical).
 */

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { categoriesAPI } from '@/lib/apiClient';
import { safeDecode } from '@/lib/paramUtils';
// No initialData imports allowed. 100% dynamic.

export interface SubCategoriesViewProps {
    /** Raw (encoded) route param, as provided by the App Router. */
    category: string;
}

const SubCategories: React.FC<SubCategoriesViewProps> = ({ category }) => {
    const router = useRouter();
    const [subCategories, setSubCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    // Legacy <Navigate> replacement: once the redirect fires, render null (like <Navigate> did).
    const [isRedirecting, setIsRedirecting] = useState(false);
    const { settings: siteSettings } = useSettings();

    const decodedCategory = safeDecode(category);

    useEffect(() => {
        categoriesAPI.getAll()
            .then(res => {
                const allCategories = res.data.data ?? [];
                // Filter to only find subcategories that belong to this main category
                // Or you can match parentCategory name directly
                const subs = allCategories.filter((c: any) =>
                    (c.parentCategory && c.parentCategory.toLowerCase() === decodedCategory.toLowerCase()) ||
                    (c.parentId && c.parentId.name && c.parentId.name.toLowerCase() === decodedCategory.toLowerCase())
                );
                setSubCategories(subs);
                setLoading(false);
            })
            .catch(() => setLoading(false));

    }, [decodedCategory]);

    // If there are no subcategories, immediately forward them to the shop page
    // for this main category. Ensure 'All' is capitalized to match Shop.tsx
    // case-sensitive check.
    useEffect(() => {
        if (subCategories.length === 0 && !loading) {
            router.replace(`/${encodeURIComponent(decodedCategory)}/All`);
            setIsRedirecting(true);
        }
    }, [subCategories, loading, router, decodedCategory]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (isRedirecting) return null;

    return (
        <div className="bg-white min-h-screen animate-fade-in">
            {/* Header */}
            <div className="py-24 md:py-32 bg-luxury-gray border-b border-gray-100 flex flex-col items-center">
                <div className="max-w-2xl w-full px-6 text-center space-y-6">
                    <span className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.4em] block">
                        Category
                    </span>
                    <h1 className="font-serif text-6xl md:text-8xl italic text-luxury-black leading-none tracking-tighter capitalize">
                        {decodedCategory}
                    </h1>
                </div>
            </div>

            {/* SubCategory Grid */}
            <section className="max-w-[1600px] mx-auto px-6 lg:px-12 py-32">
                <style>{`
                    @media (max-width: 767px) {
                        .cat-grid-dynamic {
                            display: grid;
                            grid-template-columns: repeat(1, minmax(0, 1fr));
                            gap: 3rem;
                        }
                    }
                    @media (min-width: 768px) {
                        .cat-grid-dynamic {
                            display: grid;
                            grid-template-columns: repeat(${siteSettings.gridSettings?.tablet || 2}, minmax(0, 1fr));
                            gap: 3rem 2rem;
                        }
                    }
                    @media (min-width: 1024px) {
                        .cat-grid-dynamic {
                            display: grid;
                            grid-template-columns: repeat(${siteSettings.gridSettings?.desktop || 3}, minmax(0, 1fr));
                            gap: 4rem 3rem;
                        }
                    }
                `}</style>
                <div className="cat-grid-dynamic">
                    {/* Map Subcategories */}
                    {subCategories.map((sub, idx) => (
                        <motion.div
                            key={sub.id || sub.name}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="group"
                        >
                            <Link href={`/${encodeURIComponent(decodedCategory)}/${encodeURIComponent(sub.name || sub.title)}`} className="block space-y-8">
                                <div className="relative aspect-[16/9] overflow-hidden bg-luxury-gray rounded-sm">
                                    <img
                                        src={sub.image || sub.photo || 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=800'}
                                        alt={sub.name || sub.title}
                                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000 ease-out"
                                    />
                                    <div className="absolute inset-0 bg-luxury-black/10 group-hover:bg-transparent transition-colors duration-500" />
                                    <div className="absolute bottom-8 left-8 flex items-center gap-4 text-white">
                                        <div className="w-12 h-[1px] bg-white group-hover:w-20 transition-all duration-500" />
                                        <span className="text-[10px] font-bold uppercase tracking-[0.5em]">Explore</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-end border-b border-gray-50 pb-8 group-hover:border-luxury-gold transition-colors duration-500">
                                    <div className="space-y-4">
                                        <span className="text-luxury-gold text-[9px] font-bold uppercase tracking-[0.3em]">0{idx + 1}</span>
                                        <h2 className="font-serif text-4xl md:text-5xl italic text-luxury-black tracking-tighter">
                                            {sub.name || sub.title}
                                        </h2>
                                    </div>
                                    <ArrowRight size={20} strokeWidth={1} className="text-luxury-gold group-hover:translate-x-4 transition-transform duration-500" />
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default SubCategories;
