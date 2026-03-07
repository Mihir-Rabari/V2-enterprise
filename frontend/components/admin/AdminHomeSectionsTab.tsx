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
                            <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Featured Tagline</label>
                                    <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold transition-colors outline-none" value={formData.featuredTagline || ''} onChange={e => setFormData({ ...formData, featuredTagline: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Featured Title</label>
                                    <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold transition-colors outline-none" value={formData.featuredTitle || ''} onChange={e => setFormData({ ...formData, featuredTitle: e.target.value })} />
                                </div>
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

                    {/* Section 3: Promotional Banner */}
                    <div className={`p-6 rounded-2xl border transition-all duration-300 shadow-sm ${formData.promotionalBanner?.isVisible ? 'bg-luxury-black border-luxury-black text-white' : 'bg-gray-50 border-gray-200 opacity-75'}`}>
                        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold flex items-center gap-2">
                                <Sparkles size={14} /> Promotional Callout Banner
                            </h4>
                            <label className="flex items-center gap-2 cursor-pointer bg-white/10 px-3 py-1 rounded-full border border-white/5 hover:border-luxury-gold transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.promotionalBanner?.isVisible}
                                    onChange={e => setFormData({
                                        ...formData,
                                        promotionalBanner: {
                                            ...(formData.promotionalBanner || {}),
                                            isVisible: e.target.checked
                                        }
                                    })}
                                    className="accent-luxury-gold"
                                />
                                <span className={`text-xs font-bold uppercase tracking-widest ${formData.promotionalBanner?.isVisible ? 'text-white' : 'text-slate-700'}`}>Live</span>
                            </label>
                        </div>
                        <div className={`space-y-4 transition-all ${!formData.promotionalBanner?.isVisible ? 'pointer-events-none opacity-50' : ''}`}>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-luxury-gold mb-1">Banner Title</label>
                                    <input type="text" className="w-full bg-white/5 border border-white/10 p-2.5 rounded-lg text-sm text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold transition-colors outline-none" value={formData.promotionalBanner?.title || ''} onChange={e => setFormData({ ...formData, promotionalBanner: { ...(formData.promotionalBanner || {}), title: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-luxury-gold mb-1">Banner Subtitle</label>
                                    <input type="text" className="w-full bg-white/5 border border-white/10 p-2.5 rounded-lg text-sm text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold transition-colors outline-none" value={formData.promotionalBanner?.subtitle || ''} onChange={e => setFormData({ ...formData, promotionalBanner: { ...(formData.promotionalBanner || {}), subtitle: e.target.value } })} />
                                </div>
                            </div>
                            <div className="pt-2">
                                <ImageUploader
                                    label="Background Image (Will be darkened)"
                                    value={formData.promotionalBanner?.image || ''}
                                    onChange={url => setFormData({ ...formData, promotionalBanner: { ...(formData.promotionalBanner || {}), image: url } })}
                                    folder="v2-banners"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                                <div>
                                    <label className="block text-xs font-bold text-luxury-gold mb-1">Button Text</label>
                                    <input type="text" className="w-full bg-white/5 border border-white/10 p-2.5 rounded-lg text-sm text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold transition-colors outline-none" value={formData.promotionalBanner?.buttonText || ''} onChange={e => setFormData({ ...formData, promotionalBanner: { ...(formData.promotionalBanner || {}), buttonText: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-luxury-gold mb-1">Target Link</label>
                                    <input type="text" className="w-full bg-white/5 border border-white/10 p-2.5 rounded-lg text-sm text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold transition-colors outline-none" value={formData.promotionalBanner?.link || ''} onChange={e => setFormData({ ...formData, promotionalBanner: { ...(formData.promotionalBanner || {}), link: e.target.value } })} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Featured Categories */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold flex items-center gap-2">
                                <LayoutGrid size={14} /> Hand-Picked Featured Categories
                            </h4>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cols:</span>
                                <input
                                    type="range"
                                    min="2" max="4" step="1"
                                    value={formData.categoryColumns || 3}
                                    onChange={(e) => setFormData({ ...formData, categoryColumns: Number(e.target.value) })}
                                    className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-luxury-gold"
                                />
                                <span className="text-[10px] font-bold text-slate-700">{formData.categoryColumns || 3}</span>
                            </div>
                        </div>
                        <div className="space-y-6 pt-2">
                            {formData.categories?.map((cat: any, idx: number) => (
                                <div key={idx} className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden relative group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-luxury-gold opacity-50"></div>
                                    <div className="p-4 flex gap-6 items-start">
                                        <div className="w-32 flex-shrink-0">
                                            <ImageUploader
                                                value={cat.image}
                                                onChange={url => {
                                                    const newCats = [...formData.categories];
                                                    newCats[idx] = { ...newCats[idx], image: url };
                                                    setFormData({ ...formData, categories: newCats });
                                                }}
                                                folder="v2-categories"
                                                compact
                                            />
                                            {cat.image && (
                                                <img src={cat.image} alt={cat.title} className="mt-2 w-full aspect-square object-cover rounded-lg border border-gray-200" />
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <p className="text-[9px] font-bold text-luxury-gold uppercase tracking-[0.2em] mb-2">Category Box 0{idx + 1}</p>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Display Title</label>
                                                <input
                                                    type="text"
                                                    placeholder="Shirts & Polos"
                                                    className="w-full bg-white border border-gray-200 p-2 rounded-lg text-sm focus:border-luxury-gold outline-none transition-colors font-bold text-slate-700"
                                                    value={cat.title}
                                                    onChange={e => {
                                                        const newCats = [...formData.categories];
                                                        newCats[idx] = { ...newCats[idx], title: e.target.value };
                                                        setFormData({ ...formData, categories: newCats });
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Target Link URL</label>
                                                <input
                                                    type="text"
                                                    placeholder="/categories/shirts"
                                                    className="w-full bg-white border border-gray-200 p-2 rounded-lg text-sm focus:border-luxury-gold outline-none transition-colors text-slate-500"
                                                    value={cat.link}
                                                    onChange={e => {
                                                        const newCats = [...formData.categories];
                                                        newCats[idx] = { ...newCats[idx], link: e.target.value };
                                                        setFormData({ ...formData, categories: newCats });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Section 5: Trending Picker */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold border-b pb-2 flex items-center gap-2">
                            <Check size={14} /> Trending Picker (Hand-Picked Products)
                        </h4>
                        <div className="pt-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Currently Highlighted</p>
                            <div className="flex flex-wrap gap-2">
                                {(formData.trendingProductIds || []).map(id => {
                                    const p = products.find(prod => prod.id === id);
                                    return (
                                        <div key={id} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs font-bold text-slate-600 flex items-center gap-2 shrink-0">
                                            {p ? p.name.substring(0, 15) + (p.name.length > 15 ? '...' : '') : id}
                                            <button
                                                onClick={() => setFormData({ ...formData, trendingProductIds: (formData.trendingProductIds || []).filter(tid => tid !== id) })}
                                                className="text-rose-500 hover:text-rose-700 bg-rose-50 rounded-full p-0.5"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    );
                                })}
                                <button onClick={() => setActivePage('products')} className="px-4 py-1.5 bg-luxury-black text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-luxury-gold transition-colors flex items-center gap-1 shadow-md">
                                    <Plus size={12} /> Add More From Products
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Section 6: Promotional Sliders */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold flex items-center gap-2">
                                <ImageIcon size={14} /> Promotional Sliders (Images & Videos)
                            </h4>
                            <button
                                onClick={() => {
                                    const newSlides = [...(formData.promotionalSliders || []), {
                                        id: Date.now(),
                                        image: '',
                                        title: 'New Slider',
                                        subtitle: 'NEW PROMOTION',
                                        link: '/shop',
                                        buttonText: 'Discover Collection'
                                    }];
                                    setFormData({ ...formData, promotionalSliders: newSlides });
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-luxury-black text-white hover:bg-luxury-gold transition-colors text-[9px] font-bold uppercase tracking-widest rounded-lg shadow-sm"
                            >
                                <Plus size={12} /> Add Slide
                            </button>
                        </div>
                        <div className="space-y-6 pt-2">
                            {(!formData.promotionalSliders || formData.promotionalSliders.length === 0) && (
                                <div className="text-center py-8 text-gray-400 text-[10px] font-bold uppercase tracking-widest border-2 border-dashed border-gray-100 rounded-xl">
                                    No slides added yet
                                </div>
                            )}
                            {formData.promotionalSliders?.map((slide: any, idx: number) => (
                                <div key={idx} className="bg-white border-2 border-gray-100 rounded-xl p-5 relative group hover:border-luxury-gold transition-colors">
                                    <button
                                        onClick={() => {
                                            const newSlides = formData.promotionalSliders.filter((_: any, i: number) => i !== idx);
                                            setFormData({ ...formData, promotionalSliders: newSlides });
                                        }}
                                        className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 z-10"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <div className="flex flex-col lg:flex-row gap-6">
                                        <div className="w-full lg:w-1/3">
                                            <ImageUploader
                                                label="Slide Media (Image or MP4)"
                                                value={slide.image}
                                                onChange={url => {
                                                    const newSlides = [...formData.promotionalSliders];
                                                    newSlides[idx] = { ...newSlides[idx], image: url };
                                                    setFormData({ ...formData, promotionalSliders: newSlides });
                                                }}
                                                folder="v2-hero-slides"
                                                accept="image/*,video/*"
                                            />
                                        </div>
                                        <div className="w-full lg:w-2/3 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Slide Title</label>
                                                    <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg text-sm font-bold focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold transition-colors outline-none" value={slide.title} onChange={e => {
                                                        const newSlides = [...formData.promotionalSliders];
                                                        newSlides[idx] = { ...newSlides[idx], title: e.target.value };
                                                        setFormData({ ...formData, promotionalSliders: newSlides });
                                                    }} />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Slide Subtitle</label>
                                                    <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold transition-colors outline-none" value={slide.subtitle} onChange={e => {
                                                        const newSlides = [...formData.promotionalSliders];
                                                        newSlides[idx] = { ...newSlides[idx], subtitle: e.target.value };
                                                        setFormData({ ...formData, promotionalSliders: newSlides });
                                                    }} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Button Text</label>
                                                    <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold transition-colors outline-none" value={slide.buttonText} onChange={e => {
                                                        const newSlides = [...formData.promotionalSliders];
                                                        newSlides[idx] = { ...newSlides[idx], buttonText: e.target.value };
                                                        setFormData({ ...formData, promotionalSliders: newSlides });
                                                    }} />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Target Link URL</label>
                                                    <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold transition-colors outline-none text-slate-500" value={slide.link} onChange={e => {
                                                        const newSlides = [...formData.promotionalSliders];
                                                        newSlides[idx] = { ...newSlides[idx], link: e.target.value };
                                                        setFormData({ ...formData, promotionalSliders: newSlides });
                                                    }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
