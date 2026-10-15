'use client';

/**
 * Next.js port of frontend/components/home/JournalSection.tsx
 *
 * Adaptations for the Next.js app (behavior-identical):
 *  - `Link` from next/link (`to` → `href`) instead of react-router-dom.
 *  - Props typed with the merged `HomeSectionContent` / `JournalPost` instead
 *    of `any` (strict tsc). `journalTitle` is not declared on the merged
 *    `HomeSectionContent` (the Vite source accessed it through an `any` prop),
 *    so it is added here as an optional field of an intersection type — the
 *    runtime shape of the settings document is unchanged.
 */

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { HomeSectionContent, JournalPost } from '../../types';
import { getOptimizedImageUrl } from '../../utils/mediaUtils';

interface JournalSectionProps {
    homeSections: HomeSectionContent & { journalTitle?: string };
    journalPosts: JournalPost[];
}

const JournalSection: React.FC<JournalSectionProps> = ({ homeSections, journalPosts }) => {
    return (
        <section className="py-12 md:py-20 bg-white">
            <div className="max-w-[1800px] mx-auto px-6 lg:px-12">
                <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-20 gap-8">
                    <div className="space-y-4 text-center md:text-left">
                        <span className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.4em] block">Journal</span>
                        <h2 className="font-serif text-5xl md:text-7xl italic text-luxury-black tracking-tighter">
                            {homeSections.journalTitle}
                        </h2>
                    </div>
                    <Link href="/journal" className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] hover:text-luxury-gold transition-colors pb-2">
                        Read All Stories <ArrowUpRight size={14} className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 md:gap-16">
                    {journalPosts.slice(0, 3).map((post, i) => (
                        <Link href={`/journal/${post.id}`} key={i} className="group">
                            <div className="aspect-[16/10] overflow-hidden mb-8 bg-gray-50">
                                <motion.img
                                    whileHover={{ scale: 1.05 }}
                                    transition={{ duration: 0.8 }}
                                    src={getOptimizedImageUrl(post.image, { width: 800, quality: 75 })}
                                    alt={post.title}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-gray-400">
                                    <span>{post.date}</span>
                                    <span className="w-1 h-1 rounded-full bg-luxury-gold/40" />
                                    <span>{post.category}</span>
                                </div>
                                <h3 className="font-serif text-2xl md:text-3xl italic text-luxury-black group-hover:text-luxury-gold transition-colors leading-tight">
                                    {post.title}
                                </h3>
                                <p className="text-gray-500 text-sm italic font-serif leading-relaxed line-clamp-2">
                                    {post.excerpt}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default JournalSection;
