'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, Save } from 'lucide-react';
import { useAuth, AuthUser } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import { authAPI } from '../../../lib/apiClient';

/**
 * Profile view (Personal Details) — Next.js port of the `Profile` component
 * in the Vite `frontend/pages/Account.tsx` (was the index of the nested
 * `<Routes>` under /account).
 *
 * Behavior notes (faithful port):
 *  - View/edit toggle with the same AnimatePresence slide transitions.
 *  - Save flow: authAPI.updateMe({ name: "<first> <last>", firstName,
 *    lastName, phone }) → refreshUser() → toast; errors surface the backend
 *    message (`error.response?.data?.message`) exactly like the source.
 *  - Email is display-only (never editable) — as in the source.
 *  - Renders nothing until a user is loaded (`if (!user) return null`).
 *
 * Latent strict-error fixes (behavior-neutral, in-file only):
 *  - The source read `user.firstName` / `user.lastName`, which the Vite and
 *    Next `Product`/user types never declared (Vite's tsc never gated the
 *    build). The Next `AuthUser` doesn't declare them either, and the shared
 *    context file is outside this workstream's file boundary, so the fields
 *    are declared via a local intersection type. Runtime behavior is
 *    identical: when the backend returns firstName/lastName they are used,
 *    otherwise the name-split fallback applies.
 */

/** AuthUser extended with the firstName/lastName fields the /me endpoint returns. */
type ProfileUser = AuthUser & { firstName?: string; lastName?: string };

const Profile = () => {
    const { user: authUser, refreshUser } = useAuth();
    const user = authUser as ProfileUser | null;
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

export default Profile;
