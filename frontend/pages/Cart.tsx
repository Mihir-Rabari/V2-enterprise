import React from 'react';
import { Minus, Plus, X, ArrowRight, ShoppingBag } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';

const Cart: React.FC = () => {
    const navigate = useNavigate();
    const { cart, removeFromCart, updateQuantity, cartTotal: subtotal } = useCart();

    const shipping = 0;
    const total = subtotal + shipping;

    if (cart.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center animate-fade-in bg-white px-6">
                <div className="space-y-8 text-center">
                    <ShoppingBag size={48} strokeWidth={1} className="text-gray-200 mx-auto" />
                    <div className="space-y-3">
                        <h2 className="font-serif text-3xl italic text-luxury-black">Selection is empty.</h2>
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] sm:tracking-luxury-widest text-gray-400">Your curation awaits its first addition.</p>
                    </div>
                    <button
                        onClick={() => navigate('/shop')}
                        className="bg-luxury-black text-white px-12 py-4 text-[10px] font-bold uppercase tracking-luxury-widest hover:bg-luxury-gold transition-colors duration-500"
                    >
                        Return to Exploration
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen">
            <div className="max-w-[1600px] mx-auto px-6 lg:px-12 py-24">
                <div className="mb-12 sm:mb-20 space-y-3 sm:space-y-4">
                    <span className="text-luxury-gold text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.4em]">Your Collection</span>
                    <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl italic text-luxury-black tracking-tighter">Shopping Bag</h1>
                </div>

                <div className="flex flex-col lg:flex-row gap-20 items-start">
                    {/* Items List */}
                    <div className="flex-1 w-full bg-white">
                        <div className="hidden lg:grid grid-cols-12 gap-8 pb-8 border-b border-gray-50 text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">
                            <div className="col-span-6">Object Details</div>
                            <div className="col-span-2 text-center">Unit Price</div>
                            <div className="col-span-2 text-center">Quantity</div>
                            <div className="col-span-2 text-right">Valuation</div>
                        </div>

                        <div className="">
                            <AnimatePresence>
                                {cart.map(item => (
                                    <motion.div
                                        key={`${item.id}-${item.selectedSize}-${item.selectedColor}`}
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        className="grid grid-cols-12 gap-6 lg:gap-8 py-10 items-center border-b border-gray-50 last:border-0"
                                    >
                                        <div className="col-span-12 lg:col-span-6 flex gap-6 lg:gap-10">
                                            <div className="w-24 h-32 bg-luxury-gray flex-shrink-0 group overflow-hidden">
                                                <img src={item.photo} alt={item.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
                                            </div>
                                            <div className="flex flex-col justify-center space-y-3">
                                                <div className="space-y-1">
                                                    <h3 className="font-serif text-2xl italic text-luxury-black">{item.name}</h3>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                        {item.selectedSize && `Dimension: ${item.selectedSize}`}
                                                        {item.selectedSize && item.selectedColor && ' | '}
                                                        {item.selectedColor && `Tone: ${item.selectedColor}`}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.id, item.selectedSize, item.selectedColor)}
                                                    className="text-[9px] font-bold uppercase tracking-widest text-red-900 hover:text-red-500 transition-colors text-left pt-2 inline-flex items-center gap-2 group"
                                                >
                                                    <X size={10} /> Remove Selection
                                                </button>
                                            </div>
                                        </div>

                                        <div className="col-span-4 lg:col-span-2 text-center">
                                            <span className="lg:hidden text-[8px] font-bold uppercase text-gray-400 block mb-2 tracking-widest">Price</span>
                                            <p className="text-sm font-bold text-luxury-charcoal tracking-wide">₹{item.price?.toLocaleString() || '0'}</p>
                                        </div>

                                        <div className="col-span-4 lg:col-span-2 flex flex-col items-center">
                                            <span className="lg:hidden text-[8px] font-bold uppercase text-gray-400 block mb-2 tracking-widest">Qty</span>
                                            <div className="flex items-center border border-gray-100 rounded-full px-4 py-2 bg-white">
                                                <button onClick={() => updateQuantity(item.id, -1, item.selectedSize, item.selectedColor)} className="p-1 hover:text-luxury-gold transition-colors"><Minus size={12} /></button>
                                                <span className="w-8 text-center text-[11px] font-bold">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, 1, item.selectedSize, item.selectedColor)} className="p-1 hover:text-luxury-gold transition-colors"><Plus size={12} /></button>
                                            </div>
                                        </div>

                                        <div className="col-span-4 lg:col-span-2 text-right">
                                            <span className="lg:hidden text-[8px] font-bold uppercase text-gray-400 block mb-2 tracking-widest">Total</span>
                                            <p className="text-sm font-bold text-luxury-black tracking-wide">₹{(item.price * item.quantity)?.toLocaleString() || '0'}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Summary Sidebar */}
                    <div className="lg:w-[450px] w-full lg:sticky lg:top-32">
                        <div className="bg-luxury-gray p-10 lg:p-16 space-y-12">
                            <h2 className="font-serif text-4xl italic text-luxury-black tracking-tight">Summary</h2>

                            <div className="space-y-8">
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-luxury-charcoal">
                                    <span>Subtotal</span>
                                    <span>₹{subtotal?.toLocaleString() || '0'}</span>
                                </div>
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-luxury-charcoal">
                                    <span>Shipping</span>
                                    <span>{shipping === 0 ? 'Complimentary' : `₹${shipping}`}</span>
                                </div>
                                <div className="h-[1px] bg-gray-200" />
                                <div className="flex justify-between text-xl font-bold text-luxury-black">
                                    <span className="font-serif italic tracking-tight">Total</span>
                                    <span className="tracking-tight">₹{total?.toLocaleString() || '0'}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate('/checkout')}
                                className="w-full group relative overflow-hidden bg-luxury-black text-white py-5 sm:py-6 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] transition-all duration-700"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-3">
                                    Proceed to Checkout <ArrowRight size={14} strokeWidth={1} className="group-hover:translate-x-2 transition-transform" />
                                </span>
                                <div className="absolute inset-0 bg-luxury-gold translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                            </button>

                            <p className="text-[9px] font-medium text-gray-400 text-center italic">
                                Duties & taxes included in final valuation.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cart;
