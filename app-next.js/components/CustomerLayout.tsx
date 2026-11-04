'use client';

import React, { useEffect, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './Navbar';
import Footer from './Footer';
import LoadingBar from './LoadingBar';
import Toast from './Toast';
import QuickView from './QuickView';
import ScrollRestoration from './ScrollRestoration';
import ChatWidget from './chat/ChatWidget';
import { useCart } from '../context/CartContext';
import { contentAPI } from '../lib/apiClient';
import { useSettings } from '../context/SettingsContext';
import { SiteSettings } from '../types';
// No initialData imports allowed. 100% dynamic.

interface CustomerLayoutProps {
    children: React.ReactNode;
    /**
     * Legacy Vite prop: in the SPA this swapped the shell to the admin view.
     * The Next.js route groups own routing now, so it is optional and unused
     * by the pages rendered inside this layout.
     */
    onSwitchToAdmin?: () => void;
}

const CustomerLayout: React.FC<CustomerLayoutProps> = ({ children, onSwitchToAdmin }) => {
    const { toast, hideToast } = useCart();
    const { settings: siteSettings } = useSettings();

    // Scroll handling is delegated to <ScrollRestoration /> (mounted below):
    // forward navigations go to the top, Back/Forward restores the saved
    // position. The previous unconditional scrollTo(0,0) on every pathname
    // change is intentionally removed — it defeated back-button restoration.

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
            <Suspense fallback={null}>
                <ScrollRestoration />
            </Suspense>
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
                {children}
            </main>

            <Footer onSwitchToAdmin={onSwitchToAdmin} />

            <QuickView />

            <ChatWidget />

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
