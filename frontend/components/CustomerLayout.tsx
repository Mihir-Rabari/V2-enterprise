import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './Navbar';
import Footer from './Footer';
import LoadingBar from './LoadingBar';
import Toast from './Toast';
import QuickView from './QuickView';
import { useCart } from '../context/CartContext';
import { contentAPI } from '../lib/apiClient';
import { useSettings } from '../context/SettingsContext';
import { SiteSettings } from '../types';
import { useInitialLoad } from '../context/InitialLoadContext';
// No initialData imports allowed. 100% dynamic.

interface CustomerLayoutProps {
    onSwitchToAdmin: () => void;
}

const CustomerLayout: React.FC<CustomerLayoutProps> = ({ onSwitchToAdmin }) => {
    const location = useLocation();
    const { toast, hideToast } = useCart();
    const { isInitialLoad, setIsInitialLoad } = useInitialLoad();
    const { settings: siteSettings } = useSettings();

    useEffect(() => {
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
        setTimeout(() => {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }, 0);

        // FALLBACK: If we are NOT on the home page, the Home.tsx video trigger won't fire.
        // We should automatically clear the splash after a standard premium delay.
        if (location.pathname !== '/') {
            const timer = setTimeout(() => setIsInitialLoad(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [location.pathname, setIsInitialLoad]);

    // Dynamic Taglines Logic
    const [taglines, setTaglines] = React.useState<{ text: string }[]>([]);

    useEffect(() => {
        contentAPI.getByType('TAGLINE')
            .then(res => {
                if (res.data.success && res.data.data && res.data.data.length > 0) {
                    setTaglines(res.data.data.map((t: any) => ({ text: t.text || t.title || "V2 Enterprise — Defining Modern Heritage" })));
                } else {
                    setTaglines([{ text: "" }]);
                }
            })
            .catch(err => {
                console.error('Error fetching taglines:', err);
                setTaglines([{ text: "" }]);
            });
    }, []);

    const [currentTaglineIndex, setCurrentTaglineIndex] = React.useState(0);

    useEffect(() => {
        if (taglines.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentTaglineIndex((prev) => (prev + 1) % taglines.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [taglines]);

    return (
        <div className="min-h-screen bg-white text-luxury-black font-sans flex flex-col">
            <AnimatePresence>
                {isInitialLoad && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                        className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center space-y-8"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="flex flex-col items-center gap-6"
                        >
                            {siteSettings.logoImage ? (
                                <img src={siteSettings.logoImage} alt={siteSettings.logoText} className="h-16 sm:h-20 w-auto object-contain" />
                            ) : (
                                <img src="/v2_logo.webp" width="1188" height="183" alt="V2 Logo" className="h-16 sm:h-20 w-auto object-contain" />
                            )}
                            <div className="w-12 h-[1px] bg-luxury-gold/30" />
                        </motion.div>
                        <div className="absolute bottom-20 flex flex-col items-center gap-4">
                            <span className="text-[8px] font-bold tracking-[0.3em] uppercase text-gray-300">Smart Fashion Hub</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <LoadingBar />

            <div className="bg-luxury-black text-white text-[8px] sm:text-[9px] text-center py-3 sm:py-2.5 font-bold uppercase tracking-[0.1em] sm:tracking-[0.3em] z-[60] px-6 min-h-[40px] flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentTaglineIndex}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="w-full max-w-4xl leading-relaxed"
                    >
                        {taglines[currentTaglineIndex]?.text}
                    </motion.div>
                </AnimatePresence>
            </div>

            <Navbar onSwitchToAdmin={onSwitchToAdmin} />

            <main className="flex-grow relative min-h-screen">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>

            <Footer onSwitchToAdmin={onSwitchToAdmin} />

            <QuickView />

            <Toast
                message={toast.message}
                isVisible={toast.isVisible}
                onClose={hideToast}
                type={toast.type}
            />
        </div>
    );
};

export default CustomerLayout;
