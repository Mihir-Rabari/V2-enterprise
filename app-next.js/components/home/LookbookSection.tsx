'use client';

/**
 * Next.js port of frontend/components/home/LookbookSection.tsx
 *
 * Adaptations for the Next.js app (behavior-identical):
 *  - `Link` from next/link (`to` → `href`) instead of react-router-dom.
 *  - The Vite prop was `lookbookItems: any[]`; here it is typed with a minimal
 *    local interface reflecting what the LOOKBOOK_ITEM content API actually
 *    returns and what this section reads (`title` is used by the markup — the
 *    merged `LookbookItem` type models a different, caption-based shape, so
 *    the local type keeps strict tsc green without changing any data flow).
 */

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { getOptimizedImageUrl } from '../../utils/mediaUtils';

export interface LookbookEntry {
    id: string | number;
    image: string;
    title?: string;
    caption?: string;
}

interface LookbookSectionProps {
    lookbookItems: LookbookEntry[];
}

const LookbookSection: React.FC<LookbookSectionProps> = ({ lookbookItems }) => {
    return (
        <section className="py-24 md:py-32 bg-stone-50 overflow-hidden">
            <div className="max-w-[1800px] mx-auto px-6 lg:px-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {lookbookItems.slice(0, 4).map((item, i) => (
                        <Link href={`/lookbook/${item.id}`} key={i} className="group relative aspect-[3/4] overflow-hidden">
                            <motion.img
                                whileHover={{ scale: 1.05 }}
                                transition={{ duration: 1.2 }}
                                src={getOptimizedImageUrl(item.image, { width: 600, quality: 75 })}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="bg-white/90 p-4 backdrop-blur-sm flex items-center gap-3">
                                    <span className="text-[10px] font-bold uppercase tracking-widest">{item.title}</span>
                                    <ArrowUpRight size={14} />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default LookbookSection;
