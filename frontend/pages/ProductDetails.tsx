import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ShoppingBag, Heart, ArrowRight, Star, MessageSquare, Send, CheckCircle2, PlayCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from '../components/ProductCard';
import { Accordion } from '../components/Accordion';
import { useCart } from '../context/CartContext';
import { useProduct, useProducts } from '../hooks/useProducts';
import { reviewsAPI, wishlistAPI } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';

const RelatedProducts: React.FC<{ currentId: string | number; categoryName?: string }> = ({ currentId, categoryName }) => {
    const { products, loading } = useProducts({
        category: categoryName,
        limit: 4,
        status: 'ACTIVE',
        groupByColor: true
    });

    const related = products.filter(p => p.id !== currentId).slice(0, 4);

    if (loading) return <div className="col-span-2 h-48 bg-white/40 animate-pulse rounded-xl" />;
    if (related.length === 0) return null;

    return (
        <>
            {related.map(p => (
                <ProductCard
                    key={p.id}
                    id={p.id}
                    name={p.name}
                    price={p.price}
                    image={p.photo}
                />
            ))}
        </>
    );
};

const ProductDetails: React.FC = () => {
    const { addToCart, showToast } = useCart();
    const { user } = useAuth();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { product, loading: productLoading, error: productError } = useProduct(id);

    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [activeImage, setActiveImage] = useState<number>(0);
    const [isVideoActive, setIsVideoActive] = useState(false);
    const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
    const [isZooming, setIsZooming] = useState(false);

    // For the palette: Get one representative product for each unique color among siblings
    const colorOptions = product ? [
        { id: String(product.id), color: product.color || 'Default', photo: product.photo, colorHex: product.colorHex },
        ...(product.siblings || [])
            .filter((s, idx, self) => self.findIndex(x => x.color === s.color) === idx && s.color !== product.color)
            .map(s => ({ id: String(s.id), color: s.color, photo: s.photo, colorHex: s.colorHex }))
    ] : [];

    const galleryImages = product ? [product.photo, ...(product.photos || [])].filter(Boolean) : [];

    // For the size grid: Get all SKUs that have the same color as the current product
    const sizeOptions = product ? [
        { id: String(product.id), size: product.size, quantity: product.quantity },
        ...(product.siblings || [])
            .filter(s => s.color === product.color)
            .map(s => ({ id: String(s.id), size: s.size, quantity: s.quantity }))
    ].sort((a, b) => {
        const order = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
        return order.indexOf(a.size) - order.indexOf(b.size);
    }) : [];

    // Set default values when product loads
    useEffect(() => {
        if (product) {
            setSelectedSize(product.size || null);
            setSelectedColor(product.color || null);
        }
    }, [product]);

    // Reviews State — fetched from API
    const [productReviews, setProductReviews] = useState<{ rating: number; reviewText: string; customerName: string; date: string }[]>([]);
    const [newReview, setNewReview] = useState({
        rating: 5,
        text: '',
        name: user?.name || '',
        email: user?.email || ''
    });

    useEffect(() => {
        if (product) {
            reviewsAPI.getForProduct(product.id)
                .then(res => setProductReviews(res.data.data ?? []))
                .catch(() => { });
        }
    }, [product]);

    useEffect(() => {
        if (user) {
            setNewReview(prev => ({
                ...prev,
                name: user.name,
                email: user.email
            }));
        }
    }, [user]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const [lensPos, setLensPos] = useState({ x: 0, y: 0 });
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

    // Wishlist Logic
    const [isWishlisted, setIsWishlisted] = useState(false);

    useEffect(() => {
        if (user && product) {
            setIsWishlisted(user.wishlist?.includes(String(product.id)) || false);
        }
    }, [user, product]);

    const toggleWishlist = async () => {
        if (!user) {
            navigate(`/login?redirect=/product/${id}`);
            return;
        }

        if (!product) return;

        try {
            if (isWishlisted) {
                await wishlistAPI.remove(product.id);
                setIsWishlisted(false);
                showToast('Removed from your wishlist.', 'success');
            } else {
                await wishlistAPI.add(product.id);
                setIsWishlisted(true);
                showToast('Added to your wishlist.', 'success');
            }
        } catch (error) {
            console.error('Wishlist toggle failed:', error);
            showToast('Failed to update wishlist.', 'error');
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();

        // Calculate position relative to the image container
        let x = e.clientX - left;
        let y = e.clientY - top;

        // Ensure lens stays within bounds
        const lensWidth = 120;
        const lensHeight = 120;

        let lensX = x - lensWidth / 2;
        let lensY = y - lensHeight / 2;

        if (lensX < 0) lensX = 0;
        if (lensX > width - lensWidth) lensX = width - lensWidth;
        if (lensY < 0) lensY = 0;
        if (lensY > height - lensHeight) lensY = height - lensHeight;

        setLensPos({ x: lensX, y: lensY });
        setZoomPos({
            x: (lensX / (width - lensWidth)) * 100,
            y: (lensY / (height - lensHeight)) * 100
        });
        setCursorPos({ x, y });
    };

    if (productLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F6F3EF]">
                <div className="space-y-4 text-center animate-pulse">
                    <div className="w-48 h-2 bg-gray-200 rounded mx-auto" />
                    <div className="w-32 h-2 bg-gray-100 rounded mx-auto" />
                </div>
            </div>
        );
    }

    if (!product || productError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F6F3EF]">
                <div className="text-center space-y-6">
                    <h2 className="font-serif text-3xl italic text-[#2A1E17]">Item not found.</h2>
                    <button onClick={() => navigate('/shop')} className="text-[10px] font-bold uppercase tracking-luxury-widest border-b border-[#2A1E17] pb-2 text-[#2A1E17]">Back to Shop</button>
                </div>
            </div>
        );
    }

    // galleryImages is now derived above

    const accordionItems = [
        {
            title: "Description",
            content: <p>{product.description}</p>
        },
        {
            title: "Material & Care",
            content: (
                <ul className="list-disc pl-4 space-y-2">
                    <li>100% Premium Cotton</li>
                    <li>Machine wash cold</li>
                    <li>Do not bleach</li>
                    <li>Iron low heat</li>
                </ul>
            )
        },
        {
            title: "Shipping & Returns",
            content: (
                <div className="space-y-4">
                    <p>Free standard shipping on all orders over ₹2000.</p>
                    <p>Returns accepted within 14 days of delivery. Items must be unworn and tags attached.</p>
                </div>
            )
        }
    ];

    return (
        <div className="bg-[#F6F3EF] min-h-screen animate-fade-in pb-32">
            {/* Top Navigation Bar */}
            <div className="max-w-[1800px] mx-auto px-6 py-8 flex items-center justify-between sticky top-0 bg-[#F6F3EF]/80 backdrop-blur-md z-[50]">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.3em] text-[#2A1E17] hover:text-luxury-gold transition-colors group"
                >
                    <div className="w-8 h-8 rounded-full border border-[#2A1E17]/10 flex items-center justify-center group-hover:border-luxury-gold transition-colors">
                        <ChevronLeft size={14} strokeWidth={1.5} />
                    </div>
                    <span>Back to Collection</span>
                </button>
                <div className="hidden md:flex items-center gap-2 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    <span>Shop</span>
                    <span className="text-gray-200">/</span>
                    <span>{product.mainCategory}</span>
                    <span className="text-gray-200">/</span>
                    <span className="text-[#2A1E17]">{product.name}</span>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">

                    {/* LEFT: Image Gallery */}
                    <div className="space-y-8">
                        {/* Main Image View Container */}
                        <div className={`relative aspect-[4/5] bg-[#EBE8E4] group/zoom ${isVideoActive === false ? 'cursor-zoom-in' : 'cursor-default'}`}
                            onMouseMove={isVideoActive === false ? handleMouseMove : undefined}
                            onMouseEnter={() => isVideoActive === false && setIsZooming(true)}
                            onMouseLeave={() => setIsZooming(false)}
                        >
                            <div className="w-full h-full overflow-hidden relative">
                            {isVideoActive !== false && (product.videoUrls?.[isVideoActive as number] || product.videoUrl) ? (
                                <div className="absolute inset-0 z-20 bg-black">
                                    <iframe
                                        className="w-full h-full"
                                        src={(() => {
                                            const url = product.videoUrls?.[isVideoActive as number] || product.videoUrl;
                                            if (!url) return '';
                                            if (url.includes('youtube.com/embed/')) return url;

                                            // Handle youtu.be/ID
                                            if (url.includes('youtu.be/')) {
                                                const id = url.split('/').pop()?.split('?')[0];
                                                return `https://www.youtube.com/embed/${id}`;
                                            }

                                            // Handle youtube.com/watch?v=ID
                                            if (url.includes('v=')) {
                                                const id = new URLSearchParams(new URL(url).search).get('v');
                                                return `https://www.youtube.com/embed/${id}`;
                                            }

                                            return url;
                                        })()}
                                        title="Product Video"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                    <button
                                        onClick={() => setIsVideoActive(false)}
                                        className="absolute top-4 right-4 z-30 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
                                    >
                                        Close Video
                                    </button>
                                </div>
                            ) : (
                                <motion.img
                                    key={activeImage}
                                    initial={{ opacity: 0, scale: 1.05 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    src={galleryImages[activeImage]}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                />
                            )}
                            </div>

                            {/* Zoom Loupe */}
                            <AnimatePresence>
                                {isZooming && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{ duration: 0.15, ease: "easeOut" }}
                                        className="absolute z-[100] bg-white border border-gray-100 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-[2rem] hidden lg:block pointer-events-none"
                                        style={{
                                            left: cursorPos.x + 24,
                                            top: cursorPos.y - 140,
                                            width: '280px',
                                            height: '280px'
                                        }}
                                    >
                                        <div
                                            className="w-full h-full"
                                            style={{
                                                backgroundImage: `url(${galleryImages[activeImage]})`,
                                                backgroundSize: '300%',
                                                backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                                                backgroundRepeat: 'no-repeat'
                                            }}
                                        />
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-luxury-black/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] font-bold text-white uppercase tracking-[0.2em] whitespace-nowrap">
                                            LUXE ZOOM
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Thumbnails Below Image */}
                        <div className="flex justify-center gap-6">
                            {galleryImages.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setActiveImage(idx);
                                        setIsVideoActive(false);
                                    }}
                                    className={`relative w-20 h-28 md:w-24 md:h-32 transition-all duration-500 overflow-hidden group ${activeImage === idx && !isVideoActive ? 'ring-2 ring-luxury-gold ring-offset-4 ring-offset-[#F6F3EF]' : 'opacity-60 hover:opacity-100'}`}
                                >
                                    <img src={img} alt="Thumbnail" className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-700" />
                                    {activeImage === idx && !isVideoActive && (
                                        <div className="absolute inset-0 bg-luxury-gold/5" />
                                    )}
                                </button>
                            ))}
                            {/* Multiple Videos Support */}
                            {(product.videoUrls || (product.videoUrl ? [product.videoUrl] : [])).map((url, vIdx) => (
                                <button
                                    key={`vid-${vIdx}`}
                                    onClick={() => setIsVideoActive(vIdx)}
                                    className={`relative w-20 h-28 md:w-24 md:h-32 transition-all duration-500 overflow-hidden group flex flex-col items-center justify-center bg-zinc-900 ${isVideoActive === vIdx ? 'ring-2 ring-luxury-gold ring-offset-4 ring-offset-[#F6F3EF]' : 'opacity-60 hover:opacity-100'}`}
                                >
                                    <PlayCircle size={32} className="text-white mb-2" strokeWidth={1} />
                                    <span className="text-[8px] font-bold text-white uppercase tracking-widest text-center px-2">Experience {vIdx + 1}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT: Product Information */}
                    <div className="flex flex-col">
                        <div className="space-y-8 sticky top-32">
                            {/* Title & Category */}
                            <div className="space-y-4">
                                <span className="text-luxury-gold text-[11px] font-bold uppercase tracking-[0.4em] block">Editorial / {product.mainCategory}</span>
                                <h1 className="font-serif text-5xl md:text-7xl italic leading-[1] text-[#2A1E17] tracking-tighter">
                                    {product.name}
                                </h1>
                                <div className="flex items-baseline gap-6 pt-4">
                                    <span className="text-4xl font-sans text-[#2A1E17] font-light tracking-tight">₹{product.price?.toLocaleString()}</span>
                                    {product.originalPrice && (
                                        <span className="text-lg text-gray-400 line-through decoration-luxury-gold/30">₹{product.originalPrice?.toLocaleString()}</span>
                                    )}
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2">
                                {product.tags?.map(tag => (
                                    <span key={tag} className="text-[9px] font-bold uppercase tracking-widest text-gray-400 bg-white/40 px-3 py-1.5 border border-[#2A1E17]/5 rounded-sm">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            <div className="w-full h-[1px] bg-[#2A1E17]/10" />

                            {/* Color / Style Variant Navigation */}
                            {colorOptions.length > 1 && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Available Palette</span>
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2A1E17]">{product.color || selectedColor}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-4">
                                        {colorOptions.map(opt => {
                                            const isActive = opt.id === String(product.id);
                                            return (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => !isActive && navigate(`/product/${opt.id}`)}
                                                    title={opt.color}
                                                    className={`relative group flex flex-col items-center gap-1.5 transition-all duration-300`}
                                                >
                                                    <div className={`w-11 h-11 rounded-lg overflow-hidden border-2 transition-all duration-300 ${isActive ? 'border-luxury-gold ring-2 ring-luxury-gold ring-offset-2 ring-offset-[#F6F3EF]' : 'border-transparent hover:border-[#2A1E17]/20'}`}>
                                                        {opt.photo ? (
                                                            <img src={opt.photo} alt={opt.color} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full" style={{ backgroundColor: (opt as any).colorHex || '#ccc' }} />
                                                        )}
                                                    </div>
                                                    <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400">{opt.color}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Sizes */}
                            <div className="space-y-4 pt-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Select Proportions</span>
                                    <button className="text-[9px] font-bold uppercase tracking-[0.2em] text-luxury-gold border-b border-luxury-gold/30 pb-0.5">Measurement Guide</button>
                                </div>
                                <div className="grid grid-cols-4 gap-4">
                                    {sizeOptions.map(opt => {
                                        const isOutOfStock = opt.quantity <= 0;
                                        const isActive = opt.id === String(product.id);

                                        return (
                                            <button
                                                key={opt.id}
                                                disabled={isOutOfStock}
                                                onClick={() => !isActive && navigate(`/product/${opt.id}`)}
                                                className={`h-16 flex items-center justify-center text-[12px] font-bold tracking-widest transition-all duration-500 border relative overflow-hidden group ${isActive
                                                    ? 'bg-luxury-black text-white border-luxury-black shadow-lg shadow-black/10'
                                                    : isOutOfStock
                                                        ? 'bg-gray-100 border-gray-100 text-gray-300 cursor-not-allowed'
                                                        : 'bg-white/40 border-[#2A1E17]/10 text-gray-500 hover:border-[#2A1E17] hover:text-[#2A1E17]'
                                                    }`}
                                            >
                                                <span className="relative z-10">{opt.size}</span>
                                                {!isActive && !isOutOfStock && (
                                                    <div className="absolute inset-0 bg-luxury-black/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                                )}
                                                {isOutOfStock && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="w-[120%] h-[1px] bg-gray-300 rotate-45" />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* CTA Actions - Side by Side */}
                            <div className="flex gap-4 pt-8">
                                <button
                                    onClick={() => {
                                        if (product) {
                                            addToCart(product, 1, product.size, product.color || undefined);
                                        }
                                    }}
                                    className="flex-[2] h-16 bg-[#2A1E17] text-white text-[11px] font-bold uppercase tracking-[0.3em] overflow-hidden relative group shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all duration-300"
                                >
                                    <div className="absolute inset-0 bg-luxury-black translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ease-in-out" />
                                    <div className="relative z-10 flex items-center justify-center gap-3">
                                        <ShoppingBag size={18} strokeWidth={1.5} />
                                        <span>Incorporate to Bag</span>
                                    </div>
                                </button>
                                <button
                                    onClick={toggleWishlist}
                                    className={`flex-1 h-16 border border-[#2A1E17]/10 bg-white/40 text-[#2A1E17] text-[11px] font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all duration-500 group
                                        ${isWishlisted ? 'bg-luxury-gold text-white border-luxury-gold' : 'hover:bg-[#2A1E17] hover:text-white'}`}
                                >
                                    <Heart size={18} strokeWidth={1} className={isWishlisted ? "fill-white" : "group-hover:fill-current transition-all"} />
                                    <span className="hidden sm:inline">{isWishlisted ? "Wishlisted" : "Wishlist"}</span>
                                </button>
                            </div>

                            {/* Composition & Maintenance */}
                            {(product?.materialCare || (product.variants?.find(v => v.size === selectedSize) && (
                                product.variants?.find(v => v.size === selectedSize)?.fabric ||
                                product.variants?.find(v => v.size === selectedSize)?.collar ||
                                product.variants?.find(v => v.size === selectedSize)?.sleeve
                            ))) && (
                                    <div className="pt-12 border-t border-[#2A1E17]/5 space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-[1px] bg-luxury-gold/30" />
                                            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-luxury-gold">Composition & Specifications</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                            {[
                                                { label: 'Fabric', value: product.fabric },
                                                { label: 'Pattern', value: product.patternType },
                                                { label: 'Collar', value: product.collar },
                                                { label: 'Sleeve', value: product.sleeve },
                                                { label: 'Neck', value: product.neck },
                                                { label: 'Length', value: product.length },
                                                { label: 'Pocket', value: product.pocket },
                                                { label: 'Chest', value: product.chest },
                                                { label: 'Waist', value: product.waist },
                                                { label: 'Shoulder', value: product.shoulder },
                                                { label: 'Sleeve Length', value: product.sleeveLength },
                                            ].filter(a => a.value).map(a => (
                                                <div key={a.label} className="flex flex-col gap-1">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{a.label}</span>
                                                    <span className="text-[11px] font-bold text-[#2A1E17] uppercase tracking-luxury-widest">{a.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                        {product.materialCare && (
                                            <p className="text-[12px] font-medium text-[#2A1E17]/70 leading-relaxed whitespace-pre-line italic pt-2">
                                                {product.materialCare}
                                            </p>
                                        )}
                                    </div>
                                )}
                        </div>
                    </div>
                </div>

                <div className="mt-32 space-y-32">

                    {/* Reviews Section */}
                    <div className="w-full mb-24 space-y-12">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#2A1E17]/10 pb-8 gap-6">
                            <div className="space-y-2">
                                <span className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.4em]">Feedback</span>
                                <h3 className="font-serif text-4xl italic text-[#2A1E17]">Client Experiences</h3>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex text-luxury-gold">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={14} fill={i < 5 ? "#D4AF37" : "none"} strokeWidth={1} />
                                    ))}
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#2A1E17]/60">Based on {productReviews.length} reviews</span>
                            </div>
                        </div>

                        {/* Review List */}
                        <div className="space-y-12">
                            {productReviews.length > 0 ? (
                                productReviews.map((review, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        className="space-y-4"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#2A1E17]">{review.customerName || 'Anonymous'}</p>
                                                <div className="flex text-luxury-gold">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} size={10} fill={i < review.rating ? "#D4AF37" : "none"} strokeWidth={1} />
                                                    ))}
                                                </div>
                                            </div>
                                            <span className="text-[9px] font-bold text-[#2A1E17]/40 uppercase tracking-widest">
                                                {new Date(review.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <p className="font-serif text-lg italic text-[#2A1E17]/80 leading-relaxed max-w-2xl">
                                            "{review.reviewText}"
                                        </p>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="py-12 text-center bg-[#F1EDE8] rounded-2xl border border-dashed border-[#2A1E17]/10">
                                    <MessageSquare size={32} strokeWidth={1} className="mx-auto mb-4 text-[#2A1E17]/20" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#2A1E17]/40">No reviews yet. Be the first to share your experience.</p>
                                </div>
                            )}
                        </div>

                        {/* Submission Form */}
                        <div className="pt-16 border-t border-[#2A1E17]/5">
                            {!user ? (
                                <div className="bg-[#F1EDE8] p-12 text-center rounded-2xl border border-dashed border-[#2A1E17]/10 space-y-6">
                                    <MessageSquare size={32} strokeWidth={1} className="mx-auto text-[#2A1E17]/20" />
                                    <div className="space-y-2">
                                        <h4 className="font-serif text-2xl italic text-[#2A1E17]">Share Your Experience</h4>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#2A1E17]/40">Please sign in to write a review for this product</p>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/login?redirect=/product/${id}`)}
                                        className="inline-flex items-center gap-3 bg-[#2A1E17] text-white px-8 py-4 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-black transition-all"
                                    >
                                        Sign In to Review <ArrowRight size={14} />
                                    </button>
                                </div>
                            ) : showSuccess ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-white p-12 text-center rounded-2xl shadow-xl shadow-black/5 space-y-6"
                                >
                                    <div className="w-16 h-16 bg-luxury-gold/10 text-luxury-gold rounded-full flex items-center justify-center mx-auto">
                                        <CheckCircle2 size={32} />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-serif text-2xl italic text-[#2A1E17]">Review Submitted</h4>
                                        <p className="text-gray-500 text-sm max-w-xs mx-auto">Thank you for your feedback. Our team will review and publish it shortly.</p>
                                    </div>
                                    <button
                                        onClick={() => setShowSuccess(false)}
                                        className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold border-b border-luxury-gold pb-1"
                                    >
                                        Submit another review
                                    </button>
                                </motion.div>
                            ) : (
                                <div className="space-y-10">
                                    <div className="space-y-2 text-center md:text-left">
                                        <h4 className="font-serif text-2xl italic text-[#2A1E17]">Write a Review</h4>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2A1E17]/40">Logged in as {user.name} — Share your thoughts on {product.name}</p>
                                    </div>

                                    <div className="space-y-8 max-w-xl">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#2A1E17]/60 block">Rating</label>
                                            <div className="flex gap-2">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        onClick={() => setNewReview({ ...newReview, rating: star })}
                                                        className="hover:scale-110 transition-transform"
                                                    >
                                                        <Star
                                                            size={24}
                                                            fill={star <= newReview.rating ? "#D4AF37" : "none"}
                                                            className={star <= newReview.rating ? "text-luxury-gold" : "text-gray-300"}
                                                            strokeWidth={1}
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Name and Email hidden as they are auto-fetched */}

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#2A1E17]/60 block">Your Review</label>
                                            <textarea
                                                className="w-full bg-white border border-[#2A1E17]/10 p-6 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-gold transition-colors h-40 resize-none"
                                                placeholder="Tell us about the quality, fit, and style..."
                                                value={newReview.text}
                                                onChange={e => setNewReview({ ...newReview, text: e.target.value })}
                                            />
                                        </div>

                                        <button
                                            disabled={isSubmitting || !newReview.text}
                                            onClick={async () => {
                                                setIsSubmitting(true);
                                                try {
                                                    await reviewsAPI.submit({
                                                        productId: product.id,
                                                        rating: newReview.rating,
                                                        reviewText: newReview.text,
                                                        // Name and email are sent from context if backend allows, 
                                                        // or we can explicitly send them if needed:
                                                        customerName: user.name,
                                                        customerEmail: user.email
                                                    });
                                                    setShowSuccess(true);
                                                    setNewReview({ rating: 5, text: '', name: user.name, email: user.email });
                                                } catch (err: any) {
                                                    alert(err.response?.data?.message || 'Failed to submit review');
                                                } finally {
                                                    setIsSubmitting(false);
                                                }
                                            }}
                                            className="w-full md:w-auto px-12 h-16 bg-[#2A1E17] text-white text-[10px] font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-black transition-all disabled:opacity-50"
                                        >
                                            {isSubmitting ? "Processing..." : <>Submit Review <Send size={14} /></>}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Accordion Details */}
                    <div className="w-full mb-24">
                        <Accordion items={accordionItems} />
                    </div>

                    {/* Recommendation Snippet */}
                    <div className="w-full pt-12 border-t border-[#2A1E17]/10">
                        <div className="flex justify-between items-end mb-8">
                            <h3 className="font-serif text-2xl italic text-[#2A1E17]">Complete The Look</h3>
                            <div className="hidden lg:block w-32 h-px bg-[#2A1E17]/20"></div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {(product.reviews?.slice(0, 2) ?? []).length ? null : null}
                            {/* Show related products from same category */}
                            <RelatedProducts currentId={product.id} categoryName={product.category?.name} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetails;
