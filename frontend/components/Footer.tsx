import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Twitter, Facebook, ArrowRight, Youtube, MessageCircle, Truck, CreditCard, RefreshCw, Headphones, MapPin, Phone, Mail, LucideIcon } from 'lucide-react';
import { SiteSettings, FeatureItem } from '../types';
import { initialSiteSettings, initialFeatures } from '../data/initialData';
import { settingsAPI, contentAPI } from '../lib/apiClient';
import { useState, useEffect } from 'react';

interface FooterProps {
    onSwitchToAdmin?: () => void;
}

const Footer: React.FC<FooterProps> = ({ onSwitchToAdmin }) => {
    const [siteSettings, setSiteSettings] = useState<SiteSettings>(initialSiteSettings);
    const [features, setFeatures] = useState<FeatureItem[]>(initialFeatures);

    useEffect(() => {
        settingsAPI.get().then(res => {
            if (res.data.success && res.data.data) {
                setSiteSettings(res.data.data);
            }
        }).catch(err => console.error('Error fetching settings for footer:', err));

        contentAPI.getByType('FEATURE_ITEM').then(res => {
            if (res.data.success && res.data.data) {
                setFeatures(res.data.data.map((item: any) => ({
                    id: item._id,
                    icon: item.caption,
                    title: item.title,
                    description: item.text
                })));
            }
        }).catch(err => console.error('Error fetching features:', err));
    }, []);

    const iconMap: { [key: string]: LucideIcon } = {
        'Truck': Truck,
        'CreditCard': CreditCard,
        'RefreshCw': RefreshCw,
        'Headphones': Headphones
    };

    const socialLinks = [
        { icon: Instagram, url: siteSettings.instagram, label: 'Instagram' },
        { icon: Twitter, url: siteSettings.twitter, label: 'Twitter' },
        { icon: Facebook, url: siteSettings.facebook, label: 'Facebook' },
        { icon: Youtube, url: siteSettings.youtube, label: 'Youtube' }
    ].filter(link => link.url);

    return (
        <footer className="bg-white border-t border-gray-50 pt-12 pb-12">
            <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
                {/* Features Bar */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-24 py-16 border-b border-gray-50">
                    {features.map((feature) => {
                        const Icon = iconMap[feature.icon] || Truck;
                        return (
                            <div key={feature.id} className="flex flex-col items-center text-center space-y-4">
                                <div className="bg-gray-50 p-4 rounded-full">
                                    <Icon size={24} strokeWidth={1} className="text-luxury-black" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-luxury-black">{feature.title}</h4>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">{feature.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 lg:gap-24 mb-24">
                    {/* Brand Section */}
                    <div className="space-y-8">
                        <Link to="/" className="flex flex-col group">
                            {siteSettings.logoImage ? (
                                <img src={siteSettings.logoImage} alt={siteSettings.logoText} className="h-10 w-auto object-contain self-start" />
                            ) : (
                                <img src="/v2_logo.webp" alt="V2 Logo" className="h-10 w-auto object-contain self-start" />
                            )}
                            <span className="text-[8px] sm:text-[9px] font-bold tracking-[0.1em] sm:tracking-[0.3em] uppercase mt-1 text-gray-400">{siteSettings.slogan}</span>
                        </Link>
                        <div className="space-y-4 text-[10px] font-bold uppercase tracking-widest text-luxury-charcoal leading-relaxed">
                            <p className="flex items-start gap-3">
                                <MapPin size={12} className="mt-1 flex-shrink-0 text-luxury-gold" />
                                <span className="whitespace-pre-line">{siteSettings.address}</span>
                            </p>
                            <p className="flex items-center gap-3">
                                <Mail size={12} className="flex-shrink-0 text-luxury-gold" />
                                <span>{siteSettings.email}</span>
                            </p>
                            <p className="flex items-center gap-3">
                                <Phone size={12} className="flex-shrink-0 text-luxury-gold" />
                                <span>{siteSettings.phone}</span>
                            </p>
                        </div>
                        <a href="#" className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-luxury-gold border-b border-luxury-gold/20 pb-1 hover:border-luxury-gold transition-all">
                            Get Directions <ArrowRight size={10} />
                        </a>
                    </div>

                    {/* Navigation */}
                    <div className="space-y-8">
                        <h4 className="text-[10px] font-bold uppercase tracking-luxury-widest text-luxury-gold">Help</h4>
                        <div className="flex flex-col space-y-4 text-[10px] font-bold uppercase tracking-luxury text-luxury-charcoal">
                            <Link to="/privacy" className="hover:text-luxury-black transition-colors">Privacy Policy</Link>
                            <Link to="/returns" className="hover:text-luxury-black transition-colors">Returns & Exchanges</Link>
                            <Link to="/shipping" className="hover:text-luxury-black transition-colors">Shipping & Delivery</Link>
                            <Link to="/terms" className="hover:text-luxury-black transition-colors">Terms & Conditions</Link>
                        </div>
                    </div>

                    {/* Store Info */}
                    <div className="space-y-8">
                        <div className="space-y-8">
                            <h4 className="text-[10px] font-bold uppercase tracking-luxury-widest text-luxury-gold">About Us</h4>
                            <div className="flex flex-col space-y-4 text-[10px] font-bold uppercase tracking-luxury text-luxury-charcoal">
                                <Link to="/contact" className="hover:text-luxury-black transition-colors">Contact Us</Link>
                                <Link to="/login" className="hover:text-luxury-black transition-colors">Sign In</Link>
                            </div>
                        </div>
                        <div className="space-y-6 pt-4">
                            <h4 className="text-[10px] font-bold uppercase tracking-luxury-widest text-luxury-gold">Store Hours</h4>
                            <div className="space-y-2 text-[10px] font-bold uppercase tracking-luxury text-luxury-charcoal whitespace-pre-line">
                                {siteSettings.storeHours}
                            </div>
                        </div>
                    </div>

                    {/* Social & Connect */}
                    <div className="space-y-8">
                        <h4 className="text-[10px] font-bold uppercase tracking-luxury-widest text-luxury-gold">Connect</h4>
                        <div className="flex gap-4">
                            {socialLinks.map((link, idx) => (
                                <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center hover:bg-luxury-black hover:text-white transition-all cursor-pointer group">
                                    <link.icon size={16} strokeWidth={1.5} />
                                </a>
                            ))}
                            {siteSettings.youtube && (
                                <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center hover:bg-luxury-black hover:text-white transition-all cursor-pointer">
                                    <MessageCircle size={16} strokeWidth={1.5} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="pt-12 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-8">
                    <span className="text-[9px] font-bold tracking-luxury-widest text-gray-400 uppercase">
                        {siteSettings.copyright}
                    </span>
                    <div className="flex items-center gap-4 grayscale opacity-60">
                        {/* Payment Icons Simulation */}
                        <div className="px-3 py-1 border border-gray-100 rounded bg-white text-[9px] font-black italic tracking-tighter text-blue-900">VISA</div>
                        <div className="px-3 py-1 border border-gray-100 rounded bg-white text-[9px] font-black italic tracking-tighter text-red-600">mastercard</div>
                        <div className="px-3 py-1 border border-gray-100 rounded bg-white text-[9px] font-black italic tracking-tighter text-purple-600">PhonePe</div>
                        <div className="px-3 py-1 border border-gray-100 rounded bg-white text-[9px] font-black italic tracking-tighter text-blue-500 uppercase">Paytm</div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
