'use client';
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Sparkles, Check, Plus, Trash2, LayoutGrid, ChevronUp, ChevronDown, Image as ImageIcon, Save } from 'lucide-react';
import { ImageUploader } from './ImageUploader';
import { settingsAPI } from '../../lib/apiClient';
import { HomeSectionContent, Product } from '../../types';

interface AdminHomeSectionsTabProps {
    homeSections: HomeSectionContent;
    setHomeSections: (val: HomeSectionContent) => void;
    products: Product[];
    setActivePage: (page: string) => void;
}

export const AdminHomeSectionsTab: React.FC<AdminHomeSectionsTabProps> = ({ homeSections, setHomeSections, products, setActivePage }) => {
    const [formData, setFormData] = useState<HomeSectionContent>(homeSections);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setFormData(homeSections);
    }, [homeSections]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await settingsAPI.update({ homeSections: formData });
            setHomeSections(formData);
            alert('Home Sections saved successfully!');
        } catch (error) {
            console.error(error);
            alert('Error saving Home Sections');
        } finally {
            setSaving(false);
        }
    };

    const handleMoveHomeSection = (index: number, direction: 'up' | 'down') => {
        if (!formData.sectionOrder) return;
        const newOrder = [...formData.sectionOrder];
        if (direction === 'up' && index > 0) {
            [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
        } else if (direction === 'down' && index < newOrder.length - 1) {
            [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
        }
        setFormData({ ...formData, sectionOrder: newOrder });
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12 pr-2">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-0 z-20">
                <div>
                    <h2 className="text-3xl font-serif italic text-slate-800">Home Sections</h2>
                    <p className="text-gray-500 text-sm">Design and configure your shop's homepage natively.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-luxury-black text-white px-6 py-3 rounded-xl font-bold hover:bg-luxury-gold transition-colors disabled:opacity-50"
                >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save All Changes'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Section Order */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-1 h-fit sticky top-28">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-indigo-50 text-indigo-500 rounded-xl"><LayoutDashboard size={20} /></div>
                        <h3 className="text-lg font-bold text-slate-800">Section Hierarchy</h3>
                    </div>
                    <div className="space-y-3">
                        {formData.sectionOrder?.map((sectionId, index) => (
                            <div
                                key={sectionId}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-luxury-gold transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-bold text-gray-300 w-4">0{index + 1}</span>
                                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-700">{sectionId.replace('-', ' ')}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleMoveHomeSection(index, 'up')}
                                        disabled={index === 0}
                                        className="p-1.5 text-gray-400 hover:text-luxury-black disabled:opacity-30 disabled:hover:text-gray-400 focus:outline-none"
                                    >
                                        <ChevronUp size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleMoveHomeSection(index, 'down')}
                                        disabled={index === formData.sectionOrder.length - 1}
                                        className="p-1.5 text-gray-400 hover:text-luxury-black disabled:opacity-30 disabled:hover:text-gray-400 focus:outline-none"
                                    >
                                        <ChevronDown size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="mt-6 text-[10px] text-gray-400 font-bold uppercase tracking-widest italic text-center">Sections display top to bottom.</p>
                </div>

                {/* Right Column: Cards Configuration */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Section 1: General Headings */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold border-b pb-2 flex items-center gap-2">
                            <LayoutDashboard size={14} /> General Headings
                        </h4>
                        <div className="space-y-4 pt-2">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Categories Section Title</label>
                                <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold transition-colors outline-none" value={formData.categoriesTitle || ''} onChange={e => setFormData({ ...formData, categoriesTitle: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: The New Standard */}
                    <div className={`p-6 rounded-2xl border transition-all duration-300 shadow-sm ${formData.newStandard?.isVisible !== false ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-200 opacity-75'}`}>
                        <div className="flex items-center justify-between border-b pb-2 mb-4">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold flex items-center gap-2">
                                <Sparkles size={14} /> The New Standard Banner
                            </h4>
                            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm hover:border-luxury-gold transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.newStandard?.isVisible ?? true}
                                    onChange={e => setFormData({
                                        ...formData,
                                        newStandard: {
                                            ...(formData.newStandard || {}),
                                            isVisible: e.target.checked
                                        }
                                    })}
                                    className="accent-luxury-gold"
                                />
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Live</span>
                            </label>
                        </div>
                        <div className={`space-y-4 transition-all ${formData.newStandard?.isVisible === false ? 'pointer-events-none opacity-50' : ''}`}>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Tagline</label>
                                    <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold transition-colors outline-none" value={formData.newStandard?.tagline || ''} onChange={e => setFormData({ ...formData, newStandard: { ...(formData.newStandard || {}), tagline: e.target.value } })} placeholder="The New Standard" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Title (use \n for break)</label>
                                    <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold transition-colors outline-none" value={formData.newStandard?.title || ''} onChange={e => setFormData({ ...formData, newStandard: { ...(formData.newStandard || {}), title: e.target.value } })} placeholder="Elevate Your \n Everyday." />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Description</label>
                                <textarea className="w-full border border-gray-200 p-2.5 rounded-lg text-sm h-20 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold transition-colors outline-none" value={formData.newStandard?.description || ''} onChange={e => setFormData({ ...formData, newStandard: { ...(formData.newStandard || {}), description: e.target.value } })} placeholder="Discover the latest additions..." />
                            </div>
                            <div className="pt-2 border-t border-gray-50">
                                <ImageUploader
                                    label="Banner Image Overlay (Leave blank for auto-picked new arrival)"
                                    value={formData.newStandard?.image || ''}
                                    onChange={url => setFormData({ ...formData, newStandard: { ...(formData.newStandard || {}), image: url } })}
                                    folder="v2-banners"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Button Text</label>
                                    <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold transition-colors outline-none" value={formData.newStandard?.buttonText || ''} onChange={e => setFormData({ ...formData, newStandard: { ...(formData.newStandard || {}), buttonText: e.target.value } })} placeholder="The New Collection" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Target Link</label>
                                    <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold transition-colors outline-none" value={formData.newStandard?.link || ''} onChange={e => setFormData({ ...formData, newStandard: { ...(formData.newStandard || {}), link: e.target.value } })} placeholder="/new-arrivals" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
