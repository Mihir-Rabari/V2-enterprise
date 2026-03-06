import React from 'react';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit: () => void;
  submitLabel?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, onSubmit, submitLabel = 'Synchronize' }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-luxury-black/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl mx-auto overflow-hidden relative z-10 border border-white/20"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-10 py-8 border-b border-gray-50 bg-white">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-luxury-gold">Configuration Shell</span>
                <h3 className="font-serif text-2xl italic text-slate-800">{title}</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-gray-50 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-all"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            {/* Content */}
            <div className="p-10 max-h-[75vh] overflow-y-auto custom-scrollbar bg-white">
              {children}
            </div>

            {/* Footer */}
            <div className="px-10 py-8 border-t border-gray-50 flex justify-end gap-4 bg-gray-50/50 backdrop-blur-sm">
              <button
                onClick={onClose}
                className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-all"
              >
                Discard Changes
              </button>
              <button
                onClick={onSubmit}
                className="group relative overflow-hidden bg-luxury-black text-white px-8 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.25em] shadow-xl shadow-black/10 transition-all"
              >
                <div className="relative z-10 flex items-center gap-2">
                  <Check size={14} className="group-hover:scale-110 transition-transform" /> {submitLabel}
                </div>
                <div className="absolute inset-0 bg-luxury-gold translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
