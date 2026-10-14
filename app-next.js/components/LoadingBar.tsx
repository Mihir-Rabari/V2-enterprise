'use client';

import React, { useEffect, useState } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { usePathname } from 'next/navigation';

const LoadingBar: React.FC = () => {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    const pathname = usePathname();
    const [isNavigating, setIsNavigating] = useState(false);

    useEffect(() => {
        setIsNavigating(true);
        const timer = setTimeout(() => setIsNavigating(false), 800);
        return () => clearTimeout(timer);
    }, [pathname]);

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] h-[2px] pointer-events-none">
            {/* Scroll Progress Bar (Luxury Detail) */}
            <motion.div
                className="absolute inset-0 bg-luxury-gold origin-left opacity-30"
                style={{ scaleX }}
            />

            {/* Navigation Progress Bar */}
            {isNavigating && (
                <motion.div
                    initial={{ width: "0%", opacity: 1 }}
                    animate={{ width: "100%", opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="absolute inset-0 bg-luxury-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]"
                />
            )}
        </div>
    );
};

export default LoadingBar;
