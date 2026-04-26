import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
// No initialData imports allowed. 100% dynamic.
import { SiteSettings } from '../types';
import { categoriesAPI, settingsAPI } from '../lib/apiClient';
import { useState, useEffect } from 'react';

const Categories: React.FC = () => {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [siteSettings, setSiteSettings] = useState<SiteSettings>({} as SiteSettings);

    useEffect(() => {
        categoriesAPI.getAll()
            .then(res => {
                const allCats = res.data.data ?? [];
                // ONLY show categories that don't have a parentId (Main Categories)
                setCategories(allCats.filter((c: any) => !c.parentId || c.parentId === "" || c.parentId === null));
                setLoading(false);
            })
            .catch(() => setLoading(false));

        settingsAPI.get().then(res => {
            if (res.data.success && res.data.data) {
                setSiteSettings(res.data.data);
            }
        }).catch(err => console.error(err));
    }, []);

    return (
        <div className="bg-white min-h-screen animate-fade-in">
            {/* Header */}
            <div className="py-24 md:py-32 bg-luxury-gray border-b border-gray-100 flex flex-col items-center">
                <div className="max-w-2xl w-full px-6 text-center space-y-6">
                    <span className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.4em] block">The Repository</span>
                    <h1 className="font-serif text-6xl md:text-8xl italic text-luxury-black leading-none tracking-tighter">Collections</h1>
                </div>
            </div>

            {/* Category Grid */}
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
                    {categories.map((category, idx) => (
                        <motion.div
                            key={category.title}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="group"
                        >
                            <Link to={`/${encodeURIComponent(category.name || category.title)}`} className="block space-y-8">
                                <div className="relative aspect-[16/9] overflow-hidden bg-luxury-gray rounded-sm">
                                    <img
                                        src={category.image || category.photo || 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=800'}
                                        alt={category.name || category.title}
                                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000 ease-out"
                                    />
                                    <div className="absolute inset-0 group-hover:bg-transparent transition-colors duration-500" />
                                    <div className="absolute bottom-8 left-8 flex items-center gap-4 text-white">
                                        <div className="w-12 h-[1px] bg-white group-hover:w-20 transition-all duration-500" />
                                        <span className="text-[10px] font-bold uppercase tracking-[0.5em]">Explore</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-end border-b border-gray-50 pb-8 group-hover:border-luxury-gold transition-colors duration-500">
                                    <div className="space-y-4">
                                        <span className="text-luxury-gold text-[9px] font-bold uppercase tracking-[0.3em]">0{idx + 1}</span>
                                        <h2 className="font-serif text-4xl md:text-5xl italic text-luxury-black tracking-tighter">
                                            {category.name || category.title}
                                        </h2>
                                    </div>
                                    <ArrowRight size={20} strokeWidth={1} className="text-luxury-gold group-hover:translate-x-4 transition-transform duration-500" />
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Newsletter Overlay Section */}
        </div>
    );
};

export default Categories;
