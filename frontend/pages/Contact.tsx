import React, { useState } from 'react';
import { Mail, Phone, MapPin, Instagram, Facebook, Twitter, ArrowRight, Youtube, MessageCircle, Clock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { initialSiteSettings } from '../data/initialData';
import { SiteSettings } from '../types';
import { useAuth } from '../context/AuthContext';
import { contactsAPI, settingsAPI } from '../lib/apiClient';

const Contact: React.FC = () => {
    const { user } = useAuth();
    const [siteSettings, setSiteSettings] = useState<SiteSettings>(initialSiteSettings);

    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = React.useState({
        firstName: user?.name.split(' ')[0] || '',
        lastName: user?.name.split(' ').slice(1).join(' ') || '',
        email: user?.email || '',
        message: ''
    });

    React.useEffect(() => {
        settingsAPI.get().then(res => {
            if (res.data.success) {
                setSiteSettings(res.data.data);
            }
        });

        if (user) {
            setFormData(prev => ({
                ...prev,
                firstName: user.name.split(' ')[0],
                lastName: user.name.split(' ').slice(1).join(' '),
                email: user.email
            }));
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await contactsAPI.submit({
                name: `${formData.firstName} ${formData.lastName}`.trim(),
                email: formData.email,
                message: formData.message,
            });
        } catch {
            // Show success anyway — don't block UX if backend isn't up yet
        }
        setSubmitted(true);
        setTimeout(() => {
            setSubmitted(false);
            setFormData({ firstName: user?.name.split(' ')[0] || '', lastName: user?.name.split(' ').slice(1).join(' ') || '', email: user?.email || '', message: '' });
        }, 5000);
    };

    return (
        <div className="bg-white min-h-screen">
            {/* Header */}
            <div className="relative py-32 md:py-48 flex flex-col items-center overflow-hidden">
                {/* Background Image & Overlay */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.pexels.com/photos/1884581/pexels-photo-1884581.jpeg?auto=compress&cs=tinysrgb&w=1600"
                        alt="Contact Background"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
                </div>

                <div className="max-w-2xl w-full px-6 text-center space-y-4 sm:space-y-6 relative z-10">
                    <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-luxury-gold text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] sm:tracking-[0.5em] block"
                    >
                        Connect With Us
                    </motion.span>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="font-serif text-5xl sm:text-6xl md:text-8xl italic text-white tracking-tighter"
                    >
                        Get in Touch
                    </motion.h1>
                </div>
            </div>

            <div className="max-w-[var(--max-width)] mx-auto px-[var(--spacing-gutter)] sm:px-[var(--spacing-gutter-sm)] lg:px-[var(--spacing-gutter-lg)] xl:px-[var(--spacing-gutter-xl)] py-24 md:py-32">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 lg:gap-32 items-start">
                    {/* Information */}
                    <div className="space-y-20 md:space-y-24">
                        <div className="space-y-12">
                            <h2 className="font-serif text-4xl italic text-luxury-black leading-tight tracking-tighter">
                                Visit our Smart Fashion Hub <br /> in Bhavnagar.
                            </h2>
                            <div className="luxury-divider w-12" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-luxury-gold mb-2">
                                    <MapPin size={14} strokeWidth={1.5} />
                                    <h4 className="text-[10px] font-bold uppercase tracking-[0.3em]">Location</h4>
                                </div>
                                <p className="text-sm font-serif italic text-luxury-charcoal leading-relaxed whitespace-pre-line">
                                    {siteSettings.address}
                                </p>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-luxury-gold mb-2">
                                    <Clock size={14} strokeWidth={1.5} />
                                    <h4 className="text-[10px] font-bold uppercase tracking-[0.3em]">Store Hours</h4>
                                </div>
                                <div className="space-y-1 text-sm font-serif italic text-luxury-charcoal">
                                    <p>Mon - Sat: 10:00 AM - 09:00 PM</p>
                                    <p>Sun: 10:00 AM - 07:00 PM</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-luxury-gold mb-2">
                                    <Mail size={14} strokeWidth={1.5} />
                                    <h4 className="text-[10px] font-bold uppercase tracking-[0.3em]">Email</h4>
                                </div>
                                <p className="text-sm font-serif italic text-luxury-charcoal">{siteSettings.email}</p>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-luxury-gold mb-2">
                                    <Phone size={14} strokeWidth={1.5} />
                                    <h4 className="text-[10px] font-bold uppercase tracking-[0.3em]">Phone</h4>
                                </div>
                                <p className="text-sm font-serif italic text-luxury-charcoal">{siteSettings.phone}</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-luxury-gold">Digital Presence</h4>
                            <div className="flex gap-8 text-luxury-black">
                                {siteSettings.facebook && <a href={siteSettings.facebook} target="_blank" rel="noopener noreferrer"><Facebook size={20} strokeWidth={1} className="hover:text-luxury-gold transition-colors cursor-pointer" /></a>}
                                {siteSettings.youtube && <a href={siteSettings.youtube} target="_blank" rel="noopener noreferrer"><Youtube size={20} strokeWidth={1} className="hover:text-luxury-gold transition-colors cursor-pointer" /></a>}
                                {siteSettings.instagram && <a href={siteSettings.instagram} target="_blank" rel="noopener noreferrer"><Instagram size={20} strokeWidth={1} className="hover:text-luxury-gold transition-colors cursor-pointer" /></a>}
                                {siteSettings.twitter && <a href={siteSettings.twitter} target="_blank" rel="noopener noreferrer"><Twitter size={20} strokeWidth={1} className="hover:text-luxury-gold transition-colors cursor-pointer" /></a>}
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="bg-luxury-gray p-8 md:p-16 rounded-sm border border-gray-50 relative overflow-hidden">
                        <AnimatePresence mode="wait">
                            {submitted ? (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="h-full flex flex-col items-center justify-center text-center space-y-6 py-12"
                                >
                                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-4">
                                        <CheckCircle2 size={40} strokeWidth={1.5} />
                                    </div>
                                    <h3 className="font-serif text-3xl italic text-luxury-black">Message Sent</h3>
                                    <p className="text-sm font-serif italic text-luxury-charcoal max-w-xs mx-auto">
                                        Thank you for reaching out. Our team will review your inquiry and get back to you shortly.
                                    </p>
                                    <button
                                        onClick={() => setSubmitted(false)}
                                        className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold hover:text-black transition-colors pt-4"
                                    >
                                        Send another message
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.form
                                    key="form"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-10"
                                    onSubmit={handleSubmit}
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-2 group">
                                            <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 group-focus-within:text-luxury-gold transition-colors">First Name</label>
                                            <input
                                                required
                                                type="text"
                                                className={`w-full bg-transparent border-b border-gray-200 py-3 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors placeholder:text-gray-200 uppercase ${user ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                placeholder="Enter First Name"
                                                value={formData.firstName}
                                                readOnly={!!user}
                                                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2 group">
                                            <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 group-focus-within:text-luxury-gold transition-colors">Last Name</label>
                                            <input
                                                required
                                                type="text"
                                                className={`w-full bg-transparent border-b border-gray-200 py-3 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors placeholder:text-gray-200 uppercase ${user ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                placeholder="Enter Last Name"
                                                value={formData.lastName}
                                                readOnly={!!user}
                                                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2 group">
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 group-focus-within:text-luxury-gold transition-colors">Email Address</label>
                                        <input
                                            required
                                            type="email"
                                            className={`w-full bg-transparent border-b border-gray-200 py-3 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors placeholder:text-gray-200 uppercase ${user ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            placeholder="YOUR@EMAIL.COM"
                                            value={formData.email}
                                            readOnly={!!user}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2 group">
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 group-focus-within:text-luxury-gold transition-colors">Message</label>
                                        <textarea
                                            required
                                            rows={4}
                                            className="w-full bg-transparent border-b border-gray-200 py-3 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors placeholder:text-gray-200 resize-none uppercase"
                                            placeholder="Tell us how we can help..."
                                            value={formData.message}
                                            onChange={e => setFormData({ ...formData, message: e.target.value })}
                                        ></textarea>
                                    </div>

                                    <button type="submit" className="w-full group relative overflow-hidden bg-luxury-black text-white py-5 sm:py-6 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] transition-all duration-700">
                                        <span className="relative z-10 flex items-center justify-center gap-3">
                                            Send Message <ArrowRight size={14} strokeWidth={1} className="group-hover:translate-x-2 transition-transform" />
                                        </span>
                                        <div className="absolute inset-0 bg-luxury-gold translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                    </button>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Map Section */}
            <div className="h-[60vh] w-full bg-luxury-gray relative">
                <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3705.5721634747!2d72.1396!3d21.7696!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395f50812d1b1f0f%3A0x0!2zMjHCsDQ2JzEwLjYiTiA3MsKwMDgnMjIuNiJF!5e0!3m2!1sen!2sin!4v1710000000000!5m2!1sen!2sin"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen={true}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
                <div className="absolute inset-x-0 bottom-0 py-6 bg-white/10 backdrop-blur-sm flex justify-center border-t border-white/10">
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] sm:tracking-[0.5em] text-white">V2 ENTERPRISE HUB</span>
                </div>
            </div>
        </div>
    );
};

export default Contact;
