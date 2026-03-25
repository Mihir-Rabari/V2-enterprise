import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { getOptimizedImageUrl } from '../../src/utils/mediaUtils';

interface LookbookSectionProps {
    lookbookItems: any[];
}

const LookbookSection: React.FC<LookbookSectionProps> = ({ lookbookItems }) => {
    return (
        <section className="py-24 md:py-32 bg-stone-50 overflow-hidden">
            <div className="max-w-[1800px] mx-auto px-6 lg:px-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {lookbookItems.slice(0, 4).map((item, i) => (
                        <Link to={`/lookbook/${item.id}`} key={i} className="group relative aspect-[3/4] overflow-hidden">
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
