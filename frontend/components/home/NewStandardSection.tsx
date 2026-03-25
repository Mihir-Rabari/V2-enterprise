import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { getOptimizedImageUrl } from '../../src/utils/mediaUtils';

interface NewStandardSectionProps {
    ns: {
        tagline?: string;
        title?: string;
        description?: string;
        link?: string;
        buttonText?: string;
        image?: string;
        hoverImage?: string;
    };
    newDropProduct?: any;
    isHovered: boolean;
    setIsHovered: (h: boolean) => void;
}

const NewStandardSection: React.FC<NewStandardSectionProps> = ({ ns, newDropProduct, isHovered, setIsHovered }) => {
    return (
        <section className="py-20 md:py-40 max-w-[1600px] mx-auto px-6 lg:px-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 items-center">
                <div className="space-y-6 md:space-y-10 order-2 md:order-1">
                    <span className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.4em] block">{ns.tagline || 'The New Standard'}</span>
                    <h2 className="font-serif text-5xl md:text-6xl lg:text-8xl italic text-luxury-black tracking-tighter leading-[0.85] whitespace-pre-line">
                        {ns.title || 'Elevate Your \n Everyday.'}
                    </h2>
                    <div className="w-24 h-[1px] bg-luxury-gold/50" />
                    <p className="text-gray-500 font-serif italic text-lg md:text-xl max-w-md leading-relaxed">
                        {ns.description || 'Discover the latest additions to our collection. Meticulously crafted for the modern individual who values silence over noise.'}
                    </p>
                    <Link to={ns.link || '/new-arrivals?sort=Newest'} className="inline-block bg-luxury-black text-white px-10 md:px-12 py-4 md:py-5 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-luxury-gold transition-colors text-center w-full md:w-auto">
                        {ns.buttonText || 'The New Collection'}
                    </Link>
                </div>
                <div
                    className="relative aspect-[4/5] md:aspect-square bg-gray-100 overflow-hidden group order-1 md:order-2"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <div className="relative w-full h-full">
                        <motion.img
                            animate={{
                                opacity: isHovered && (ns.hoverImage || newDropProduct?.photos?.[1]) ? 0 : 1,
                                scale: isHovered ? 1.05 : 1
                            }}
                            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                            src={getOptimizedImageUrl(ns.image || newDropProduct?.photo, { width: 800, quality: 75 })}
                            alt={ns.title || 'New Drop'}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                        {(ns.hoverImage || newDropProduct?.photos?.[1]) && (
                            <motion.img
                                initial={{ opacity: 0 }}
                                animate={{
                                    opacity: isHovered ? 1 : 0,
                                    scale: isHovered ? 1.05 : 1
                                }}
                                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                                src={getOptimizedImageUrl(ns.hoverImage || newDropProduct?.photos?.[1], { width: 800, quality: 75 })}
                                alt={`${ns.title || 'New Drop'} hover`}
                                className="absolute inset-0 w-full h-full object-cover"
                                loading="lazy"
                            />
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default NewStandardSection;
