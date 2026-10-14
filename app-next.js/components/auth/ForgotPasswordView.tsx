'use client';

/**
 * Ported from frontend/pages/ForgotPassword.tsx (Vite/React Router) to Next.js
 * App Router. Rendered at /forgot-password by app/forgot-password/page.tsx —
 * at the app ROOT, outside the storefront layout, matching the Vite App.tsx
 * route placement (`<Route path="/forgot-password">` sits above the CustomerView
 * catch-all, so this page renders standalone: no Navbar/Footer).
 *
 * Mechanical changes: react-router-dom <Link to> → next/link <Link href>.
 *
 * Behavior preserved: client-side '@' pre-check with visible error, the
 * anti-enumeration policy (success screen shown even when the API call fails),
 * loading state, the AnimatePresence form↔success transition, all copy.
 *
 * Latent strict-tsc fix (behavior-neutral): the source's unused
 * `catch (err: any)` binding becomes an optional catch binding — identical
 * runtime behavior (both paths set submitted = true).
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Mail, ArrowRight, ChevronLeft, CheckCircle } from 'lucide-react';
import { authAPI } from '../../lib/apiClient';

const ForgotPasswordView: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email.includes('@')) {
            setError('Please enter a valid email address.');
            return;
        }
        setLoading(true);
        try {
            await authAPI.forgotPassword(email);
            setSubmitted(true);
        } catch {
            // Even on real errors, show success to prevent email enumeration
            setSubmitted(true);
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
                        <img src="/v2_logo.webp" alt="V2 Logo" className="h-10 sm:h-12 w-auto object-contain group-hover:scale-110 transition-transform duration-700" />
                    </Link>
                    <div className="space-y-1">
                        <h2 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] sm:tracking-[0.5em] text-gray-400">Account Recovery</h2>
                        <h1 className="font-serif text-3xl italic text-luxury-black">Reset Access</h1>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 backdrop-blur-2xl border border-gray-100 p-10 rounded-[2.5rem] shadow-2xl shadow-black/5"
                >
                    <AnimatePresence mode="wait">
                        {submitted ? (
                            // ── Success State ──────────────────────────────────────
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center space-y-6 py-4"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                                    className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto"
                                >
                                    <CheckCircle className="text-green-600" size={32} />
                                </motion.div>
                                <div className="space-y-2">
                                    <h3 className="font-serif text-xl italic text-luxury-black">Check Your Inbox</h3>
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 leading-relaxed">
                                        If an account exists for <span className="text-luxury-black">{email}</span>, a password reset link has been sent.
                                    </p>
                                </div>
                                <p className="text-[10px] text-gray-400 leading-relaxed">
                                    The link expires in 1 hour. Check your spam folder if you don't see it.
                                </p>
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-luxury-gold hover:text-luxury-black transition-colors"
                                >
                                    Return to Login <ArrowRight size={12} />
                                </Link>
                            </motion.div>
                        ) : (
                            // ── Email Form ─────────────────────────────────────────
                            <motion.form
                                key="form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onSubmit={handleSubmit}
                                className="space-y-8"
                            >
                                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 leading-relaxed">
                                    Enter the email associated with your account. We'll send a secure reset link.
                                </p>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-red-50 border border-red-100 p-4 rounded-sm text-[9px] font-bold text-red-800 uppercase tracking-widest text-center"
                                    >
                                        {error}
                                    </motion.div>
                                )}

                                <div className="group space-y-2">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 group-focus-within:text-luxury-gold transition-colors">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={16} />
                                        <input
                                            type="email"
                                            required
                                            autoFocus
                                            className="w-full bg-transparent border-b border-gray-100 py-3 pl-8 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors"
                                            placeholder="your@email.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full group relative overflow-hidden bg-luxury-black text-white py-5 sm:py-6 rounded-2xl text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.4em] transition-all hover:shadow-2xl shadow-black/10 disabled:opacity-50"
                                >
                                    <div className="relative z-10 flex items-center justify-center gap-3">
                                        {loading ? 'Sending Link...' : 'Send Reset Link'}
                                        {!loading && <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />}
                                    </div>
                                    <div className="absolute inset-0 bg-luxury-gold translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                </button>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    {!submitted && (
                        <div className="mt-10 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                Remembered it? <Link href="/login" className="text-luxury-gold hover:underline">Back to Login</Link>
                            </p>
                        </div>
                    )}
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

export default ForgotPasswordView;
