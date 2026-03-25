import React, { useRef, useState } from 'react';
import { Upload, Trash2, Loader2, Link2, Image as ImageIcon, Video } from 'lucide-react';
import { uploadToImageKit } from '../../lib/imagekit';
import { MediaManagerModal } from './MediaManagerModal';
import toast from 'react-hot-toast';
import { adminAPI } from '../../lib/apiClient';

interface ImageUploaderProps {
    /** Current value of the URL (image or video URL) */
    value: string;
    /** Called with the new URL after upload or manual paste */
    onChange: (url: string) => void;
    /** Label displayed above the uploader */
    label?: string;
    /** Accepted file types for the file picker. Default: "image/*" */
    accept?: string;
    /** ImageKit folder to upload into */
    folder?: string;
    /** If true, shows the uploader in compact row mode (for gallery additions) */
    compact?: boolean;
    /** If true, shows a video player preview instead of img */
    isVideo?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
    value,
    onChange,
    label,
    accept = 'image/*,video/*',
    folder = 'v2-uploads',
    compact = false,
    isVideo = false,
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [urlDraft, setUrlDraft] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleFile = async (file: File) => {
        if (!file) return;
        setError('');
        setUploading(true);
        
        const uploadPromise = uploadToImageKit(file, folder);
        
        toast.promise(uploadPromise, {
            loading: 'Uploading to ImageKit Cloud...',
            success: 'Upload complete!',
            error: 'Upload failed. Check file size.',
        });

        try {
            const url = await uploadPromise;
            onChange(url);
        } catch (err: any) {
            setError(err?.message || 'Upload failed. Try pasting a URL instead.');
        } finally {
            setUploading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        // reset so the same file can be re-selected
        e.target.value = '';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    };

    const handleUrlPaste = () => {
        if (urlDraft.trim()) {
            onChange(urlDraft.trim());
            setUrlDraft('');
            setShowUrlInput(false);
        }
    };

    if (compact) {
        // Compact mode: used for gallery additions (horizontal strip)
        return (
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-3 py-2 bg-luxury-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-luxury-gold transition-colors disabled:opacity-50"
                >
                    {uploading ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                    {uploading ? 'Processing...' : 'Media Manager'}
                </button>
                <span className="text-[10px] text-gray-400 font-bold">or</span>
                <input
                    type="text"
                    className="flex-1 border-b border-gray-200 focus:border-luxury-black outline-none text-[11px] py-1"
                    placeholder="Paste URL..."
                    value={urlDraft}
                    onChange={e => setUrlDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleUrlPaste(); }}
                />

                <MediaManagerModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSelect={(url) => onChange(url)}
                />
            </div>
        );
    }

    // Full mode: large preview box + upload button
    return (
        <div className="space-y-2">
            {label && (
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400">{label}</label>
            )}

            {/* Drop Zone / Preview */}
            <div
                className="relative w-full aspect-video max-h-52 border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center group transition-colors hover:border-luxury-gold"
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => !value && setIsModalOpen(true)}
                style={{ cursor: value ? 'default' : 'pointer' }}
            >
                {uploading ? (
                    <div className="flex flex-col items-center gap-2 text-luxury-gold">
                        <Loader2 size={28} className="animate-spin" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Uploading to ImageKit...</p>
                    </div>
                ) : value ? (
                    <>
                        {(isVideo || (value && value.match(/\.(mp4|mov|webm|ogg)$/i))) ? (
                            <video src={value} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                        ) : (
                            <img src={value} alt="Preview" className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={e => { e.stopPropagation(); setIsModalOpen(true); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black rounded-lg text-[10px] font-bold hover:bg-luxury-gold hover:text-white transition-colors"
                            >
                                <ImageIcon size={12} /> Cloud Manager
                            </button>
                            <button
                                type="button"
                                onClick={e => { e.stopPropagation(); onChange(''); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-[10px] font-bold hover:bg-red-600 transition-colors"
                            >
                                <Trash2 size={12} /> Remove
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-300 pointer-events-none">
                        {accept.includes('video') ? <Video size={32} /> : <ImageIcon size={32} />}
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            Click or drag & drop to upload
                        </p>
                        <p className="text-[9px] text-gray-300">
                            {accept.includes('video') ? 'Images & Videos • ' : 'Images • '}
                            Stored on ImageKit CDN
                        </p>
                    </div>
                )}
            </div>

            {/* Action row */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-luxury-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-luxury-gold transition-colors disabled:opacity-50 shrink-0"
                >
                    {uploading ? <Loader2 size={11} className="animate-spin" /> : <ImageIcon size={11} />}
                    {uploading ? 'Processing...' : 'Media Manager'}
                </button>
                <button
                    type="button"
                    onClick={() => setShowUrlInput(v => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:border-luxury-gold hover:text-luxury-gold transition-colors shrink-0"
                >
                    <Link2 size={11} /> Paste URL
                </button>
                {value && (
                    <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] text-gray-400 hover:text-luxury-gold truncate max-w-[160px] transition-colors"
                        onClick={e => e.stopPropagation()}
                    >
                        {value.replace('https://', '')}
                    </a>
                )}
            </div>

            {/* URL paste input (collapsible) */}
            {showUrlInput && (
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <input
                        type="text"
                        className="flex-1 bg-transparent outline-none text-[11px] text-gray-600"
                        placeholder="https://ik.imagekit.io/... or any image URL"
                        value={urlDraft}
                        onChange={e => setUrlDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleUrlPaste(); }}
                        autoFocus
                    />
                    <button
                        type="button"
                        onClick={handleUrlPaste}
                        className="px-2 py-1 bg-luxury-black text-white rounded text-[10px] font-bold hover:bg-luxury-gold transition-colors"
                    >
                        Set
                    </button>
                </div>
            )}

            <MediaManagerModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSelect={(url) => onChange(url)}
            />

            {error && (
                <p className="text-red-500 text-[10px] font-bold">{error}</p>
            )}
        </div>
    );
};

export default ImageUploader;
