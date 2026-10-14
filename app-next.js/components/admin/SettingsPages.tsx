'use client';
import React from 'react';
import { Globe, Check, Eye, Edit } from 'lucide-react';
import { settingsAPI } from '../../lib/apiClient';
import { SiteSettings, AboutPageContent } from '../../types';

// --- SOCIAL SETTINGS PAGE ---
export const SocialSettingsPage: React.FC<{
    siteSettings: SiteSettings;
    setSiteSettings: (s: SiteSettings) => void;
}> = ({ siteSettings, setSiteSettings }) => (
    <div className="space-y-8 animate-fade-in pb-12">
        <div className="flex justify-between items-end">
            <div>
                <h2 className="text-4xl font-serif italic text-slate-800 mb-2">Social Connect</h2>
                <p className="text-gray-500">Manage your global social presence and platform links.</p>
            </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {[
                    { key: 'instagram', label: 'Instagram URL' },
                    { key: 'twitter', label: 'Twitter / X URL' },
                    { key: 'facebook', label: 'Facebook URL' },
                    { key: 'youtube', label: 'YouTube URL' },
                ].map((social) => (
                    <div key={social.key}>
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">{social.label}</label>
                        <input
                            type="text"
                            className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm"
                            value={(siteSettings as any)[social.key] || ''}
                            onChange={e => setSiteSettings({ ...siteSettings, [social.key]: e.target.value })}
                        />
                    </div>
                ))}
            </div>
            <button
                onClick={async () => {
                    try {
                        await settingsAPI.update({ instagram: siteSettings.instagram, twitter: siteSettings.twitter, facebook: siteSettings.facebook, youtube: siteSettings.youtube });
                        alert('Social links saved!');
                    } catch (err) { alert('Failed to save.'); }
                }}
                className="bg-luxury-black text-white px-8 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-luxury-gold transition-all"
            >
                <Globe size={18} /> Save Social Links
            </button>
        </div>
    </div>
);

// --- CONTACT DETAILS PAGE ---
export const ContactDetailsPage: React.FC<{
    siteSettings: SiteSettings;
    setSiteSettings: (s: SiteSettings) => void;
}> = ({ siteSettings, setSiteSettings }) => (
    <div className="space-y-8 animate-fade-in pb-12">
        <div className="flex justify-between items-end">
            <div>
                <h2 className="text-4xl font-serif italic text-slate-800 mb-2">Contact Details</h2>
                <p className="text-gray-500">Edit your store's public contact information.</p>
            </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Public Email</label>
                    <input type="email" className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm" value={siteSettings.email || ''} onChange={e => setSiteSettings({ ...siteSettings, email: e.target.value })} />
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Phone Number</label>
                    <input type="text" className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm" value={siteSettings.phone || ''} onChange={e => setSiteSettings({ ...siteSettings, phone: e.target.value })} />
                </div>
            </div>
            <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Store Address</label>
                <textarea className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm h-24" value={siteSettings.address || ''} onChange={e => setSiteSettings({ ...siteSettings, address: e.target.value })} />
            </div>
            <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Store Hours</label>
                <textarea className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm h-20" value={siteSettings.storeHours || ''} onChange={e => setSiteSettings({ ...siteSettings, storeHours: e.target.value })} />
            </div>
            <button
                onClick={async () => {
                    try {
                        await settingsAPI.update({ email: siteSettings.email, phone: siteSettings.phone, address: siteSettings.address, storeHours: siteSettings.storeHours });
                        alert('Contact details saved!');
                    } catch (err) { alert('Failed to save.'); }
                }}
                className="bg-luxury-black text-white px-8 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-luxury-gold transition-all"
            >
                <Check size={18} /> Save Contact Details
            </button>
        </div>
    </div>
);

// --- ABOUT PAGE SETTINGS ---
export const AboutSettingsPage: React.FC<{
    aboutContent: AboutPageContent;
    onEdit: () => void;
}> = ({ aboutContent, onEdit }) => (
    <div className="space-y-12 animate-fade-in pb-12">
        <div className="flex justify-between items-end">
            <div>
                <h2 className="text-4xl font-serif italic text-slate-800 mb-2">About Page Archive</h2>
                <p className="text-gray-500">Curate the heritage and vision of your brand.</p>
            </div>
            <button onClick={onEdit} className="px-8 py-4 bg-luxury-gold text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-xl shadow-luxury-gold/20 hover:opacity-90 transition-all">
                Edit Page Blueprint
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-2 rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
                <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden grayscale contrast-125">
                    <img src={aboutContent.heroImage} className="w-full h-full object-cover" alt="About Hero" />
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-8 text-center">
                        <span className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.4em] mb-4">{aboutContent.heroTagline}</span>
                        <h4 className="text-3xl font-serif italic text-white whitespace-pre-line">{aboutContent.heroTitle}</h4>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
                <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-xl space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-luxury-gray text-luxury-gold rounded-xl"><Eye size={20} /></div>
                        <h3 className="text-2xl font-serif italic text-slate-800">{aboutContent.visionTagline}</h3>
                    </div>
                    <div className="space-y-6">
                        <h4 className="text-xl font-bold text-slate-800 leading-tight">{aboutContent.visionTitle}</h4>
                        <div className="space-y-4 text-gray-500 italic text-sm leading-relaxed">
                            <p>{aboutContent.visionDescription1}</p>
                            <p>{aboutContent.visionDescription2}</p>
                        </div>
                    </div>
                    <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Vision Image Archive</span>
                        <img src={aboutContent.visionImage} className="w-24 h-16 object-cover rounded-lg grayscale border border-gray-100" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {aboutContent.values?.map((v: any, i: number) => (
                        <div key={i} className="bg-luxury-gray p-6 rounded-2xl border border-gray-100">
                            <span className="text-luxury-gold text-[10px] font-bold uppercase tracking-widest block mb-4">0{i + 1}</span>
                            <h5 className="font-serif italic text-lg text-slate-800 mb-2">{v.title}</h5>
                            <p className="text-[11px] text-gray-400 line-clamp-3 leading-relaxed italic">"{v.description}"</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);
