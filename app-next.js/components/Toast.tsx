'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';

interface ToastProps {
    message: string;
    isVisible: boolean;
    onClose: () => void;
    type?: 'success' | 'error';
}

const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose, type = 'success' }) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="fixed bottom-10 right-6 sm:right-12 z-[100]"
                >
                    <div className="bg-white border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-5 sm:p-6 flex items-center gap-4 min-w-[280px]">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${type === 'success' ? 'bg-luxury-gold/10 text-luxury-gold' : 'bg-red-50 text-red-500'}`}>
                            {type === 'success' ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-luxury-widest text-gray-400 mb-0.5">Notification</p>
                            <p className="font-serif text-sm italic text-luxury-black">{message}</p>
                        </div>
                        <button onClick={onClose} className="text-gray-300 hover:text-luxury-black transition-colors">
                            <X size={14} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Toast;
