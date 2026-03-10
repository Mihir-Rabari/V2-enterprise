import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ShieldCheck, ChevronLeft, AlertTriangle } from 'lucide-react';
import { authAPI, settingsAPI } from '../lib/apiClient';
import { SiteSettings } from '../types';
import { initialSiteSettings } from '../data/initialData';
import { useEffect } from 'react';
import { validateEmail } from '../lib/validation';

const AdminLogin: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [siteSettings, setSiteSettings] = useState<SiteSettings>(initialSiteSettings);
    const navigate = useNavigate();

    useEffect(() => {
        settingsAPI.get().then(res => {
            if (res.data.success && res.data.data) {
                setSiteSettings(res.data.data);
            }
        }).catch(err => console.error('Error fetching settings for admin login:', err));
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateEmail(email)) {
            setError('Please enter a valid administrator email address.');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const res = await authAPI.login({ email, password });
            const { user, token } = res.data.data;

            if (user.role !== 'ADMIN') {
                setError('Access denied. Administrator credentials required.');
                setLoading(false);
                return;
            }

            // Store admin token + flag for ProtectedAdminRoute
            localStorage.setItem('v2_token', token);
            localStorage.setItem('v2_user', JSON.stringify(user));
            localStorage.setItem('v2_admin_session', 'true');
            navigate('/admin');
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                || 'Authorization failed. Please verify your credentials.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-luxury-gray flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-white/50 backdrop-blur-3xl" />
            <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] bg-luxury-gold/5 rounded-full blur-[100px]" />
            <div className="absolute bottom-[20%] left-[10%] w-[300px] h-[300px] bg-luxury-black/5 rounded-full blur-[80px]" />

            <div className="w-full max-w-sm relative z-10">
                <div className="text-center mb-12 space-y-4">
                    <Link to="/" className="inline-block group">
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="flex flex-col items-center"
                        >
                            {siteSettings.logoImage ? (
                                <img src={siteSettings.logoImage} alt={siteSettings.logoText} className="h-10 sm:h-12 w-auto object-contain group-hover:scale-110 transition-transform duration-700" />
                            ) : (
                                <img src="/v2_logo.webp" alt="V2 Logo" className="h-10 sm:h-12 w-auto object-contain group-hover:scale-110 transition-transform duration-700" />
                            )}
                            <div className="w-8 h-[1px] bg-luxury-gold/30 mt-4" />
                        </motion.div>
                    </Link>
                    <div className="space-y-1">
                        <p className="text-[9px] font-bold uppercase tracking-[0.6em] text-luxury-black/40">Enterprise Portal</p>
                        <h1 className="text-xs font-bold text-luxury-black tracking-[0.3em] uppercase">Administrative Authorization</h1>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-gray-100 p-8 rounded-3xl shadow-2xl shadow-black/5"
                >
                    <form onSubmit={handleLogin} className="space-y-6">
                        {import.meta.env.VITE_USE_MOCK_API === 'true' && (
                            <div className="bg-luxury-gold/10 border border-luxury-gold/20 p-4 rounded-xl mb-4">
                                <p className="text-[9px] font-bold text-luxury-gold uppercase tracking-[0.2em] mb-1">Mock Mode Active</p>
                                <p className="text-[10px] text-luxury-black/60 font-medium">Use: <span className="text-luxury-black font-bold">kunal.raykangor1994@gmail.com</span></p>
                                <p className="text-[10px] text-luxury-black/60 font-medium">Pass: <span className="text-luxury-black font-bold">any</span></p>
                            </div>
                        )}

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-start gap-3 bg-red-50 border border-red-100 p-4 rounded-xl"
                            >
                                <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                                <p className="text-[9px] font-bold text-red-700 uppercase tracking-widest">{error}</p>
                            </motion.div>
                        )}

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-luxury-black/40">Admin Email</label>
                            <div className="relative flex items-center border-b border-gray-100 pb-3">
                                <Mail size={14} className="text-gray-300 mr-3" />
                                <input
                                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                    className="flex-1 bg-transparent text-[11px] font-bold tracking-widest focus:outline-none text-luxury-black"
                                    placeholder="admin@v2fashion.com"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-luxury-black/40">Passphrase</label>
                            <div className="relative flex items-center border-b border-gray-100 pb-3">
                                <Lock size={14} className="text-gray-300 mr-3" />
                                <input
                                    type="password" required value={password} onChange={e => setPassword(e.target.value)}
                                    className="flex-1 bg-transparent text-[11px] font-bold tracking-widest focus:outline-none text-luxury-black"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit" disabled={loading}
                            className="w-full group relative overflow-hidden bg-luxury-black text-white py-4 rounded-xl text-[10px] font-bold uppercase tracking-[0.3em] transition-all disabled:opacity-50 mt-4"
                        >
                            <div className="relative z-10 flex items-center justify-center gap-3">
                                <ShieldCheck size={14} />
                                {loading ? 'Verifying...' : 'Authorize Access'}
                                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                            <div className="absolute inset-0 bg-luxury-gold translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                        </button>
                    </form>
                </motion.div>

                <div className="mt-8 text-center">
                    <Link to="/" className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors">
                        <ChevronLeft size={14} /> Return to Storefront
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
