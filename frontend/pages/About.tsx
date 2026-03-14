import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AboutPageContent } from '../types';
import { initialAboutContent } from '../data/initialData';
import { settingsAPI } from '../lib/apiClient';

const About: React.FC = () => {
    const [content, setContent] = useState<AboutPageContent>(initialAboutContent);

    useEffect(() => {
        settingsAPI.get()
            .then(res => {
                if (res.data.success && res.data.data?.aboutContent) {
                    setContent(res.data.data.aboutContent);
                }
            })
            .catch(err => console.error('Error fetching about content:', err));
    }, []);

    return (
        <div className="bg-white min-h-screen">
            {/* Hero Section */}
            <section className="relative h-[70vh] flex items-center justify-center bg-luxury-black overflow-hidden">
                <motion.div
                    initial={{ scale: 1.1, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.4 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute inset-0"
                >
                    <img
                        src={content.heroImage}
                        alt="Heritage"
                        className="w-full h-full object-cover grayscale"
                    />
                </motion.div>
                <div className="relative text-center space-y-6 px-6">
                    <motion.span
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.4em] block"
                    >
                        {content.heroTagline}
                    </motion.span>
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="font-serif text-6xl md:text-8xl italic text-white tracking-tighter whitespace-pre-line leading-[0.85]"
                    >
                        {content.heroTitle}
                    </motion.h1>
                </div>
            </section>

            {/* Philosophy Section */}
            <section className="max-w-[var(--max-width)] mx-auto px-[var(--spacing-gutter)] sm:px-[var(--spacing-gutter-sm)] lg:px-[var(--spacing-gutter-lg)] xl:px-[var(--spacing-gutter-xl)] py-32 lg:py-48">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                    <div className="space-y-12">
                        <div className="space-y-6">
                            <span className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.4em]">{content.visionTagline}</span>
                            <h2 className="font-serif text-4xl md:text-5xl italic text-luxury-black leading-tight tracking-tighter whitespace-pre-line">
                                {content.visionTitle}
                            </h2>
                            <div className="luxury-divider w-12" />
                        </div>
                        <div className="space-y-8 text-luxury-charcoal font-serif italic text-lg leading-relaxed">
                            <p>{content.visionDescription1}</p>
                            <p>{content.visionDescription2}</p>
                        </div>
                    </div>
                    <div className="relative aspect-[3/4] bg-luxury-gray group overflow-hidden">
                        <img
                            src={content.visionImage}
                            alt="The Process"
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                        />
                        <div className="absolute inset-x-8 bottom-8">
                            <span className="text-white text-[9px] font-bold uppercase tracking-[0.3em]">{content.visionArchiveText}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Values Grid */}
            <section className="bg-luxury-gray py-32 lg:py-48 border-y border-gray-100">
                <div className="max-w-[var(--max-width)] mx-auto px-[var(--spacing-gutter)] sm:px-[var(--spacing-gutter-sm)] lg:px-[var(--spacing-gutter-lg)] xl:px-[var(--spacing-gutter-xl)]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-24">
                        {content.values.map((value, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: i * 0.2 }}
                                className="space-y-8 text-center md:text-left"
                            >
                                <span className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.4em]">0{i + 1}</span>
                                <h3 className="font-serif text-3xl italic text-luxury-black">{value.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto md:mx-0 font-serif italic">{value.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer Image */}
            <section className="h-[60vh] overflow-hidden grayscale contrast-[1.1]">
                <img
                    src={content.footerImage}
                    alt="The Silhouette"
                    className="w-full h-full object-cover"
                />
            </section>
        </div>
    );
};

export default About;
