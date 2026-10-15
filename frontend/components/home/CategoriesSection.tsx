import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getOptimizedImageUrl } from '../../src/utils/mediaUtils';

interface CategoriesSectionProps {
    homeSections: any;
    displayCategories: Array<{ title: string; image: string; link: string }>;
}

const CategoriesSection: React.FC<CategoriesSectionProps> = ({ homeSections, displayCategories }) => {
    return (
        <section className="py-12 md:py-16 bg-zinc-50">
            <div className="max-w-[1800px] mx-auto px-6 lg:px-12">
                <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-16 gap-8">
                    <div className="space-y-4 text-center md:text-left">
                        <span className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.4em] block">Discover</span>
                        <h2 className="font-serif text-5xl md:text-6xl italic text-luxury-black tracking-tighter">
                            {homeSections.categoriesTitle}
                        </h2>
                    </div>
                    <Link to="/shop" className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] hover:text-luxury-gold transition-colors pb-2">
                        View All Categories <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                <div className={`flex overflow-x-auto gap-4 snap-x pb-8 -mx-6 px-6 scrollbar-hide md:grid md:grid-cols-${homeSections.categoryColumns || 3} md:gap-6 md:overflow-visible md:mx-0 md:px-0 md:pb-0`}>
                    {displayCategories.map((cat, i) => (
                        <Link to={cat.link} key={i} className="group relative aspect-[3/4] overflow-hidden block min-w-[75vw] md:min-w-0 snap-center md:snap-align-none">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                                className="w-full h-full"
                            >
                                <img
                                    src={getOptimizedImageUrl(cat.image, { width: 600, quality: 75 })}
                                    alt={cat.title}
                                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                                    loading="lazy"
                                />
                                <div className="absolute bottom-8 left-8 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                    <h3 className="text-white font-serif text-4xl italic tracking-tight mb-2 text-shadow-luxury">{cat.title}</h3>
                                    <span className="text-white/80 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2">
                                        Explore <ArrowRight size={12} />
                                    </span>
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default CategoriesSection;
