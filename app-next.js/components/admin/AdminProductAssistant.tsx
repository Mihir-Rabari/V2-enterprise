'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Check, ImagePlus, Loader2, RotateCcw, Sparkles, X } from 'lucide-react';
import { api } from '../../lib/apiClient';

export interface ProductDraft {
    name?: string; description?: string; materialCare?: string; mainCategory?: string;
    subCategory?: string; styleCode?: string; color?: string; size?: string;
    price?: number; quantity?: number; photo?: string; photos?: string[]; [key: string]: unknown;
}
interface Message { role: 'user' | 'assistant'; content: string }
interface DraftReply { reply: string; draft: ProductDraft | null; ready: boolean; missingFields: string[] }

export default function AdminProductAssistant({ onReview, hidden = false }: {
    onReview: (draft: ProductDraft) => void; hidden?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [result, setResult] = useState<DraftReply | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const uploadLock = useRef(false);
    const end = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const launcher = useRef<HTMLButtonElement>(null);
    const sending = useRef(false);
    useEffect(() => { if (open && !hidden) inputRef.current?.focus(); }, [open, hidden]);
    useEffect(() => { end.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }); }, [messages, busy, error, open]);
    const close = () => { setOpen(false); launcher.current?.focus(); };

    async function uploadImages(event: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(event.target.files || []) as File[];
        event.target.value = '';
        if (!files.length || uploadLock.current || sending.current) return;
        if (images.length + files.length > 6) { setError('Attach up to 6 images per product draft.'); return; }
        if (files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
            setError('Use JPEG, PNG or WebP images, each 5 MB or smaller.'); return;
        }
        uploadLock.current = true; setUploading(true); setError(''); setResult(null);
        try {
            for (const file of files) {
                const body = new FormData(); body.append('file', file);
                const response = await api.post('/admin/product-assistant/images', body, {
                    headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000,
                });
                setImages(previous => [...previous, response.data.data.url]);
            }
        } catch (err: unknown) {
            const failure = err as { response?: { data?: { message?: string } } };
            setError(failure.response?.data?.message || 'Image upload failed. Already uploaded images are kept; retry the remaining images.');
        } finally { setUploading(false); uploadLock.current = false; }
    }

    async function send(event: React.FormEvent) {
        event.preventDefault();
        const content = input.trim() || (images.length ? 'Please inspect these product images and help me prepare the product.' : '');
        if (!content || sending.current || uploadLock.current || messages.length >= 30) return;
        sending.current = true;
        const next: Message[] = [...messages, { role: 'user', content }];
        setBusy(true); setError(''); setResult(null);
        try {
            const response = await api.post('/admin/product-assistant', { messages: next, ...(images.length ? { images } : {}) }, { timeout: 120000 });
            const reply: DraftReply = response.data.data;
            setMessages([...next, { role: 'assistant', content: reply.reply }]);
            setResult(reply); setInput('');
        } catch (err: unknown) {
            const failure = err as { response?: { data?: { message?: string } } };
            setError(failure.response?.data?.message || 'Unable to reach the assistant. Please retry.');
        } finally { setBusy(false); sending.current = false; inputRef.current?.focus(); }
    }

    if (hidden) return null;
    return <>
        <button ref={launcher} type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-controls="admin-product-assistant"
            className="fixed bottom-6 right-4 sm:right-8 z-40 flex items-center gap-3 rounded-2xl bg-luxury-black px-5 py-4 text-white shadow-xl hover:bg-slate-800 transition-colors">
            <Sparkles size={18} className="text-luxury-gold" /><span className="text-xs font-bold tracking-wide">AI product assistant</span>
        </button>
        {open && <section id="admin-product-assistant" aria-label="AI product assistant" onKeyDown={e => { if (e.key === 'Escape') close(); }}
            className="fixed bottom-24 right-3 sm:right-8 z-40 flex w-[calc(100vw-1.5rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl h-[min(680px,calc(100dvh-8rem))]">
            <header className="flex items-center gap-3 bg-luxury-black p-5 text-white">
                <Sparkles size={22} className="text-luxury-gold shrink-0" />
                <div className="flex-1"><h2 className="font-serif text-lg">From a thought to a product.</h2><p className="mt-1 text-xs text-gray-300">Chat · Approve draft · Review & add</p></div>
                <button type="button" onClick={close} aria-label="Close product assistant" className="p-2 rounded-lg hover:bg-white/10"><X size={18} /></button>
            </header>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 text-xs text-gray-500">
                <span>Products are saved only after your review.</span>
                <button type="button" disabled={busy || uploading} onClick={() => { setMessages([]); setResult(null); setInput(''); setImages([]); setError(''); inputRef.current?.focus(); }}
                    className="flex items-center gap-1 p-1 hover:text-black disabled:opacity-40" aria-label="Start new product draft"><RotateCcw size={13} />New draft</button>
            </div>
            <div className="flex-1 overflow-y-auto bg-stone-50 p-5 space-y-4">
                {!messages.length && <div className="rounded-xl border border-stone-200 bg-white p-5 text-sm leading-relaxed text-gray-600">
                    <p className="font-serif text-xl text-slate-900 mb-2">What are we adding today?</p>
                    <p>Upload product photos or tell me about the product. I’ll inspect the images, help write its description and collect the size, color, price, category and stock.</p>
                    <p className="mt-3 text-xs text-gray-400">For example: “A navy cotton shirt, size M, ₹1,299, with 20 pieces in stock.”</p>
                </div>}
                <div role="log" aria-label="Product conversation" aria-live="polite" className="space-y-4">
                    {messages.map((message, index) => <div key={index} className={`rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap break-words ${message.role === 'user' ? 'ml-6 bg-luxury-black text-white' : 'mr-3 border border-gray-100 bg-white text-gray-700'}`}>
                        <p className={`mb-2 text-[10px] uppercase font-bold tracking-widest ${message.role === 'user' ? 'text-gray-400' : 'text-amber-700'}`}>{message.role === 'user' ? 'You' : 'Product assistant'}</p>
                        {message.content}
                    </div>)}
                </div>
                {busy && <p role="status" className="flex items-center gap-2 text-xs text-gray-500"><Loader2 size={15} className="animate-spin" />Preparing your product draft…</p>}
                {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                {result?.draft && <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-800 mb-2">Current draft</p>
                    <h3 className="font-serif text-lg text-slate-900">{result.draft.name || 'Your new product'}</h3>
                    <p className="text-xs text-gray-600 mt-2">{[result.draft.color, result.draft.size, result.draft.price !== undefined ? `₹${result.draft.price.toLocaleString('en-IN')}` : '', result.draft.quantity !== undefined ? `${result.draft.quantity} in stock` : ''].filter(Boolean).join(' · ')}</p>
                    {result.ready ? <>
                        <p className="mt-3 text-xs text-gray-600">Review all details in the next step. Attached images will be included.</p>
                        <button type="button" onClick={() => { onReview(result.draft!); setOpen(false); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-luxury-black p-3 text-xs font-bold text-white hover:bg-slate-800"><Check size={16} />Approve & review product</button>
                    </> : <p className="mt-3 text-xs text-amber-900">Still needed: {result.missingFields.map(field => field.replace(/([A-Z])/g, ' $1').toLowerCase()).join(', ')}.</p>}
                </div>}
                <div ref={end} />
            </div>
            <form onSubmit={send} className="border-t border-gray-100 bg-white p-4">
                {!!images.length && <div aria-label="Attached product images" className="mb-3 flex gap-2 overflow-x-auto py-1">
                    {images.map((url, index) => <div key={url} className="relative shrink-0">
                        <img src={url} alt={`Product reference ${index + 1}`} className="h-16 w-16 rounded-lg border border-gray-200 object-cover" />
                        {index === 0 && <span className="absolute bottom-0 left-0 rounded-bl-lg bg-black/75 px-1 text-[9px] text-white">Cover</span>}
                        <button type="button" aria-label={`Detach image ${index + 1}`} disabled={busy || uploading} onClick={() => { setImages(current => current.filter(image => image !== url)); setResult(null); }}
                            className="absolute right-0 top-0 rounded-full bg-white p-1 text-gray-700 shadow disabled:opacity-40"><X size={12} /></button>
                    </div>)}
                </div>}
                <div className="mb-3 flex items-center justify-between gap-2">
                    <label className={`flex items-center gap-2 text-xs font-semibold ${busy || uploading || images.length >= 6 || messages.length >= 30 ? 'text-gray-400' : 'cursor-pointer text-amber-800 hover:text-black'}`}>
                        {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                        {uploading ? 'Uploading images…' : 'Add product photos'}
                        <input aria-label="Upload product photos" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={busy || uploading || images.length >= 6 || messages.length >= 30} onChange={uploadImages} />
                    </label>
                    <span className="text-[10px] text-gray-400">{images.length}/6 · 5 MB each</span>
                </div>
                {uploading && <p role="status" className="sr-only">Uploading product images to R2</p>}
                <p className="mb-3 text-[10px] leading-relaxed text-gray-500">Photos stay in the media library for reuse. Detaching or starting a new draft keeps the uploaded files.</p>
                <label htmlFor="admin-product-message" className="sr-only">Describe your product</label>
                <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-stone-50 p-2 focus-within:border-amber-600">
                    <textarea ref={inputRef} id="admin-product-message" rows={2} maxLength={4000} value={input} disabled={busy || uploading || messages.length >= 30}
                        onChange={e => setInput(e.target.value)} placeholder="Describe your product or refine the draft…"
                        className="min-w-0 flex-1 resize-none bg-transparent p-2 text-sm outline-none disabled:opacity-50" />
                    <button type="submit" aria-label="Send product message" disabled={busy || uploading || (!input.trim() && !images.length) || messages.length >= 30} className="rounded-lg bg-luxury-black p-3 text-white disabled:opacity-40"><ArrowUp size={18} /></button>
                </div>
                {messages.length >= 30 && <p className="mt-2 text-xs text-amber-800">Conversation limit reached. Review your draft or start a new one.</p>}
            </form>
        </section>}
    </>;
}
