import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, Heart, ShoppingBag, User, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SiteSettings, Product } from '../types';
// No initialData imports allowed. 100% dynamic.
import { useCart } from '../context/CartContext';
import { settingsAPI } from '../lib/apiClient';
import { useProducts } from '../hooks/useProducts';

interface NavbarProps {
    onSwitchToAdmin?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onSwitchToAdmin }) => {
    const { cartCount } = useCart();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const [siteSettings, setSiteSettings] = useState<SiteSettings>({} as SiteSettings);
    const isAdmin = localStorage.getItem('v2_admin_session') === 'true';

    useEffect(() => {
        settingsAPI.get().then(res => {
            if (res.data.success && res.data.data) {
                setSiteSettings(res.data.data);
            }
        }).catch(err => console.error('Error fetching settings for navbar:', err));
    }, []);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    return (
        <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-50 transition-all duration-300">
            <div className="max-w-[1600px] mx-auto px-4 lg:px-12 h-20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* Mobile Menu Toggle - Left */}
                    <button className="lg:hidden p-1 text-luxury-black -ml-1" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        <Menu size={20} strokeWidth={1.5} />
                    </button>
                    {/* Logo - Left */}
                    <Link to="/" className="flex items-center group">
                        {siteSettings.logoImage ? (
                            <img src={siteSettings.logoImage} alt={siteSettings.logoText} className="h-8 w-auto object-contain" width={128} height={32} />
                        ) : (
                            <img src="/v2_logo.webp" alt="V2 Logo" className="h-8 w-auto object-contain" width={128} height={32} />
                        )}
                    </Link>
                </div>

                {/* Navigation - Center */}
                <div className="hidden lg:flex items-center gap-8 xl:gap-10 text-[11px] font-bold uppercase tracking-luxury text-luxury-charcoal">
                    <NavLink to="/">Home</NavLink>
                    <NavLink to="/new-arrivals">New Collection</NavLink>
                    <NavLink to="/categories">Categories</NavLink>
                    <NavLink to="/about">About Us</NavLink>
                    <NavLink to="/contact">Contact</NavLink>
                </div>

                {/* Icons - Right */}
                <div className="flex items-center gap-3 sm:gap-6 text-luxury-black">
                    <div className="flex items-center relative">
                        <SearchBar />
                    </div>
                    <Link to="/liked" className="hidden sm:block hover:text-luxury-gold transition-colors">
                        <Heart size={18} strokeWidth={1.5} />
                    </Link>
                    <Link to="/cart" className="relative hover:text-luxury-gold transition-colors">
                        <ShoppingBag size={18} strokeWidth={1.5} />
                        <AnimatePresence>
                            {cartCount > 0 && (
                                <motion.span
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    className="absolute -top-1.5 -right-2 bg-luxury-black text-white text-[8px] w-3.5 h-3.5 flex items-center justify-center rounded-full font-bold"
                                >
                                    {cartCount}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </Link>
                    <Link to="/account" className="hover:text-luxury-gold transition-colors">
                        <User size={18} strokeWidth={1.5} />
                    </Link>
                </div>
            </div>

            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="lg:hidden fixed inset-0 z-[100] bg-white h-screen w-screen"
                    >
                        <div className="flex flex-col h-full p-12 space-y-8 overflow-y-auto">
                            <div className="flex justify-between items-center mb-12">
                                {siteSettings.logoImage ? (
                                    <img src={siteSettings.logoImage} alt={siteSettings.logoText} className="h-7 w-auto object-contain" width={120} height={28} />
                                ) : (
                                    <img src="/v2_logo.webp" alt="V2 Logo" className="h-7 w-auto object-contain" width={120} height={28} />
                                )}
                                <button onClick={() => setMobileMenuOpen(false)} className="p-2 -mr-2">
                                    <X size={28} strokeWidth={1} />
                                </button>
                            </div>
                            <div className="flex flex-col space-y-8">
                                {[
                                    { to: "/", label: "Home" },
                                    { to: "/new-arrivals", label: "New Collection" },
                                    { to: "/categories", label: "Collections" },
                                    { to: "/about", label: "About Us" },
                                    { to: "/contact", label: "Contact" }
                                ].map((link, i) => (
                                    <motion.div
                                        key={link.to}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.1 * i + 0.3, duration: 0.5, ease: "easeOut" }}
                                    >
                                        <MobileNavLink to={link.to}>{link.label}</MobileNavLink>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

const NavLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link to={to} className={`relative transition-colors duration-300 ${isActive ? 'text-luxury-black' : 'text-gray-400 hover:text-luxury-charcoal'}`}>
            {children}
            {isActive && <motion.div layoutId="navbar-underline" className="absolute -bottom-1 left-0 right-0 h-[1px] bg-luxury-gold" />}
        </Link>
    );
};

const MobileNavLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
    <Link to={to} className="text-2xl font-serif italic hover:text-luxury-gold transition-colors border-b border-gray-50 pb-4">
        {children}
    </Link>
);

const SearchBar: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const { products } = useProducts({ limit: 250, groupByColor: true, enabled: isOpen && query.length > 1 });
    const [results, setResults] = useState<Product[]>([]);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        setIsOpen(false);
        setQuery('');
    }, [location.pathname]);

    useEffect(() => {
        if (query.length > 1) {
            const filtered = products.filter(p =>
                p.name?.toLowerCase().includes(query.toLowerCase()) ||
                p.subCategory?.toLowerCase().includes(query.toLowerCase()) ||
                p.styleCode?.toLowerCase().includes(query.toLowerCase()) ||
                p.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
            ).slice(0, 5);
            setResults(filtered);
        } else {
            setResults([]);
        }
    }, [query, products]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/shop?q=${encodeURIComponent(query)}`);
            setIsOpen(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="hover:text-luxury-gold transition-colors"
            >
                <Search size={18} strokeWidth={1.5} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-white/90 backdrop-blur-md"
                            onClick={() => setIsOpen(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            className="w-full max-w-2xl bg-white border border-gray-100 shadow-2xl rounded-2xl overflow-hidden relative z-10"
                        >
                            <form onSubmit={handleSearch} className="p-6 border-b border-gray-50 flex items-center gap-4">
                                <Search size={20} className="text-luxury-gold" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search for styles, collections..."
                                    className="flex-1 bg-transparent outline-none text-lg font-serif italic text-luxury-black placeholder:text-gray-300"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                                <button type="button" onClick={() => setIsOpen(false)}>
                                    <X size={20} className="text-gray-400 hover:text-black transition-colors" />
                                </button>
                            </form>

                            {results.length > 0 && (
                                <div className="p-4 space-y-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2 mb-2">Live Suggestions</p>
                                    {results.map(product => (
                                        <Link
                                            key={product.id}
                                            to={`/product/${product.id}`}
                                            className="flex items-center gap-4 p-2 hover:bg-luxury-gray rounded-xl transition-colors group"
                                        >
                                            <img src={product.photo} alt={product.name} className="w-12 h-12 object-cover rounded-lg" width={48} height={48} loading="lazy" decoding="async" />
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-luxury-black group-hover:text-luxury-gold transition-colors">{product.name}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{product.subCategory}</p>
                                            </div>
                                            <p className="text-xs font-bold text-luxury-black">₹{product.price}</p>
                                        </Link>
                                    ))}
                                    <button
                                        onClick={handleSearch}
                                        className="w-full text-center py-4 text-[10px] font-bold uppercase tracking-widest text-luxury-gold border-t border-gray-50 mt-2 hover:text-black transition-colors"
                                    >
                                        View all results for "{query}"
                                    </button>
                                </div>
                            )}

                            {query.length > 1 && results.length === 0 && (
                                <div className="p-12 text-center text-gray-400">
                                    <p className="font-serif italic text-lg mb-1">No matches found</p>
                                    <p className="text-xs uppercase tracking-widest font-bold">Try searching for something else</p>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Navbar;
