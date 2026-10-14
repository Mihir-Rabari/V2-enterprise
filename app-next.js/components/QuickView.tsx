'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, ArrowRight, Loader2 } from 'lucide-react';
import { useQuickView } from '../context/QuickViewContext';
import { useCart } from '../context/CartContext';
import Link from 'next/link';
import { api } from '../lib/apiClient';

const QuickView: React.FC = () => {
    const { selectedProductId, closeQuickView } = useQuickView();
    const { addToCart } = useCart();

    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [selectedSize, setSelectedSize] = useState('');
    const [selectedImg, setSelectedImg] = useState('');

    // Fetch product from API whenever the selected ID changes
    useEffect(() => {
        if (!selectedProductId) {
            setProduct(null);
            return;
        }
        setLoading(true);
        setProduct(null);
        api.get(`/products/${selectedProductId}`)
            .then(res => {
                const p = res.data?.data ?? res.data;
                setProduct(p);
                // Pre-select first size variant
                const firstVariant = p?.variants?.[0];
                setSelectedSize(firstVariant?.size || '');
                // Use main photo as initial image
                setSelectedImg(p?.photo || '');
            })
            .catch(() => setProduct(null))
            .finally(() => setLoading(false));
    }, [selectedProductId]);

    if (!selectedProductId) return null;

    const allImages = product
        ? [product.photo, ...(product.photos || []), product.hoverImage].filter(Boolean)
        : [];

    const handleAddToCart = () => {
        if (product) {
            addToCart({ ...product, id: product._id || product.id });
            closeQuickView();
        }
    };

    return (
        <AnimatePresence>
            {selectedProductId && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-12">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-luxury-black/60 backdrop-blur-sm"
                        onClick={closeQuickView}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="relative w-full max-w-5xl bg-white shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px] md:h-[680px]"
                    >
                        {/* Close button */}
                        <button
                            onClick={closeQuickView}
                            className="absolute top-5 right-5 z-20 p-2 bg-white/80 backdrop-blur-md rounded-full text-luxury-black hover:bg-luxury-black hover:text-white transition-all shadow-md"
                        >
                            <X size={18} strokeWidth={1.5} />
                        </button>

                        {/* Left — Image Section */}
                        <div className="w-full md:w-1/2 relative bg-luxury-gray flex flex-col">
                            {loading ? (
                                <div className="flex-1 flex items-center justify-center text-luxury-gold">
                                    <Loader2 size={36} className="animate-spin" />
                                </div>
                            ) : product ? (
                                <>
                                    <div className="flex-1 overflow-hidden">
                                        <img
                                            src={selectedImg || product.photo}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    {/* Thumbnail strip */}
                                    {allImages.length > 1 && (
                                        <div className="flex gap-2 p-3 bg-white border-t border-gray-100 overflow-x-auto">
                                            {allImages.map((img: string, i: number) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setSelectedImg(img)}
                                                    className={`w-14 h-14 flex-shrink-0 rounded overflow-hidden border-2 transition-all ${selectedImg === img ? 'border-luxury-gold' : 'border-transparent hover:border-gray-300'}`}
                                                >
                                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {product.isNew && (
                                        <div className="absolute top-6 left-6 bg-luxury-gold text-white text-[9px] font-bold uppercase tracking-luxury-widest px-4 py-1.5 shadow-lg z-10">
                                            New Collection
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-gray-300 text-sm font-bold uppercase tracking-widest">
                                    Product not found
                                </div>
                            )}
                        </div>

                        {/* Right — Content Section */}
                        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center space-y-6 overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center gap-3 text-gray-400 text-sm animate-pulse">
                                    <Loader2 size={18} className="animate-spin" />
                                    Loading product details...
                                </div>
                            ) : product ? (
                                <>
                                    <div className="space-y-3">
                                        <span className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.4em]">
                                            {product.subCategory || product.mainCategory}
                                        </span>
                                        <h2 className="font-serif text-3xl md:text-4xl italic text-luxury-black tracking-tighter leading-tight">
                                            {product.name}
                                        </h2>
                                        <div className="flex items-center gap-4">
                                            <p className="text-2xl font-bold text-luxury-black">
                                                ₹{Number(product.price).toLocaleString()}
                                            </p>
                                            {product.originalPrice && product.originalPrice > product.price && (
                                                <p className="text-base text-gray-400 line-through">
                                                    ₹{Number(product.originalPrice).toLocaleString()}
                                                </p>
                                            )}
                                            {product.discount && (
                                                <span className="text-[10px] font-bold text-luxury-gold bg-luxury-gold/10 px-2 py-0.5 rounded">
                                                    {product.discount}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {product.description && (
                                        <p className="text-gray-500 font-serif italic text-base leading-relaxed line-clamp-3">
                                            {product.description}
                                        </p>
                                    )}

                                    {/* Size/Variant Selection */}
                                    {product.variants && product.variants.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                Available Sizes
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {product.variants.map((v: any) => {
                                                    const outOfStock = v.quantity <= 0;
                                                    return (
                                                        <button
                                                            key={v.size}
                                                            onClick={() => !outOfStock && setSelectedSize(v.size)}
                                                            disabled={outOfStock}
                                                            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all duration-200 border relative ${outOfStock
                                                                    ? 'border-gray-100 text-gray-200 cursor-not-allowed line-through'
                                                                    : selectedSize === v.size
                                                                        ? 'bg-luxury-black text-white border-luxury-black'
                                                                        : 'border-gray-200 text-gray-500 hover:border-luxury-gold hover:text-luxury-black'
                                                                }`}
                                                        >
                                                            {v.size}
                                                            {outOfStock && (
                                                                <span className="text-[7px] block leading-none text-gray-300 normal-case no-underline">
                                                                    sold out
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Color info */}
                                    {product.color && (
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Color:</span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-luxury-black">{product.color}</span>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                        <button
                                            onClick={handleAddToCart}
                                            className="flex-1 bg-luxury-black text-white py-4 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-luxury-gold transition-all shadow-xl flex items-center justify-center gap-2"
                                        >
                                            <ShoppingBag size={14} /> Add to Cart
                                        </button>
                                        <Link
                                            href={`/product/${product._id || product.id}`}
                                            onClick={closeQuickView}
                                            className="flex-1 border border-luxury-black text-luxury-black py-4 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-luxury-black hover:text-white transition-all flex items-center justify-center gap-2"
                                        >
                                            Full Details <ArrowRight size={14} />
                                        </Link>
                                    </div>
                                </>
                            ) : (
                                <p className="text-gray-400 text-sm">Could not load product details.</p>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default QuickView;
