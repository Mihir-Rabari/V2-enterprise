import React from 'react';
import { useMyOrders } from '../hooks/useMyOrders';
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { User, Package, Heart, LogOut, Settings, ArrowRight, ChevronRight, X, ShoppingBag, MapPin, Edit3, Save, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { authAPI, wishlistAPI, addressesAPI } from '../lib/apiClient';
import ProductCard from '../components/ProductCard';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import OrderDetailsModal from '../components/OrderDetailsModal';
import { Order } from '../types';

const Profile = () => {
    const { user, refreshUser } = useAuth();
    const { showToast } = useCart();
    const [isEditing, setIsEditing] = React.useState(false);
    const [loading, setLoading] = React.useState(false);

    // Form state
    const [formData, setFormData] = React.useState({
        firstName: '',
        lastName: '',
        phone: ''
    });

    React.useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName || user.name.split(' ')[0] || '',
                lastName: user.lastName || user.name.split(' ')[1] || '',
                phone: user.phone || ''
            });
        }
    }, [user, isEditing]);

    if (!user) return null;

    const handleSave = async () => {
        setLoading(true);
        try {
            const fullName = `${formData.firstName} ${formData.lastName}`.trim();
            await authAPI.updateMe({
                name: fullName,
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone
            });
            await refreshUser();
            setIsEditing(false);
            showToast('Profile updated successfully', 'success');
        } catch (error: any) {
            console.error('Update failed:', error);
            showToast(error.response?.data?.message || 'Failed to update profile', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fields = [
        { label: "First Name", key: "firstName" as const, val: formData.firstName },
        { label: "Last Name", key: "lastName" as const, val: formData.lastName },
        { label: "Phone Number", key: "phone" as const, val: formData.phone }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12 sm:space-y-16"
        >
            <div className="flex justify-between items-end">
                <div className="space-y-4">
                    <h2 className="font-serif text-3xl italic text-luxury-black tracking-tighter">Personal Details</h2>
                    <div className="w-12 h-[1px] bg-luxury-gold/30" />
                </div>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-luxury-gold hover:text-luxury-black transition-colors group"
                    >
                        <Edit3 size={14} strokeWidth={1.5} className="group-hover:rotate-12 transition-transform" />
                        Edit Details
                    </button>
                )}
            </div>

            <AnimatePresence mode="wait">
                {!isEditing ? (
                    <motion.div
                        key="display"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12"
                    >
                        {fields.map((field, i) => (
                            <div key={i} className="space-y-3 group border-b border-gray-100 pb-4">
                                <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-400">{field.label}</label>
                                <p className="text-[11px] font-bold tracking-luxury text-luxury-black uppercase">{field.val || 'Not Provided'}</p>
                            </div>
                        ))}
                        <div className="space-y-3 group border-b border-gray-100 pb-4">
                            <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-400">Email Address</label>
                            <p className="text-[11px] font-bold tracking-luxury text-luxury-black uppercase">{user.email}</p>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="edit"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="space-y-12"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                            {fields.map((field, i) => (
                                <div key={i} className="relative group">
                                    <input
                                        type="text"
                                        value={field.val}
                                        onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                                        placeholder=" "
                                        className="peer w-full bg-transparent border-b border-gray-200 py-3 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-gold transition-all duration-500 placeholder:opacity-0 uppercase"
                                    />
                                    <label className="absolute left-0 top-3 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400 transition-all duration-500 pointer-events-none 
                                        peer-focus:-top-4 peer-focus:text-luxury-gold 
                                        peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-luxury-gold">
                                        {field.label}
                                    </label>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="group relative overflow-hidden bg-luxury-black text-white px-12 py-5 text-[10px] font-bold uppercase tracking-[0.3em] transition-all duration-700 disabled:opacity-50"
                            >
                                <span className="relative z-10 flex items-center gap-3 justify-center">
                                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </span>
                                <div className="absolute inset-0 bg-luxury-gold translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-12 py-5 text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400 hover:text-luxury-black transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const Orders = () => {
    const { orders, loading: ordersLoading } = useMyOrders();
    const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
    const [modalOpen, setModalOpen] = React.useState(false);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
        }
    };

    const getStatusColor = (status: string) => {
        if (status === 'DELIVERED') return 'bg-green-50 text-green-800';
        if (status === 'CANCELLED') return 'bg-red-50 text-red-700';
        return 'bg-luxury-gold/5 text-luxury-gold';
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-10 sm:space-y-12"
        >
            <div className="space-y-4">
                <h2 className="font-serif text-3xl italic text-luxury-black tracking-tighter">Purchase History</h2>
                <div className="w-12 h-[1px] bg-luxury-gold/30" />
            </div>

            {ordersLoading ? (
                <div className="animate-pulse space-y-4">
                    {[1, 2].map(i => <div key={i} className="h-32 bg-gray-50 rounded" />)}
                </div>
            ) : orders.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-gray-200 rounded">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">No orders yet.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {orders.map((order, i) => (
                        <motion.div
                            key={i}
                            variants={itemVariants}
                            onClick={() => {
                                setSelectedOrder(order as any);
                                setModalOpen(true);
                            }}
                            className="group border border-gray-100 p-8 sm:p-10 hover:border-luxury-gold hover:shadow-2xl hover:shadow-black/[0.03] transition-all duration-700 bg-white relative cursor-pointer"
                        >
                            <div className="absolute top-6 right-8">
                                <span className={`text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full ${getStatusColor(order.status)}`}>
                                    <span className="inline-block w-1 h-1 rounded-full bg-current mr-2 animate-pulse" />
                                    {order.status}
                                </span>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-10">
                                <div className="w-full">
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                                        <div className="space-y-2">
                                            <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-gray-400">Order Ref</p>
                                            <p className="text-[11px] font-bold tracking-luxury text-luxury-black">{order.id.slice(0, 8).toUpperCase()}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-gray-400">Date</p>
                                            <p className="text-[11px] font-bold tracking-luxury text-luxury-black">
                                                {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-gray-400">Amount</p>
                                            <p className="text-[11px] font-bold tracking-luxury text-luxury-black">₹{order.total.toLocaleString('en-IN')}</p>
                                        </div>
                                        <div className="hidden lg:block space-y-2">
                                            <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-gray-400">{order.items.length} Item{order.items.length !== 1 ? 's' : ''}</p>
                                            <p className="text-[10px] font-bold tracking-luxury text-gray-500 italic">
                                                {order.items?.map(i => i.productName).join(', ')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <OrderDetailsModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                order={selectedOrder}
                isAdmin={false}
            />
        </motion.div>
    );
};

const Addresses = () => {
    const { user, refreshUser } = useAuth();
    const { showToast } = useCart();
    const [isAdding, setIsAdding] = React.useState(false);
    const [editingAddress, setEditingAddress] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(false);

    const [formData, setFormData] = React.useState({
        label: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        isDefault: false
    });

    React.useEffect(() => {
        if (editingAddress) {
            setFormData({
                label: editingAddress.label || '',
                street: editingAddress.street || '',
                city: editingAddress.city || '',
                state: editingAddress.state || '',
                zipCode: editingAddress.zipCode || '',
                isDefault: editingAddress.isDefault || false
            });
            setIsAdding(true);
        } else {
            setFormData({
                label: '',
                street: '',
                city: '',
                state: '',
                zipCode: '',
                isDefault: false
            });
        }
    }, [editingAddress]);

    if (!user) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingAddress) {
                await addressesAPI.update(editingAddress._id, formData);
                showToast('Address updated successfully', 'success');
            } else {
                await addressesAPI.add(formData);
                showToast('Address added successfully', 'success');
            }
            await refreshUser();
            setIsAdding(false);
            setEditingAddress(null);
        } catch (error: any) {
            console.error('[Addresses] Failed to save address:', error);
            showToast(error.response?.data?.message || 'Failed to save address', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (id: string) => {
        if (!confirm('Are you sure you want to remove this address?')) return;
        try {
            await addressesAPI.remove(id);
            await refreshUser();
            showToast('Address removed', 'success');
        } catch (error) {
            showToast('Failed to remove address', 'error');
        }
    };

    const handleSetDefault = async (id: string) => {
        try {
            await addressesAPI.setDefault(id);
            await refreshUser();
            showToast('Default address updated', 'success');
        } catch (error) {
            showToast('Failed to set default address', 'error');
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
        }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-12 sm:space-y-16"
        >
            <div className="flex justify-between items-end">
                <div className="space-y-4">
                    <h2 className="font-serif text-3xl italic text-luxury-black tracking-tighter">My Addresses</h2>
                    <div className="w-12 h-[1px] bg-luxury-gold/30" />
                </div>
                {!isAdding && (
                    <button
                        onClick={() => {
                            setEditingAddress(null);
                            setIsAdding(true);
                        }}
                        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-luxury-gold hover:text-luxury-black transition-colors group"
                    >
                        <Plus size={14} strokeWidth={1.5} />
                        Add New
                    </button>
                )}
            </div>

            <AnimatePresence mode="wait">
                {isAdding ? (
                    <motion.form
                        key="add-address"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        onSubmit={handleSave}
                        className="bg-zinc-50/50 p-8 sm:p-12 space-y-10"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                            {[
                                { label: "Address Label", key: "label", placeholder: "E.G. HOME / OFFICE" },
                                { label: "Street Address", key: "street", placeholder: "123 LUXURY ST" },
                                { label: "City", key: "city", placeholder: "MUMBAI" },
                                { label: "State", key: "state", placeholder: "MAHARASHTRA" },
                                { label: "Zip Code", key: "zipCode", placeholder: "400001" }
                            ].map((field, i) => (
                                <div key={i} className="relative group">
                                    <input
                                        required
                                        type="text"
                                        value={(formData as any)[field.key]}
                                        onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                                        placeholder=" "
                                        className="peer w-full bg-transparent border-b border-gray-200 py-3 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-gold transition-all duration-500 placeholder:opacity-0 uppercase"
                                    />
                                    <label className="absolute left-0 top-3 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400 transition-all duration-500 pointer-events-none 
                                        peer-focus:-top-4 peer-focus:text-luxury-gold 
                                        peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-luxury-gold">
                                        {field.label}
                                    </label>
                                </div>
                            ))}
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="isDefault"
                                    checked={formData.isDefault}
                                    onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                                    className="w-4 h-4 accent-luxury-gold"
                                />
                                <label htmlFor="isDefault" className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400">Set as default address</label>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative overflow-hidden bg-luxury-black text-white px-12 py-5 text-[10px] font-bold uppercase tracking-[0.3em] transition-all duration-700 disabled:opacity-50"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    {loading ? 'Processing...' : (editingAddress ? 'Update Address' : 'Save Address')}
                                </span>
                                <div className="absolute inset-0 bg-luxury-gold translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAdding(false);
                                    setEditingAddress(null);
                                }}
                                className="px-12 py-5 text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400 hover:text-luxury-black transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.form>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {user.addresses && user.addresses.length > 0 ? (
                            user.addresses.map((addr: any) => (
                                <motion.div
                                    key={addr._id}
                                    variants={itemVariants}
                                    className="group border border-gray-100 p-8 sm:p-10 hover:border-luxury-gold transition-all duration-700 bg-white relative hover:shadow-2xl hover:shadow-black/[0.02]"
                                >
                                    <div className="absolute top-6 right-8 flex gap-2">
                                        {addr.isDefault ? (
                                            <span className="text-[8px] font-bold uppercase tracking-widest px-3 py-1 bg-luxury-gold text-white rounded-full">Default</span>
                                        ) : (
                                            <button
                                                onClick={() => handleSetDefault(addr._id)}
                                                className="text-[8px] font-bold uppercase tracking-widest px-3 py-1 bg-gray-50 text-gray-400 hover:bg-luxury-gold/10 hover:text-luxury-gold rounded-full transition-colors"
                                            >
                                                Make Default
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-8">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 text-luxury-gold">
                                                <MapPin size={12} />
                                                <p className="text-[9px] font-bold uppercase tracking-[0.4em]">{addr.label}</p>
                                            </div>
                                            <div className="text-[11px] font-bold tracking-luxury text-luxury-black leading-relaxed">
                                                <p className="uppercase">{addr.street}</p>
                                                <p className="uppercase">{addr.city}, {addr.state} {addr.zipCode}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-8 pt-6 border-t border-gray-50">
                                            <button
                                                onClick={() => setEditingAddress(addr)}
                                                className="text-[9px] font-bold uppercase tracking-[0.25em] text-luxury-black hover:text-luxury-gold transition-colors underline-offset-8 hover:underline"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleRemove(addr._id)}
                                                className="text-[9px] font-bold uppercase tracking-[0.25em] text-red-900/40 hover:text-red-900 transition-colors"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="col-span-full py-16 text-center border border-dashed border-gray-200 rounded">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">No addresses saved yet.</p>
                            </div>
                        )}
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const Wishlist = () => {
    const [savedItems, setSavedItems] = React.useState<Product[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchWishlist = async () => {
            try {
                const res = await wishlistAPI.get();
                setSavedItems(res.data.data || []);
            } catch (error) {
                console.error('Failed to fetch wishlist:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchWishlist();
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    if (loading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="aspect-[3/4] bg-zinc-50 rounded" />
                ))}
            </div>
        );
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-10 sm:space-y-12"
        >
            <div className="space-y-4">
                <h2 className="font-serif text-3xl italic text-luxury-black tracking-tighter">Saved Selection</h2>
                <div className="w-12 h-[1px] bg-luxury-gold/30" />
            </div>

            {savedItems.length === 0 ? (
                <div className="py-24 text-center border border-dashed border-gray-100 rounded-lg">
                    <Heart size={32} strokeWidth={1} className="mx-auto mb-4 text-gray-200" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Your selection is empty.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10 lg:gap-16">
                    {savedItems.map(item => (
                        <ProductCard
                            key={item._id || item.id}
                            id={item._id || item.id}
                            name={item.name}
                            price={item.price}
                            image={item.photo}
                            isWishlistPage={true}
                            sizes={item.sizes}
                            onRemove={(id) => {
                                setSavedItems(prev => prev.filter(p => (p._id || p.id) !== id));
                            }}
                        />
                    ))}
                </div>
            )}
        </motion.div>
    );
};

const Account: React.FC = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const menuItems = [
        { path: '/account', label: 'Profile', icon: User, exact: true },
        { path: '/account/orders', label: 'Orders', icon: Package },
        { path: '/account/wishlist', label: 'Wishlist', icon: Heart },
        { path: '/account/addresses', label: 'Addresses', icon: MapPin },
    ];

    return (
        <div className="bg-white min-h-screen">
            {/* Minimalist Header - Space Collapsed */}
            <div className="py-16 sm:py-24 bg-zinc-50 border-b border-gray-100 relative overflow-hidden">
                <div className="max-w-[var(--max-width)] mx-auto px-[var(--spacing-gutter)] sm:px-[var(--spacing-gutter-sm)] lg:px-[var(--spacing-gutter-lg)] xl:px-[var(--spacing-gutter-xl)] relative z-10">
                    <div className="flex flex-col gap-4">
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3"
                        >
                            <span className="text-luxury-gold text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.4em]">Atelier Client</span>
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="font-serif text-5xl sm:text-6xl italic text-luxury-black tracking-tighter leading-none"
                        >
                            My Account.
                        </motion.h1>
                    </div>
                </div>
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-luxury-gold/5 to-transparent pointer-events-none" />
            </div>

            <div className="max-w-[var(--max-width)] mx-auto px-[var(--spacing-gutter)] sm:px-[var(--spacing-gutter-sm)] lg:px-[var(--spacing-gutter-lg)] xl:px-[var(--spacing-gutter-xl)] pt-12 sm:pt-20 pb-32">
                <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 items-start">

                    {/* Navigation - Underline Design */}
                    <aside className="w-full lg:w-64 flex-shrink-0">
                        <nav className="flex lg:flex-col items-center lg:items-start gap-1 sm:gap-2 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 scrollbar-hide snap-x">
                            {menuItems.map(item => {
                                const isActive = item.exact
                                    ? location.pathname === item.path
                                    : location.pathname.startsWith(item.path);

                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`group relative flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.25em] transition-all duration-300 whitespace-nowrap snap-start ${isActive ? 'text-luxury-gold' : 'text-gray-400 hover:text-luxury-black underline-offset-8'}`}
                                    >
                                        <item.icon size={14} strokeWidth={isActive ? 2 : 1.5} className="transition-all" />
                                        {item.label}

                                        {/* Underline Active State */}
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute -bottom-1 lg:bottom-0 left-4 right-4 h-[2px] bg-luxury-gold lg:left-0 lg:w-[2px] lg:h-full lg:top-0"
                                            />
                                        )}

                                        {/* Hover Indicator (Desktop Only) */}
                                        <div className="hidden lg:block absolute left-0 w-0 h-full bg-zinc-50 -z-10 group-hover:w-full transition-all duration-300" />
                                    </Link>
                                );
                            })}

                            <div className="h-4 w-px bg-gray-100 mx-4 lg:hidden" />

                            <button
                                onClick={() => {
                                    logout();
                                    navigate('/');
                                }}
                                className="flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.25em] text-red-900 group transition-all duration-300 whitespace-nowrap snap-start hover:bg-red-50/50"
                            >
                                <LogOut size={14} strokeWidth={1.5} className="group-hover:-translate-x-1 transition-transform" />
                                Logout
                            </button>
                        </nav>
                    </aside>

                    {/* Content Section - Compact Margin */}
                    <main className="flex-1 w-full min-h-[50vh]">
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={location.pathname}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{
                                    duration: 0.5,
                                    ease: [0.22, 1, 0.36, 1]
                                }}
                            >
                                <Routes location={location}>
                                    <Route index element={<Profile />} />
                                    <Route path="orders" element={<Orders />} />
                                    <Route path="wishlist" element={<Wishlist />} />
                                    <Route path="addresses" element={<Addresses />} />
                                </Routes>
                            </motion.div>
                        </AnimatePresence>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Account;
