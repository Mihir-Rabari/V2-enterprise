import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FilterOption {
    label: string;
    value: string;
    subOptions?: FilterOption[];
}

interface FilterAccordionProps {
    title: string;
    options: string[] | FilterOption[];
    selected: string[];
    onToggle: (value: string) => void;
    isPriceRange?: boolean;
    isSort?: boolean;
    currentSort?: string;
    onSortChange?: (value: string) => void;
    isNested?: boolean;
}

const FilterAccordion: React.FC<FilterAccordionProps> = ({
    title,
    options,
    selected,
    onToggle,
    isPriceRange = false,
    isSort = false,
    currentSort,
    onSortChange,
    isNested = false
}) => {
    const [isOpen, setIsOpen] = useState(true);

    const renderOption = (opt: string | FilterOption, depth = 0) => {
        const label = typeof opt === 'string' ? opt : opt.label;
        const value = typeof opt === 'string' ? opt : opt.value;
        const subOptions = typeof opt === 'string' ? [] : opt.subOptions;

        return (
            <div key={value} className="space-y-2">
                <label
                    className={`flex items-center gap-3 cursor-pointer group pb-1 ${depth > 0 ? 'ml-4 border-l border-gray-100 pl-3' : ''}`}
                >
                    <input
                        type="checkbox"
                        checked={selected.includes(value)}
                        onChange={() => onToggle(value)}
                        className="w-4 h-4 rounded border-gray-300 text-luxury-black focus:ring-luxury-black accent-black"
                    />
                    <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${selected.includes(value) ? 'text-luxury-black' : 'text-gray-400 group-hover:text-luxury-black'}`}>
                        {label}
                    </span>
                </label>
                {subOptions && subOptions.length > 0 && subOptions.map(sub => renderOption(sub, depth + 1))}
            </div>
        );
    };

    if (!isSort && !isPriceRange && options.length === 0) return null;

    return (
        <div className="border-b border-gray-100 py-4 w-full">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full text-left font-bold text-[11px] uppercase tracking-widest text-luxury-black bg-transparent outline-none"
            >
                {title}
                <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-4 space-y-3"
                    >
                        {isSort ? (
                            ['Newest', 'Trending', 'Price: Low to High', 'Price: High to Low', 'A - Z', 'Relevance'].map(option => (
                                <label key={option} className="flex items-center gap-3 cursor-pointer group pb-1">
                                    <input
                                        type="radio"
                                        checked={currentSort === option}
                                        onChange={() => onSortChange?.(option)}
                                        className="w-4 h-4 rounded-full border-gray-300 text-luxury-black focus:ring-luxury-black accent-black"
                                    />
                                    <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${currentSort === option ? 'text-luxury-black' : 'text-gray-400 group-hover:text-luxury-black'}`}>
                                        {option}
                                    </span>
                                </label>
                            ))
                        ) : isPriceRange ? (
                            ['Under ₹1000', '₹1000 - ₹2000', 'Over ₹2000'].map(range => (
                                <label key={range} className="flex items-center gap-3 cursor-pointer group pb-1">
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(range)}
                                        onChange={() => onToggle(range)}
                                        className="w-4 h-4 rounded border-gray-300 text-luxury-black focus:ring-luxury-black accent-black"
                                    />
                                    <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${selected.includes(range) ? 'text-luxury-black' : 'text-gray-400 group-hover:text-luxury-black'}`}>
                                        {range}
                                    </span>
                                </label>
                            ))
                        ) : (
                            options.map(opt => renderOption(opt))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FilterAccordion;
