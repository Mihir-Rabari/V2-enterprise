import re

with open(r"k:\PRO_WORK\v2 - Copy\frontend\components\AdminDashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Define the replacement block
replacement = """            case 'product':
                return (
                    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                        {/* TABS HEADER */}
                        <div className="flex border-b border-gray-100 mb-6 sticky top-0 bg-white z-10 pt-2">
                            {[
                                { id: 'basic', label: 'Basic Info' },
                                { id: 'variants', label: 'Variants & Stats' },
                                { id: 'media', label: 'Media' },
                                { id: 'attributes', label: 'Attributes & Filters' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setProductModalTab(tab.id as 'basic' | 'variants' | 'media' | 'attributes')}
                                    className={`px-4 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${productModalTab === tab.id ? 'border-luxury-black text-luxury-black' : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* TAB CONTENTS */}
                        {productModalTab === 'basic' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Product Name</label>
                                        <input
                                            type="text"
                                            className="w-full border p-2.5 rounded focus:outline-none focus:border-black text-sm"
                                            value={formData.name || ''}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Status</label>
                                        <select
                                            className="w-full border p-2.5 rounded focus:outline-none focus:border-black text-sm bg-white"
                                            value={formData.status || 'ACTIVE'}
                                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        >
                                            <option value="ACTIVE">Active</option>
                                            <option value="INACTIVE">Inactive</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Description</label>
                                    <textarea
                                        className="w-full border p-2.5 rounded focus:outline-none focus:border-black h-24 text-sm"
                                        value={formData.description || ''}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Material & Care</label>
                                    <textarea
                                        className="w-full border p-2.5 rounded focus:outline-none focus:border-black h-24 text-sm"
                                        value={formData.materialCare || ''}
                                        onChange={e => setFormData({ ...formData, materialCare: e.target.value })}
                                        placeholder="Cotton 100%, Machine wash cold, etc."
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Style Code (Group ID)</label>
                                        <div className="relative group/tooltip">
                                            <input
                                                type="text"
                                                className="w-full border p-2.5 rounded focus:outline-none focus:border-black text-sm"
                                                value={formData.styleCode || ''}
                                                onChange={e => setFormData({ ...formData, styleCode: e.target.value })}
                                                placeholder="e.g. V2-TSHIRT-01"
                                            />
                                            <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-black text-white text-[10px] rounded shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-10 pointer-events-none">
                                                Products with the exact same Style Code are considered variants of each other and will cross-link on the product page.
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Primary Color</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                className="h-10 w-12 cursor-pointer border-0 p-0 rounded overflow-hidden"
                                                value={formData.colorHex || '#000000'}
                                                onChange={e => setFormData({ ...formData, colorHex: e.target.value })}
                                                title="Pick actual color shade"
                                            />
                                            <input
                                                type="text"
                                                className="flex-1 border p-2.5 rounded focus:outline-none focus:border-black text-sm"
                                                value={formData.color || ''}
                                                onChange={e => setFormData({ ...formData, color: e.target.value })}
                                                placeholder="Color Name (e.g. Midnight Black)"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Price (₹)</label>
                                        <input
                                            type="number"
                                            className="w-full border p-2.5 rounded focus:outline-none focus:border-black text-sm"
                                            value={formData.price || ''}
                                            onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Original Price (₹)</label>
                                        <input
                                            type="number"
                                            className="w-full border p-2.5 rounded focus:outline-none focus:border-black text-sm"
                                            value={formData.originalPrice || ''}
                                            onChange={e => setFormData({ ...formData, originalPrice: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Discount Text</label>
                                        <input
                                            type="text"
                                            className="w-full border p-2.5 rounded focus:outline-none focus:border-black text-sm"
                                            value={formData.discount || ''}
                                            onChange={e => setFormData({ ...formData, discount: e.target.value })}
                                            placeholder="e.g. 20% OFF"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Main Category</label>
                                        <select
                                            className="w-full border p-2.5 rounded focus:outline-none focus:border-black text-sm bg-white"
                                            value={formData.mainCategory || 'MENSWEAR'}
                                            onChange={e => setFormData({ ...formData, mainCategory: e.target.value })}
                                        >
                                            {mainCategories.map((c, idx) => <option key={c._id || c.id || idx} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Sub Category</label>
                                        <select
                                            className="w-full border p-2.5 rounded focus:outline-none focus:border-black text-sm bg-white"
                                            value={formData.subCategory || ''}
                                            onChange={e => setFormData({ ...formData, subCategory: e.target.value })}
                                        >
                                            <option value="">Select Sub Category</option>
                                            {subCategories.filter(s => s.parentCategory === formData.mainCategory || !formData.mainCategory).map((c, idx) => <option key={c._id || c.id || idx} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 py-2">
                                    <input
                                        type="checkbox"
                                        id="isNew"
                                        className="w-4 h-4 rounded text-slate-800 focus:ring-slate-800"
                                        checked={formData.isNewArrival || false}
                                        onChange={e => setFormData({ ...formData, isNewArrival: e.target.checked })}
                                    />
                                    <label htmlFor="isNew" className="text-sm font-bold text-slate-700 select-none">Mark as New Arrival</label>
                                </div>
                            </div>
                        )}

                        {productModalTab === 'variants' && (
                            <div className="space-y-6">
                                {/* Variants & Inventory */}
                                <div className="space-y-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800">Variants & Inventory</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Size</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. XL"
                                                className="w-full border p-2 rounded text-xs"
                                                value={tempVariant.size}
                                                onChange={e => setTempVariant({ ...tempVariant, size: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Quantity</label>
                                            <input
                                                type="number"
                                                className="w-full border p-2 rounded text-xs"
                                                value={tempVariant.quantity}
                                                onChange={e => setTempVariant({ ...tempVariant, quantity: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!tempVariant.size) return;
                                                    const variants = formData.variants || [];
                                                    setFormData({ ...formData, variants: [...variants, { ...tempVariant }] });
                                                    setTempVariant({ ...tempVariant, size: '', quantity: 0 });
                                                }}
                                                className="w-full bg-luxury-black text-white p-2 rounded text-xs font-bold hover:bg-luxury-gold transition-colors"
                                            >
                                                Add Variant
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mt-4">
                                        {(formData.variants || []).map((v: any, idx: number) => (
                                            <div key={v.size || idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                                <div className="flex gap-4 items-center">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Size</span>
                                                        <span className="text-xs font-bold">{v.size}</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Stock</span>
                                                        <span className="text-xs font-bold text-luxury-gold">{v.quantity}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const variants = [...formData.variants];
                                                        variants.splice(idx, 1);
                                                        setFormData({ ...formData, variants });
                                                    }}
                                                    className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {productModalTab === 'media' && (
                            <div className="space-y-6">
                                {/* Primary Product Image */}
                                <div>
                                    <ImageUploader
                                        label="Primary Product Image"
                                        value={formData.photo || ''}
                                        onChange={url => setFormData({ ...formData, photo: url })}
                                        folder="v2-products"
                                    />
                                </div>

                                {/* Secondary Hover Photo */}
                                <div>
                                    <ImageUploader
                                        label="Secondary Hover Photo (on card hover)"
                                        value={formData.hoverImage || ''}
                                        onChange={url => setFormData({ ...formData, hoverImage: url })}
                                        folder="v2-products"
                                    />
                                </div>

                                {/* Additional Photos Gallery & Video */}
                                <div className="space-y-3">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400">Product Gallery (Additional Photos)</label>
                                    <ImageUploader
                                        value=""
                                        onChange={url => {
                                            if (!url) return;
                                            const photos = formData.photos || [];
                                            setFormData({ ...formData, photos: [...photos, url] });
                                        }}
                                        folder="v2-products"
                                        compact={true}
                                    />

                                    <div className="mt-4">
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Embedded Video URL (e.g. YouTube)</label>
                                        <input
                                            type="text"
                                            className="w-full border p-2.5 rounded focus:outline-none focus:border-black text-sm"
                                            value={formData.videoUrl || ''}
                                            onChange={e => setFormData({ ...formData, videoUrl: e.target.value })}
                                            placeholder="https://www.youtube.com/embed/..."
                                        />
                                    </div>

                                    <div className="flex flex-wrap gap-3 mt-4">
                                        {(formData.photos || []).map((url: string, idx: number) => (
                                            <div key={idx} className="relative w-24 h-24 group">
                                                <img src={url} className="w-full h-full object-cover rounded-xl border border-gray-100 shadow-sm" />

                                                {/* Shift Left */}
                                                {idx > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const photos = [...formData.photos];
                                                            const temp = photos[idx - 1];
                                                            photos[idx - 1] = photos[idx];
                                                            photos[idx] = temp;
                                                            setFormData({ ...formData, photos });
                                                        }}
                                                        className="absolute top-1/2 -left-3 -translate-y-1/2 bg-white text-black rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-gray-100"
                                                        title="Move Left"
                                                    >
                                                        <ChevronLeft size={14} />
                                                    </button>
                                                )}

                                                {/* Shift Right */}
                                                {idx < (formData.photos.length - 1) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const photos = [...formData.photos];
                                                            const temp = photos[idx + 1];
                                                            photos[idx + 1] = photos[idx];
                                                            photos[idx] = temp;
                                                            setFormData({ ...formData, photos });
                                                        }}
                                                        className="absolute top-1/2 -right-3 -translate-y-1/2 bg-white text-black rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-gray-100"
                                                        title="Move Right"
                                                    >
                                                        <ChevronRight size={14} />
                                                    </button>
                                                )}

                                                {/* Delete */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const photos = [...formData.photos];
                                                        photos.splice(idx, 1);
                                                        setFormData({ ...formData, photos });
                                                    }}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                                <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[9px] text-center py-0.5 rounded-b-xl">
                                                    {idx + 1}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {productModalTab === 'attributes' && (
                            <div className="space-y-6">
                                {/* Advanced Attributes */}
                                <div className="space-y-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800">Advanced Attributes (Optional)</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Fabric</label>
                                            <input type="text" className="w-full border p-2 rounded text-sm" value={formData.fabric || ''} onChange={e => setFormData({ ...formData, fabric: e.target.value })} placeholder="e.g. Cotton" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Pattern Type</label>
                                            <input type="text" className="w-full border p-2 rounded text-sm" value={formData.patternType || ''} onChange={e => setFormData({ ...formData, patternType: e.target.value })} placeholder="e.g. Printed" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Collar</label>
                                            <input type="text" className="w-full border p-2 rounded text-sm" value={formData.collar || ''} onChange={e => setFormData({ ...formData, collar: e.target.value })} placeholder="e.g. Round Neck" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Sleeve</label>
                                            <input type="text" className="w-full border p-2 rounded text-sm" value={formData.sleeve || ''} onChange={e => setFormData({ ...formData, sleeve: e.target.value })} placeholder="e.g. Full Sleeve" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Neck</label>
                                            <input type="text" className="w-full border p-2 rounded text-sm" value={formData.neck || ''} onChange={e => setFormData({ ...formData, neck: e.target.value })} placeholder="e.g. V-Neck" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Pocket</label>
                                            <input type="text" className="w-full border p-2 rounded text-sm" value={formData.pocket || ''} onChange={e => setFormData({ ...formData, pocket: e.target.value })} placeholder="e.g. Single Pocket" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Length</label>
                                            <input type="text" className="w-full border p-2 rounded text-sm" value={formData.length || ''} onChange={e => setFormData({ ...formData, length: e.target.value })} placeholder="e.g. 28" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Chest</label>
                                            <input type="text" className="w-full border p-2 rounded text-sm" value={formData.chest || ''} onChange={e => setFormData({ ...formData, chest: e.target.value })} placeholder="e.g. 40" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Waist</label>
                                            <input type="text" className="w-full border p-2 rounded text-sm" value={formData.waist || ''} onChange={e => setFormData({ ...formData, waist: e.target.value })} placeholder="e.g. 32" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Shoulder</label>
                                            <input type="text" className="w-full border p-2 rounded text-sm" value={formData.shoulder || ''} onChange={e => setFormData({ ...formData, shoulder: e.target.value })} placeholder="e.g. 18" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Sleeve Length</label>
                                            <input type="text" className="w-full border p-2 rounded text-sm" value={formData.sleeveLength || ''} onChange={e => setFormData({ ...formData, sleeveLength: e.target.value })} placeholder="e.g. 25" />
                                        </div>
                                    </div>

                                    {/* DYNAMIC SUGGESTIONS ENGINE RENDERING */}
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 mt-6 opacity-70">
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2"><Sparkles size={12} /> Global Attribute Suggestions</h4>
                                        <div className="space-y-4">
                                            {['fabric', 'patternType', 'collar', 'sleeve', 'neck', 'pocket', 'length', 'chest', 'waist', 'shoulder', 'sleeveLength'].map(key => {
                                                const opts = (filterSuggestions as Record<string, string[]>)[key] || [];
                                                if (opts.length === 0) return null;
                                                return (
                                                    <div key={key}>
                                                        <span className="text-[9px] font-bold text-gray-400 block mb-1 uppercase bg-white px-2 py-0.5 inline-block rounded-md border border-gray-100">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                                            {opts.map(opt => (
                                                                <button
                                                                    key={opt}
                                                                    type="button"
                                                                    onClick={() => setFormData({ ...formData, [key]: opt })}
                                                                    className={`text-[10px] px-2 py-1 rounded bg-white hover:bg-black hover:text-white border transition-colors ${formData[key] === opt ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-600'}`}
                                                                >
                                                                    {opt}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
"""

# Find the indices
start_idx = content.find("            case 'product':")
end_idx = content.find("            case 'slider':")

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + replacement + content[end_idx:]
    with open(r"k:\PRO_WORK\v2 - Copy\frontend\components\AdminDashboard.tsx", "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Successfully replaced.")
else:
    print(f"Could not find indices: start={start_idx}, end={end_idx}")
