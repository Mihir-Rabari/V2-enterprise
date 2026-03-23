import React from 'react';
import { motion } from 'framer-motion';
import { MarqueeItem } from '../../types';

const MarqueeSection: React.FC<{ items: MarqueeItem[] }> = ({ items }) => {
    return (
        <div className="bg-luxury-black py-4 md:py-8 border-y border-white/10 overflow-hidden flex relative z-20">
            <motion.div
                className="flex whitespace-nowrap gap-8 md:gap-32"
                animate={{ x: [0, -1000] }}
                transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
            >
                {[...items, ...items, ...items, ...items].map((item, i) => (
                    <span key={i} className="text-white text-base sm:text-lg md:text-xl lg:text-xl font-medium uppercase tracking-tighter opacity-80 font-serif italic">
                        {item.text} <span className="text-luxury-gold mx-4 md:mx-8">•</span>
                    </span>
                ))}
            </motion.div>
        </div>
    );
};

export default MarqueeSection;
