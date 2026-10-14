'use client';

/**
 * Ported from frontend/pages/ResetPassword.tsx (Vite/React Router) to Next.js
 * App Router. Rendered at /reset-password/[token] by
 * app/reset-password/[token]/page.tsx — at the app ROOT, outside the storefront
 * layout, matching the Vite App.tsx route placement (`<Route
 * path="/reset-password/:token">` sits above the CustomerView catch-all, so
 * this page renders standalone: no Navbar/Footer).
 *
 * Mechanical changes:
 *  - react-router useParams → the token arrives as a prop from the (server)
 *    page, which awaits the App Router params Promise and passes the string.
 *  - useNavigate → next/navigation useRouter; <Link to> → next/link <Link href>.
 *  - The API contract is unchanged: authAPI.resetPassword posts
 *    { password } to /auth/reset-password/:token.
 *
 * Behavior preserved: validation order + messages (min 6 chars, match, missing
 * token), password visibility toggle, the live strength meter (labels/colors/
 * widths), the API error message extraction with the expired-link fallback, the
 * success screen and its 3-second auto-redirect to /login, all copy.
 *
 * Latent strict-tsc fix (behavior-neutral): the source's `catch (err: any)`
 * becomes a typed `catch (err: unknown)` with a local response cast — same
 * message extraction, no `any`.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, ChevronLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../../lib/apiClient';

const ResetPasswordView: React.FC<{ token: string }> = ({ token }) => {
    const router = useRouter();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (!token) {
            setError('Invalid reset link. Please request a new one.');
            return;
        }

        setLoading(true);
        try {
            await authAPI.resetPassword(token, password);
            setSuccess(true);
            setTimeout(() => router.push('/login'), 3000);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                || 'This link is invalid or has expired. Please request a new one.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const passwordStrength = () => {
        if (password.length === 0) return null;
        if (password.length < 6) return { label: 'Too Short', color: '#EF4444', width: '25%' };
        if (password.length < 8) return { label: 'Weak', color: '#F59E0B', width: '50%' };
        if (password.length < 12 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) return { label: 'Good', color: '#10B981', width: '75%' };
        return { label: 'Strong', color: '#059669', width: '100%' };
    };
    const strength = passwordStrength();

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
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
                        <h1 className="font-serif text-3xl italic text-luxury-black">New Password</h1>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 backdrop-blur-2xl border border-gray-100 p-10 rounded-[2.5rem] shadow-2xl shadow-black/5"
                >
                    <AnimatePresence mode="wait">
                        {success ? (
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
                                    <h3 className="font-serif text-xl italic text-luxury-black">Password Updated</h3>
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 leading-relaxed">
                                        Your password has been reset successfully. Redirecting to login...
                                    </p>
                                </div>
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-luxury-gold hover:text-luxury-black transition-colors"
                                >
                                    Go to Login <ArrowRight size={12} />
                                </Link>
                            </motion.div>
                        ) : (
                            // ── Password Form ──────────────────────────────────────
                            <motion.form
                                key="form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onSubmit={handleSubmit}
                                className="space-y-8"
                            >
                                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 leading-relaxed">
                                    Choose a strong, new password for your account.
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

                                <div className="space-y-6">
                                    {/* New Password */}
                                    <div className="group space-y-2">
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 group-focus-within:text-luxury-gold transition-colors">
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={16} />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                autoFocus
                                                className="w-full bg-transparent border-b border-gray-100 py-3 pl-8 pr-8 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors"
                                                placeholder="Min. 6 characters"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                        {/* Strength Bar */}
                                        {strength && (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
                                                <div className="w-full h-0.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: strength.width }}
                                                        className="h-full rounded-full transition-all"
                                                        style={{ background: strength.color }}
                                                    />
                                                </div>
                                                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: strength.color }}>
                                                    {strength.label}
                                                </p>
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Confirm Password */}
                                    <div className="group space-y-2">
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 group-focus-within:text-luxury-gold transition-colors">
                                            Confirm Password
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={16} />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                className={`w-full bg-transparent border-b py-3 pl-8 text-[11px] font-bold tracking-widest focus:outline-none transition-colors ${
                                                    confirmPassword && password !== confirmPassword
                                                        ? 'border-red-300 focus:border-red-500'
                                                        : 'border-gray-100 focus:border-luxury-black'
                                                }`}
                                                placeholder="Repeat password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                            />
                                        </div>
                                        {confirmPassword && password !== confirmPassword && (
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-red-500">Passwords do not match</p>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full group relative overflow-hidden bg-luxury-black text-white py-5 sm:py-6 rounded-2xl text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.4em] transition-all hover:shadow-2xl shadow-black/10 disabled:opacity-50"
                                >
                                    <div className="relative z-10 flex items-center justify-center gap-3">
                                        {loading ? 'Updating...' : 'Set New Password'}
                                        {!loading && <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />}
                                    </div>
                                    <div className="absolute inset-0 bg-luxury-gold translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                </button>
                            </motion.form>
                        )}
                    </AnimatePresence>
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

export default ResetPasswordView;
