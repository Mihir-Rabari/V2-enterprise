'use client';

/**
 * Next.js port of frontend/components/home/CommitmentSection.tsx
 *
 * Adaptations for the Next.js app (behavior-identical):
 *  - `Link` from next/link (`to` → `href`) instead of react-router-dom.
 *  - `commitment` fields are optional (the home page initializes the state
 *    with `{} as CommitmentContent`, so the section must tolerate missing
 *    values exactly like the Vite runtime did — undefined text renders empty).
 */

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

interface CommitmentSectionProps {
    commitment: {
        tagline?: string;
        title?: string;
        description?: string;
    };
}

const CommitmentSection: React.FC<CommitmentSectionProps> = ({ commitment }) => {
    return (
        <section className="py-32 md:py-60 max-w-[1200px] mx-auto px-6 text-center flex flex-col items-center gap-10">
            <span className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.5em]">{commitment.tagline}</span>
            <h2 className="font-serif text-5xl md:text-7xl lg:text-8xl italic text-luxury-black tracking-tighter leading-tight max-w-4xl">
                {commitment.title}
            </h2>
            <div className="w-px h-24 bg-luxury-gold/50" />
            <p className="text-gray-500 text-xl font-serif italic max-w-2xl leading-relaxed">
                {commitment.description}
            </p>
            <div className="flex gap-12 pt-8">
                <Link href="/about" className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] hover:text-luxury-gold transition-colors">
                    Our Story <ArrowUpRight size={14} className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/contact" className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] hover:text-luxury-gold transition-colors">
                    Visit Studio <ArrowUpRight size={14} className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>
        </section>
    );
};

export default CommitmentSection;
