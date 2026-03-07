import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Search, Check, Grid, List, Loader2, Image as ImageIcon } from 'lucide-react';
import { adminAPI } from '../../lib/apiClient';
import { IMedia } from '../../types';

interface MediaManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string) => void;
}

export const MediaManagerModal: React.FC<MediaManagerModalProps> = ({ isOpen, onClose, onSelect }) => {
    const [media, setMedia] = useState<IMedia[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const fetchMedia = async () => {
        setLoading(true);
        try {
            const res = await adminAPI.getMedia();
            if (res.data.success) {
                setMedia(res.data.data.media || []);
            }
        } catch (err) {
            console.error('Failed to fetch media:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchMedia();
        }
    }, [isOpen]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const res = await adminAPI.uploadImage(file);
            if (res.data.success) {
                const newMedia = res.data.data;
                // Add to list and select it
                setMedia(prev => [newMedia, ...prev]);
                onSelect(newMedia.url);
                onClose();
            }
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const filteredMedia = media.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-luxury-black/60 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-5xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 border-b flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-serif italic text-luxury-black">Cloud Media Manager</h2>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Manage and select your brand assets</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center hover:bg-white hover:shadow-lg transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-4 border-b flex flex-col md:flex-row gap-4 bg-white/50">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search assets..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-2xl text-xs focus:ring-2 focus:ring-luxury-gold/20 outline-none"
                        />
                    </div>

                    <label className="flex items-center gap-2 bg-luxury-black text-white px-6 py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-luxury-gold transition-all shadow-lg active:scale-95">
                        {uploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                        <span>{uploading ? 'Uploading...' : 'Upload Local'}</span>
                        <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
                    </label>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50/30">
                    {loading ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-4 text-gray-400">
                            <Loader2 className="animate-spin" size={32} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Accessing Cloud Storage...</span>
                        </div>
                    ) : filteredMedia.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-4 text-gray-400">
                            <ImageIcon size={48} strokeWidth={1} />
                            <p className="text-xs font-bold uppercase tracking-widest">No assets found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {filteredMedia.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => {
                                        onSelect(m.url);
                                        onClose();
                                    }}
                                    className="group relative aspect-square bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-luxury-gold transition-all hover:shadow-xl"
                                >
                                    <img
                                        src={m.url}
                                        alt={m.name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="bg-white/90 backdrop-blur text-[10px] font-bold text-luxury-black py-2 px-4 rounded-full uppercase tracking-widest translate-y-2 group-hover:translate-y-0 transition-transform">
                                            Select
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                                        <p className="text-[8px] font-bold text-white truncate">{m.name}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Cloud Storage: {media.length} items found
                    </p>
                </div>
            </motion.div>
        </div>
    );
};
