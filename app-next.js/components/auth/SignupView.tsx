'use client';

/**
 * Ported from frontend/pages/Register.tsx (Vite/React Router) to Next.js App
 * Router. NOTE — the Vite app routed /signup to Signup.tsx, which is a pure
 * re-export of Register.tsx (`export { default } from './Register'`); Register
 * holds the actual signup form, so this component IS the /signup page.
 *
 * Mechanical changes:
 *  - react-router-dom: useNavigate → next/navigation useRouter, <Link to> →
 *    next/link <Link href>.
 *  - Redirect target: source read `location.state?.from?.pathname ||
 *    searchParams.get('redirect') || '/account'` — the App Router port keeps
 *    the `?redirect=` param path (no React Router state equivalent). The
 *    (server) page reads the param and hands it in as a prop (same
 *    params-as-prop pattern as reset-password), so this view has no
 *    useSearchParams()/Suspense and the form renders in the server HTML.
 *
 * Behavior preserved: same fields (name/email/phone optional/password/confirm),
 * same validation order + messages (validateRequired, validateEmail, match,
 * min-length 6), settingsAPI logo fetch on mount, useAuth().register call,
 * localError || authError display, loading state, post-register redirect.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Phone, ArrowRight, ChevronLeft } from 'lucide-react';
import { settingsAPI } from '../../lib/apiClient';
import { SiteSettings } from '../../types';
// No initialData imports allowed. 100% dynamic.
import { validateEmail, validateRequired } from '../../lib/validation';
import { useAuth } from '../../context/AuthContext';

const SignupView: React.FC<{ redirectPath: string }> = ({ redirectPath }) => {
    const { register, authError } = useAuth();
    const router = useRouter();

    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
    const [loading, setLoading] = useState(false);
    const [localError, setLocalError] = useState('');
    const [siteSettings, setSiteSettings] = useState<SiteSettings>({} as SiteSettings);

    useEffect(() => {
        settingsAPI.get().then(res => {
            if (res.data.success && res.data.data) {
                setSiteSettings(res.data.data);
            }
        }).catch(err => console.error('Error fetching settings for register:', err));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');

        if (!validateRequired(form.name)) {
            setLocalError('Full name is required.');
            return;
        }
        if (!validateEmail(form.email)) {
            setLocalError('Please enter a valid email address.');
            return;
        }
        if (form.password !== form.confirm) {
            setLocalError('Passwords do not match.');
            return;
        }
        if (form.password.length < 6) {
            setLocalError('Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        try {
            const success = await register({
                name: form.name,
                email: form.email,
                password: form.password,
                phone: form.phone || undefined,
            });
            if (success) router.replace(redirectPath);
        } finally {
            setLoading(false);
        }
    };

    const displayError = localError || authError;

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-luxury-gray rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-luxury-gold/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl opacity-30" />

            <div className="w-full max-w-md relative z-10">
                {/* Brand Header */}
                <div className="text-center mb-10 space-y-3">
                    <Link href="/" className="inline-block group">
                        {siteSettings.logoImage ? (
                            <img src={siteSettings.logoImage} alt={siteSettings.logoText} className="h-10 w-auto object-contain group-hover:scale-110 transition-transform duration-700" />
                        ) : (
                            <img src="/v2_logo.webp" alt="V2 Logo" className="h-10 w-auto object-contain group-hover:scale-110 transition-transform duration-700" />
                        )}
                    </Link>
                    <div className="space-y-1">
                        <h2 className="text-[9px] font-bold uppercase tracking-[0.4em] text-gray-400">Create Your Account</h2>
                        <h1 className="font-serif text-3xl italic text-luxury-black">Join the Circle</h1>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 backdrop-blur-2xl border border-gray-100 p-10 rounded-[2.5rem] shadow-2xl shadow-black/5"
                >
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {displayError && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-red-50 border border-red-100 p-4 rounded-sm text-[9px] font-bold text-red-800 uppercase tracking-widest text-center"
                            >
                                {displayError}
                            </motion.div>
                        )}

                        {/* Name */}
                        <div className="group space-y-2">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 group-focus-within:text-luxury-gold transition-colors">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={16} />
                                <input name="name" type="text" required value={form.name} onChange={handleChange}
                                    className="w-full bg-transparent border-b border-gray-100 py-3 pl-7 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors"
                                    placeholder="Your full name" />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="group space-y-2">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 group-focus-within:text-luxury-gold transition-colors">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={16} />
                                <input name="email" type="email" required value={form.email} onChange={handleChange}
                                    className="w-full bg-transparent border-b border-gray-100 py-3 pl-7 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors"
                                    placeholder="your@email.com" />
                            </div>
                        </div>

                        {/* Phone (optional) */}
                        <div className="group space-y-2">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 group-focus-within:text-luxury-gold transition-colors">Phone <span className="normal-case font-normal tracking-normal">(optional)</span></label>
                            <div className="relative">
                                <Phone className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={16} />
                                <input name="phone" type="tel" value={form.phone} onChange={handleChange}
                                    className="w-full bg-transparent border-b border-gray-100 py-3 pl-7 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors"
                                    placeholder="+91 XXXXX XXXXX" />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="group space-y-2">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 group-focus-within:text-luxury-gold transition-colors">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={16} />
                                <input name="password" type="password" required value={form.password} onChange={handleChange}
                                    className="w-full bg-transparent border-b border-gray-100 py-3 pl-7 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors"
                                    placeholder="Minimum 6 characters" />
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="group space-y-2">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 group-focus-within:text-luxury-gold transition-colors">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={16} />
                                <input name="confirm" type="password" required value={form.confirm} onChange={handleChange}
                                    className="w-full bg-transparent border-b border-gray-100 py-3 pl-7 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors"
                                    placeholder="Repeat your password" />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full group relative overflow-hidden bg-luxury-black text-white py-5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] transition-all hover:shadow-2xl shadow-black/10 disabled:opacity-50"
                        >
                            <div className="relative z-10 flex items-center justify-center gap-3">
                                {loading ? 'Creating Account...' : 'Create Account'} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                            <div className="absolute inset-0 bg-luxury-gold translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            Already have an account? <Link href="/login" className="text-luxury-gold hover:underline">Sign In</Link>
                        </p>
                    </div>
                </motion.div>

                <div className="mt-10 text-center">
                    <Link href="/" className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors">
                        <ChevronLeft size={16} /> Return to Universe
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default SignupView;
