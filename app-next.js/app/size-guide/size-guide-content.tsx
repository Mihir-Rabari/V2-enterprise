'use client';

/**
 * Size Guide page content — Next.js port of frontend/pages/SizeGuide.tsx
 * (Vite).
 *
 * Client component, exactly like the source: framer-motion entrance/while-
 * in-view animations plus programmatic navigation. Router swaps are the only
 * behavioral translation required:
 *   - useNavigate()  (react-router)  → useRouter() (next/navigation)
 *   - navigate(-1)                   → router.back()
 *   - navigate('/contact')           → router.push('/contact')
 *
 * All chart data, copy, and styling are ported verbatim from the source.
 * The server-side `app/size-guide/page.tsx` wrapper owns the metadata
 * (replacing the absent Vite usePageMeta call with the SEO-audit-recommended
 * title/canonical) and renders this component.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Info, Ruler, Scissors, Shirt } from 'lucide-react';
import { useRouter } from 'next/navigation';

const SizeGuideContent: React.FC = () => {
    const router = useRouter();

    const sizeCharts = [
        {
            category: "Men's Shirts & Tops",
            description: "Regular Fit / Slim Fit",
            headers: ["Size", "Chest (in)", "Waist (in)", "Shoulder (in)"],
            rows: [
                ["S", "36-38", "30-32", "17.5"],
                ["M", "39-41", "33-35", "18.5"],
                ["L", "42-44", "36-38", "19.5"],
                ["XL", "45-47", "39-41", "20.5"],
                ["XXL", "48-50", "42-44", "21.5"]
            ]
        },
        {
            category: "Trousers & Chinos",
            description: "Waist measurement in inches",
            headers: ["Size", "Waist (in)", "Hip (in)", "Inseam (in)"],
            rows: [
                ["30", "30", "36-37", "32"],
                ["32", "32", "38-39", "32"],
                ["34", "34", "40-41", "34"],
                ["36", "36", "42-43", "34"],
                ["38", "38", "44-45", "34"]
            ]
        }
    ];

    return (
        <div className="bg-[#F6F3EF] min-h-screen font-sans pb-32">
            {/* Header */}
            <div className="max-w-[1800px] mx-auto px-6 py-8 flex items-center justify-between sticky top-0 bg-[#F6F3EF]/80 backdrop-blur-md z-[50]">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.3em] text-[#2A1E17] hover:text-luxury-gold transition-colors group"
                >
                    <div className="w-8 h-8 rounded-full border border-[#2A1E17]/10 flex items-center justify-center group-hover:border-luxury-gold transition-colors">
                        <ChevronLeft size={14} strokeWidth={1.5} />
                    </div>
                    <span>Back</span>
                </button>
                <div className="flex items-center gap-2 text-[9px] font-bold text-[#2A1E17] uppercase tracking-widest">
                    <Ruler size={14} className="text-luxury-gold" />
                    <span>Measurement Guide</span>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 pt-12 space-y-24">
                {/* Hero section */}
                <div className="text-center space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2"
                    >
                        <span className="text-luxury-gold text-[11px] font-bold uppercase tracking-[0.4em] block text-center">Foundational Fit</span>
                        <h1 className="font-serif text-5xl md:text-7xl italic leading-[1.1] text-[#2A1E17] tracking-tighter">
                            Size Guide &amp;<br />Proportions
                        </h1>
                    </motion.div>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-sm text-luxury-charcoal/60 max-w-lg mx-auto leading-relaxed"
                    >
                        Ensure the perfect silhouette with our comprehensive measurement guide. Our garments are crafted to provide a sophisticated fit that complements your form.
                    </motion.p>
                </div>

                {/* Charts */}
                <div className="space-y-16">
                    {sizeCharts.map((chart, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: idx * 0.1 }}
                            className="space-y-8"
                        >
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#2A1E17]/10 pb-6 gap-4">
                                <div className="space-y-1">
                                    <h3 className="font-serif text-3xl italic text-[#2A1E17]">{chart.category}</h3>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold">{chart.description}</p>
                                </div>
                                <div className="flex items-center gap-2 text-luxury-charcoal/40">
                                    <Scissors size={14} />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">Master Craftsman Cut</span>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr>
                                            {chart.headers?.map((header, hIdx) => (
                                                <th key={hIdx} className="py-4 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#2A1E17]/40 border-b border-[#2A1E17]/5">{header}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {chart.rows?.map((row, rIdx) => (
                                            <tr key={rIdx} className="group hover:bg-white/40 transition-colors">
                                                {row.map((cell, cIdx) => (
                                                    <td key={cIdx} className={`py-6 px-4 text-[12px] font-bold tracking-widest border-b border-[#2A1E17]/5 ${cIdx === 0 ? 'text-[#2A1E17]' : 'text-luxury-charcoal/60'}`}>
                                                        {cell}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Measuring Tips */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
                    <div className="p-8 bg-white/50 backdrop-blur-sm border border-[#2A1E17]/5 rounded-3xl space-y-4">
                        <div className="w-10 h-10 bg-luxury-gold/10 rounded-full flex items-center justify-center text-luxury-gold">
                            <Shirt size={20} strokeWidth={1.5} />
                        </div>
                        <h4 className="text-[11px] font-bold uppercase tracking-luxury text-[#2A1E17]">Chest</h4>
                        <p className="text-[10px] text-luxury-charcoal/60 leading-relaxed uppercase tracking-widest">Measure around the fullest part of your chest, keeping the tape horizontal.</p>
                    </div>
                    <div className="p-8 bg-white/50 backdrop-blur-sm border border-[#2A1E17]/5 rounded-3xl space-y-4">
                        <div className="w-10 h-10 bg-luxury-gold/10 rounded-full flex items-center justify-center text-luxury-gold">
                            <Scissors size={20} strokeWidth={1.5} />
                        </div>
                        <h4 className="text-[11px] font-bold uppercase tracking-luxury text-[#2A1E17]">Waist</h4>
                        <p className="text-[10px] text-luxury-charcoal/60 leading-relaxed uppercase tracking-widest">Measure around your natural waistline, where your trousers usually sit.</p>
                    </div>
                    <div className="p-8 bg-white/50 backdrop-blur-sm border border-[#2A1E17]/5 rounded-3xl space-y-4">
                        <div className="w-10 h-10 bg-luxury-gold/10 rounded-full flex items-center justify-center text-luxury-gold">
                            <Ruler size={20} strokeWidth={1.5} />
                        </div>
                        <h4 className="text-[11px] font-bold uppercase tracking-luxury text-[#2A1E17]">Arm Length</h4>
                        <p className="text-[10px] text-luxury-charcoal/60 leading-relaxed uppercase tracking-widest">Measure from the center back of your neck to your wrist bone.</p>
                    </div>
                </div>

                {/* Footer Note */}
                <div className="bg-luxury-black p-10 rounded-3xl text-center space-y-6">
                    <Info size={24} className="text-luxury-gold mx-auto" strokeWidth={1.5} />
                    <div className="space-y-2">
                        <h4 className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.4em]">Still Unsure?</h4>
                        <p className="text-white/60 text-xs leading-relaxed max-w-md mx-auto">
                            Our concierge team is available to assist you with personalized sizing advice and garment details.
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/contact')}
                        className="px-8 py-3 bg-white text-luxury-black text-[9px] font-bold uppercase tracking-[0.3em] hover:bg-luxury-gold hover:text-white transition-all duration-500 rounded-sm"
                    >
                        Contact Concierge
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SizeGuideContent;
