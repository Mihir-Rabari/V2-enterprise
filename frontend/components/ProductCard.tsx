import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Heart, Eye, TrendingUp, Sparkles, X } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useQuickView } from '../context/QuickViewContext';
import { useAuth } from '../context/AuthContext';
import { wishlistAPI } from '../lib/apiClient';

interface ProductCardProps {
    id: string | number;
    name: string;
    price: number;
    image: string;
    hoverImage?: string;
    category?: string;
    theme?: 'light' | 'dark';
    isTrending?: boolean;
    isNewArrival?: boolean;
    isWishlistPage?: boolean;
    onRemove?: (id: string | number) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ id, name, price, image, hoverImage, category, theme = 'light', isTrending, isNewArrival, isWishlistPage, onRemove }) => {
    const { addToCart, showToast } = useCart();
    const { openQuickView } = useQuickView();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isHovered, setIsHovered] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const [isWishlisted, setIsWishlisted] = useState(false);

    React.useEffect(() => {
        if (user) {
            setIsWishlisted(user.wishlist?.includes(String(id)) || false);
        }
    }, [user, id]);

    const toggleWishlist = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) {
            navigate('/login');
            return;
        }

        try {
            if (isWishlisted || isWishlistPage) {
                await wishlistAPI.remove(id);
                setIsWishlisted(false);
                if (onRemove) onRemove(id);
                showToast('Removed from your wishlist.', 'success');
            } else {
                await wishlistAPI.add(id);
                setIsWishlisted(true);
                showToast('Added to your wishlist.', 'success');
            }
        } catch (error) {
            console.error('Wishlist toggle failed:', error);
            showToast('Failed to update wishlist.', 'error');
        }
    };

    // Filtered products or direct props
    const isTrendingBadge = isTrending;
    const isNewArrivalBadge = isNewArrival;

    const textColor = theme === 'dark' ? 'text-white' : 'text-luxury-charcoal';
    const priceColor = theme === 'dark' ? 'text-white/80' : 'text-luxury-black';
    const mutedColor = theme === 'dark' ? 'text-white/50' : 'text-gray-400';

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="group relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative aspect-[3/4] overflow-hidden bg-luxury-gray rounded-sm mb-6">
                <Link to={`/product/${id}`} className="block h-full w-full">
                    <div className="relative w-full h-full">
                        {/* Primary Image */}
                        <motion.img
                            initial={{ opacity: 0 }}
                            animate={{
                                opacity: imageLoaded ? (isHovered && hoverImage ? 0 : 1) : 0,
                                scale: isHovered ? 1.05 : 1
                            }}
                            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                            onLoad={() => setImageLoaded(true)}
                            src={image}
                            alt={name}
                            className="w-full h-full object-cover"
                        />

                        {/* Secondary/Hover Image */}
                        {hoverImage && (
                            <motion.img
                                initial={{ opacity: 0 }}
                                animate={{
                                    opacity: isHovered ? 1 : 0,
                                    scale: isHovered ? 1.05 : 1
                                }}
                                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                                src={hoverImage}
                                alt={`${name} hover`}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        )}
                    </div>

                    {/* Placeholder Shimmer if not loaded */}
                    {!imageLoaded && (
                        <div className="absolute inset-0 bg-luxury-gray animate-pulse flex items-center justify-center">
                            <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Loading...</span>
                        </div>
                    )}

                    {/* Overlay on Hover */}
                    <div className="absolute inset-0 bg-luxury-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Badge System — only one badge shown, Trending takes priority */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                        {isTrendingBadge ? (
                            <motion.div
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                className="bg-luxury-gold px-3 py-1.5 rounded-sm shadow-xl shadow-luxury-gold/20 flex items-center gap-1.5"
                            >
                                <TrendingUp size={9} strokeWidth={2.5} className="text-white" />
                                <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-white">Trending</span>
                            </motion.div>
                        ) : isNewArrivalBadge ? (
                            <motion.div
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-sm shadow-xl border border-black/5 flex items-center gap-1.5"
                            >
                                <Sparkles size={9} strokeWidth={2.5} className="text-luxury-gold" />
                                <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#2A1E17]">New In</span>
                            </motion.div>
                        ) : null}
                    </div>
                </Link>

                {/* Action Bar - Quick Buy & Quick View */}
                <div className="absolute inset-x-4 bottom-4 flex flex-col gap-2 translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openQuickView(id);
                        }}
                        className="w-full bg-white/90 backdrop-blur-sm text-luxury-black py-3 text-[9px] font-bold uppercase tracking-luxury shadow-lg hover:bg-luxury-black hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                        <Eye size={12} strokeWidth={1.5} /> Quick View
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // If we don't have the full product object here, we might need to fetch it or pass it as a prop
                            // For now, minimal refactor to avoid crashing
                            addToCart({ id, name, price, photo: image } as any);
                            const btn = e.currentTarget;
                            const originalContent = btn.innerHTML;
                            btn.innerHTML = '<span class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Added to Bag</span>';
                            btn.classList.add('bg-green-600');
                            setTimeout(() => {
                                btn.innerHTML = originalContent;
                                btn.classList.remove('bg-green-600');
                            }, 2000);
                        }}
                        className="w-full bg-luxury-black text-white py-3 text-[9px] font-bold uppercase tracking-luxury shadow-lg hover:bg-luxury-gold transition-all flex items-center justify-center gap-2"
                    >
                        <ShoppingBag size={12} strokeWidth={1.5} /> Add to Cart
                    </button>
                </div>

                {/* Wishlist/Remove Button */}
                <button
                    onClick={toggleWishlist}
                    className={`absolute top-4 right-4 p-2 rounded-full transition-all duration-300 z-20 
                        ${isWishlistPage
                            ? 'bg-white/90 text-red-500 shadow-md hover:bg-red-500 hover:text-white'
                            : (isWishlisted
                                ? 'bg-luxury-gold text-white shadow-lg opacity-100'
                                : 'bg-white/80 backdrop-blur-sm text-luxury-black hover:text-red-500 opacity-0 group-hover:opacity-100')
                        }`}
                >
                    {isWishlistPage ? (
                        <X size={16} strokeWidth={2} />
                    ) : (
                        <Heart size={16} strokeWidth={1.5} className={isWishlisted ? "fill-current" : ""} />
                    )}
                </button>
            </div>

            <div className="space-y-1">
                <div className="flex justify-between items-start gap-2">
                    <h3 className={`text-[11px] font-bold uppercase tracking-luxury ${textColor} flex-1 transition-colors`}>
                        {name}
                    </h3>
                    <p className={`text-[11px] font-bold ${priceColor} whitespace-nowrap`}>
                        ₹{price?.toLocaleString() || '0'}
                    </p>
                </div>
                <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${mutedColor}`}>Available Item</span>
                    <Link to={`/product/${id}`} className="text-[9px] font-bold uppercase tracking-widest text-luxury-gold opacity-0 group-hover:opacity-100 transition-opacity">
                        View Details
                    </Link>
                </div>
            </div>
        </motion.div>
    );
};

export default ProductCard;
