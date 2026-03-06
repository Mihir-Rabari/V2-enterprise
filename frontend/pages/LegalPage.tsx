import React from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const LegalPage: React.FC = () => {
    const location = useLocation();
    const path = location.pathname.split('/').pop() || '';

    const titles: { [key: string]: string } = {
        'privacy': 'Privacy Protocol',
        'terms': 'Terms of Excellence',
        'shipping': 'Deployment & Logistics',
        'returns': 'Archive & Exchange',
    };

    const title = titles[path] || 'Legal Declaration';

    return (
        <div className="bg-white min-h-screen">
            <div className="py-24 bg-luxury-gray border-b border-gray-100">
                <div className="max-w-[1200px] mx-auto px-6 lg:px-12 space-y-4">
                    <span className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.4em]">Declaration</span>
                    <h1 className="font-serif text-5xl italic text-luxury-black tracking-tighter">{title}</h1>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Last Revised: 16 FEB 2026</p>
                </div>
            </div>

            <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-32">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="prose prose-sm max-w-none space-y-16"
                >
                    <section className="space-y-6">
                        <h2 className="font-serif text-2xl italic text-luxury-black border-b border-luxury-gray pb-4">01. Intent</h2>
                        <p className="text-luxury-charcoal text-sm leading-relaxed tracking-wide">
                            At V2 Fashion, we believe in the transparency of operations. This document outlines our standard procedures and commitments to our collective members. Every transaction and interaction is guided by this manifest to ensure the highest quality of service.
                        </p>
                    </section>

                    <section className="space-y-6">
                        <h2 className="font-serif text-2xl italic text-luxury-black border-b border-luxury-gray pb-4">02. Parameters</h2>
                        <p className="text-luxury-charcoal text-sm leading-relaxed tracking-wide font-medium italic">
                            "Quality is not an act, it is a habit."
                        </p>
                        <p className="text-luxury-charcoal text-sm leading-relaxed tracking-wide">
                            All products retrieved through this portal are subject to rigorous quality verification. We reserve the rights to update these protocols as our collective evolves. By continuing to use our services, you acknowledge the acceptance of these guidelines.
                        </p>
                    </section>

                    <section className="space-y-6">
                        <h2 className="font-serif text-2xl italic text-luxury-black border-b border-luxury-gray pb-4">03. Jurisdiction</h2>
                        <p className="text-luxury-charcoal text-sm leading-relaxed tracking-wide">
                            These declarations are governed by the laws of our operating region. For specific inquiries regarding your membership or data, please contact the Coordinate via the Contact Manifest.
                        </p>
                    </section>
                </motion.div>
            </div>
        </div>
    );
};

export default LegalPage;
