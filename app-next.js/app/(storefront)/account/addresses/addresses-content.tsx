'use client';

import React from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { MapPin, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { addressesAPI } from '@/lib/apiClient';

/**
 * Addresses view (My Addresses) — Next.js port of the `Addresses` component in
 * the Vite `frontend/pages/Account.tsx` (was `<Route path="addresses">` of the
 * nested Routes under /account).
 *
 * Behavior notes (faithful port):
 *  - Add/edit form toggle with the same AnimatePresence scale transition and
 *    floating-label inputs; editing an existing address pre-fills the form.
 *  - Save flow: addressesAPI.add / addressesAPI.update → refreshUser() →
 *    toast; remove flow uses window.confirm and addressesAPI.remove; default
 *    flow uses addressesAPI.setDefault. Error toasts surface the backend
 *    message (`error.response?.data?.message`) exactly like the source.
 *  - Renders nothing until a user is loaded (`if (!user) return null`) —
 *    without a backend the user stays null, so this view renders empty
 *    (no crash), same as the source.
 *  - Same stagger container/item variants and dashed empty state.
 *
 * Latent strict-error fixes (behavior-neutral, in-file only):
 *  - The standalone variant objects are annotated with framer-motion's
 *    `Variants`: untyped, `ease: [0.22, 1, 0.36, 1]` infers `number[]`, which
 *    is not assignable to the `Easing` union's `readonly [n, n, n, n]` tuple
 *    (framer-motion v12). Annotation only constrains compile-time typing;
 *    runtime values and animations are identical.
 */

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

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants: Variants = {
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

export default Addresses;
