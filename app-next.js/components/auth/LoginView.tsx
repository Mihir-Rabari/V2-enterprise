'use client';

/**
 * Ported from frontend/pages/Login.tsx (Vite/React Router) to Next.js App Router.
 * Rendered at /login by app/(storefront)/login/page.tsx — inside the storefront
 * layout (Navbar/Footer + provider stack), matching the Vite CustomerView route
 * `<Route path="login" element={<Login />} />`.
 *
 * Mechanical changes:
 *  - react-router-dom: useNavigate → next/navigation useRouter, <Link to> →
 *    next/link <Link href>.
 *  - The redirect target is preserved exactly: the Vite source read
 *    `location.state?.from?.pathname || searchParams.get('redirect') || '/account'`.
 *    React Router navigation state has no App Router equivalent, so the guard on
 *    /account passes the origin path via the `?redirect=` query param — the
 *    param Login already supported in the source. The (server) page reads that
 *    param and hands it in as a prop (same params-as-prop pattern as
 *    reset-password), so this view has no useSearchParams()/Suspense and the
 *    form renders in the server HTML.
 *
 * Latent strict-tsc fixes (behavior-neutral, original never ran tsc):
 *  - Dropped the unused `validateEmail` import and the unused `Shield` icon
 *    (imported in the Vite file, never referenced).
 *  - Kept the source's silent early-return for a missing '@' (the form's
 *    type="email" + required attributes already block submit in browsers).
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, ChevronLeft } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
// No initialData imports allowed. 100% dynamic.

const LoginView: React.FC<{ redirectPath: string }> = ({ redirectPath }) => {
    const { login, authError } = useAuth();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { settings: siteSettings } = useSettings();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Preserved from the source: silently ignore an email without '@'.
        // (Browser-level `type="email" required` validation already guards this
        // in practice — identical to the Vite behavior.)
        if (!email.includes('@')) {
            return;
        }

        setLoading(true);
        try {
            const success = await login(email, password);
            if (success) router.replace(redirectPath);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Accents */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-luxury-gray rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-luxury-gold/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl opacity-30" />

            <div className="w-full max-w-md relative z-10">
                {/* Brand Header */}
                <div className="text-center mb-12 space-y-4">
                    <Link href="/" className="inline-block group">
                        {siteSettings.logoImage ? (
                            <img src={siteSettings.logoImage} alt={siteSettings.logoText} className="h-10 sm:h-12 w-auto object-contain group-hover:scale-110 transition-transform duration-700" />
                        ) : (
                            <img src="/v2_logo.webp" alt="V2 Logo" className="h-10 sm:h-12 w-auto object-contain group-hover:scale-110 transition-transform duration-700" />
                        )}
                    </Link>
                    <div className="space-y-1">
                        <h2 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] sm:tracking-[0.5em] text-gray-400">Secure Point of Entry</h2>
                        <h1 className="font-serif text-3xl italic text-luxury-black">Client Access</h1>
                    </div>
                </div>

                {/* Login Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 backdrop-blur-2xl border border-gray-100 p-10 rounded-[2.5rem] shadow-2xl shadow-black/5"
                >
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {authError && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-red-50 border border-red-100 p-4 rounded-sm text-[9px] font-bold text-red-800 uppercase tracking-widest text-center"
                            >
                                {authError}
                            </motion.div>
                        )}

                        <div className="space-y-6">
                            <div className="group space-y-2">
                                <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 group-focus-within:text-luxury-gold transition-colors">Identification (Email)</label>
                                <div className="relative">
                                    <Mail className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={16} />
                                    <input
                                        type="email"
                                        required
                                        className="w-full bg-transparent border-b border-gray-100 py-3 pl-8 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors placeholder:opacity-0"
                                        placeholder="Email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="group space-y-2">
                                <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 group-focus-within:text-luxury-gold transition-colors">Secure Key (Password)</label>
                                <div className="relative">
                                    <Lock className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={16} />
                                    <input
                                        type="password"
                                        required
                                        className="w-full bg-transparent border-b border-gray-100 py-3 pl-8 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors placeholder:opacity-0"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                                <div className="flex justify-end pt-1">
                                    <Link href="/forgot-password" className="text-[9px] font-bold uppercase tracking-widest text-gray-400 hover:text-luxury-gold transition-colors">
                                        Forgot Password?
                                    </Link>
                                </div>
                            </div>
                        </div>



                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full group relative overflow-hidden bg-luxury-black text-white py-5 sm:py-6 rounded-2xl text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.4em] transition-all hover:shadow-2xl shadow-black/10 disabled:opacity-50"
                        >
                            <div className="relative z-10 flex items-center justify-center gap-3">
                                {loading ? 'Synchronizing...' : 'Synchronize View'} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                            <div className="absolute inset-0 bg-luxury-gold translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                        </button>
                    </form>

                    <div className="mt-12 text-center space-y-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            Don't have an account? <Link href="/signup" className="text-luxury-gold hover:underline">Register Now</Link>
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-t border-gray-50 pt-4">
                            Looking for System Shell? <Link href="/admin/login" className="text-luxury-gold hover:underline">Administrator Login</Link>
                        </p>
                    </div>
                </motion.div>

                <div className="mt-12 text-center">
                    <Link href="/" className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors">
                        <ChevronLeft size={16} /> Return to Universe
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LoginView;
