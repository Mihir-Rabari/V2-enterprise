import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PromotionalSlide } from '../types';
import { resolveLocalAssetUrl } from '../lib/apiClient';
import { getOptimizedImageUrl } from '../src/utils/mediaUtils';

interface PromotionalSliderProps {
    slides: PromotionalSlide[];
}

const PromotionalSlider: React.FC<PromotionalSliderProps> = ({ slides }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [width, setWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1024);

    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (slides.length <= 1) return;
        const currentDuration = slides[currentIndex]?.duration || 5000;

        const timer = setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % slides.length);
        }, currentDuration);

        return () => clearTimeout(timer);
    }, [currentIndex, slides]);

    if (!slides || slides.length === 0) return null;

    const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % slides.length);
    const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);

    const currentSlide = slides[currentIndex];

    const videoUrl = (() => {
        if (width < 640) return currentSlide.mobileUrl || currentSlide.image;
        if (width < 1024) return currentSlide.tabletUrl || currentSlide.image;
        return currentSlide.laptopUrl || currentSlide.image;
    })();

    const isVideo = currentSlide.mediaType === 'video' || videoUrl.toLowerCase().match(/\.(mp4|mov|webm|ogg)$/i);

    return (
        <section className="relative h-[450px] sm:h-[550px] lg:h-[600px] w-full overflow-hidden bg-luxury-gray">
            <AnimatePresence>
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, zIndex: 10 }}
                    exit={{ opacity: 0, zIndex: 0 }}
                    transition={{ duration: 1.2, ease: "easeInOut" }}
                    className="absolute inset-0"
                >
                    <div className="relative h-full w-full">
                        {isVideo ? (
                            <video
                                src={resolveLocalAssetUrl(videoUrl)}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <img
                                src={resolveLocalAssetUrl(getOptimizedImageUrl(currentSlide.image, { width: 1200, quality: 75 }))}
                                alt={currentSlide.title}
                                className="h-full w-full object-cover"
                            />
                        )}
                        <div className="absolute inset-0 bg-black/30" />

                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                            <motion.span
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3, duration: 0.8 }}
                                className="text-white text-[10px] sm:text-[12px] font-bold uppercase tracking-[0.5em] mb-2 sm:mb-6"
                            >
                                {currentSlide.subtitle}
                            </motion.span>

                            <motion.h2
                                initial={{ y: 30, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5, duration: 1 }}
                                className="font-serif text-4xl sm:text-7xl md:text-8xl italic text-white tracking-tighter mb-6 sm:mb-10 max-w-4xl"
                            >
                                {currentSlide.title}
                            </motion.h2>

                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.8, duration: 0.8 }}
                            >
                                <Link
                                    to={currentSlide.link}
                                    className="group relative inline-flex items-center gap-4 bg-white text-luxury-black px-8 sm:px-12 py-4 sm:py-5 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.3em] overflow-hidden transition-all duration-700 hover:text-white"
                                >
                                    <span className="relative z-10 flex items-center gap-3">
                                        {currentSlide.buttonText} <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform duration-500" />
                                    </span>
                                    <div className="absolute inset-0 bg-luxury-gold translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                                </Link>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {slides.length > 1 && (
                <>
                    {/* Controls */}
                    <div className="absolute bottom-10 right-10 flex items-center gap-4 z-20">
                        <button
                            onClick={prevSlide}
                            className="p-3 border border-white/20 text-white rounded-full hover:bg-white hover:text-luxury-black transition-all duration-500 backdrop-blur-sm"
                        >
                            <ChevronLeft size={20} strokeWidth={1.5} />
                        </button>
                        <button
                            onClick={nextSlide}
                            className="p-3 border border-white/20 text-white rounded-full hover:bg-white hover:text-luxury-black transition-all duration-500 backdrop-blur-sm"
                        >
                            <ChevronRight size={20} strokeWidth={1.5} />
                        </button>
                    </div>

                    {/* Progress Dots */}
                    <div className="absolute bottom-10 left-10 flex gap-3 z-20">
                        {slides.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentIndex(i)}
                                className={`h-1 transition-all duration-700 ${i === currentIndex ? 'w-12 bg-luxury-gold' : 'w-4 bg-white/30'}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </section>
    );
};

export default PromotionalSlider;
