'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X, Send, RotateCcw, ShoppingBag } from 'lucide-react';
import { chatAPI } from '../../lib/apiClient';
import { useCart } from '../../context/CartContext';
import { getOptimizedImageUrl } from '../../utils/mediaUtils';
import { Product } from '../../types';

interface ProductCardData {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    photo: string;
    color?: string;
    url: string;
}

interface CartAddAction {
    type: 'add_to_cart';
    quantity: number;
    size?: string;
    color?: string;
    product: Product & { id: string };
}

interface ChatMessage {
    role: 'user' | 'assistant';
    text: string;
    cards?: ProductCardData[];
}

interface StoredChat {
    sessionId?: string;
    messages: ChatMessage[];
    ended?: boolean;
}

const STORAGE_KEY = 'v2_chat';
const MAX_INPUT = 500;
const GREETING: ChatMessage = {
    role: 'assistant',
    text: "Hi! I'm V2 Assist. Tell me what you're shopping for (an occasion, colour, fabric or budget) and I'll find options and add them to your bag.",
};
const SUGGESTIONS = ['Show me linen shirts', 'Something for a wedding', "What's in my bag?"];

const formatPrice = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/**
 * Renders assistant text as plain text. Only relative store paths (/product/…, /checkout, …)
 * become links; nothing is ever injected as HTML.
 */
const AssistantText: React.FC<{ text: string; onNavigate: () => void }> = ({ text, onNavigate }) => {
    const parts = text.split(/(\/(?:product\/[a-f0-9]{24}|shop|cart|checkout|returns|shipping|contact|size-guide|account\/orders)\b)/gi);
    return (
        <>
            {parts.map((part, i) =>
                i % 2 === 1 ? (
                    <Link key={i} href={part} onClick={onNavigate} className="underline underline-offset-2 hover:text-luxury-gold">
                        {part}
                    </Link>
                ) : (
                    <React.Fragment key={i}>{part}</React.Fragment>
                )
            )}
        </>
    );
};

const ChatWidget: React.FC = () => {
    const { cart, addToCart } = useCart();
    const [enabled, setEnabled] = useState(false);
    const [open, setOpen] = useState(false);
    const [chat, setChat] = useState<StoredChat>({ messages: [GREETING] });
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Persist only after the saved chat has been read, so the initial greeting never overwrites it.
    const [hydrated, setHydrated] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Only show the launcher when the backend has the assistant switched on.
    useEffect(() => {
        chatAPI.status()
            .then(res => setEnabled(!!res.data?.data?.enabled))
            .catch(() => setEnabled(false));
        try {
            const saved = sessionStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved) as StoredChat;
                if (Array.isArray(parsed.messages) && parsed.messages.length > 0) setChat(parsed);
            }
        } catch {
            /* ignore malformed storage */
        }
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(chat)); } catch { /* storage full or disabled */ }
    }, [chat, hydrated]);

    useEffect(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, [chat.messages.length, sending, open]);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    const close = useCallback(() => setOpen(false), []);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, close]);

    const reset = () => {
        setChat({ messages: [GREETING] });
        setError(null);
        setInput('');
    };

    const send = async (raw: string) => {
        const message = raw.trim().slice(0, MAX_INPUT);
        if (!message || sending || chat.ended) return;
        setError(null);
        setInput('');
        setChat(prev => ({ ...prev, messages: [...prev.messages, { role: 'user', text: message }] }));
        setSending(true);
        try {
            const res = await chatAPI.send({
                sessionId: chat.sessionId,
                message,
                cart: cart.slice(0, 30).map(item => ({
                    productId: String(item._id || item.id),
                    quantity: Math.min(99, Math.max(1, item.quantity)),
                    size: item.selectedSize || undefined,
                })),
            });
            const data = res.data?.data as {
                sessionId: string; reply: string; cards: ProductCardData[]; actions: CartAddAction[]; ended?: boolean;
            };
            for (const action of data.actions ?? []) {
                if (action.type === 'add_to_cart') {
                    addToCart(action.product, action.quantity, action.size, action.color);
                }
            }
            setChat(prev => ({
                sessionId: data.sessionId,
                ended: data.ended,
                messages: [...prev.messages, { role: 'assistant', text: data.reply, cards: data.cards }],
            }));
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Could not reach the assistant. Please try again.';
            setError(msg);
        } finally {
            setSending(false);
        }
    };

    if (!enabled) return null;

    return (
        <>
            <AnimatePresence>
                {!open && (
                    <motion.button
                        key="launcher"
                        type="button"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        onClick={() => setOpen(true)}
                        aria-label="Open shopping assistant"
                        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[90] w-14 h-14 rounded-full bg-luxury-gold text-white ring-1 ring-white/70 shadow-[0_10px_30px_rgba(0,0,0,0.3)] flex items-center justify-center hover:bg-luxury-black transition-colors"
                    >
                        <MessageCircle size={22} strokeWidth={1.5} />
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {open && (
                    <motion.section
                        key="panel"
                        role="dialog"
                        aria-label="Shopping assistant"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 24 }}
                        transition={{ duration: 0.2 }}
                        className="fixed z-[95] inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[380px] sm:h-[600px] sm:max-h-[calc(100vh-3rem)] bg-white sm:border sm:border-gray-100 shadow-[0_20px_60px_rgba(0,0,0,0.18)] flex flex-col"
                    >
                        <header className="flex items-center justify-between px-5 py-4 bg-luxury-black text-white">
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-luxury-widest text-luxury-gold">V2 Enterprise</p>
                                <p className="font-serif italic text-base">Shopping Assistant</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <button type="button" onClick={reset} aria-label="Start a new chat" title="New chat" className="p-2 text-white/70 hover:text-white">
                                    <RotateCcw size={16} />
                                </button>
                                <button type="button" onClick={close} aria-label="Close assistant" className="p-2 text-white/70 hover:text-white">
                                    <X size={18} />
                                </button>
                            </div>
                        </header>

                        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-luxury-gray/40" aria-live="polite">
                            {chat.messages.map((m, i) => (
                                <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex flex-col items-start gap-2'}>
                                    <div
                                        className={
                                            m.role === 'user'
                                                ? 'max-w-[85%] bg-luxury-black text-white px-4 py-2.5 text-sm whitespace-pre-wrap break-words'
                                                : 'max-w-[90%] bg-white border border-gray-100 text-luxury-black px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words'
                                        }
                                    >
                                        {m.role === 'assistant' ? <AssistantText text={m.text} onNavigate={close} /> : m.text}
                                    </div>
                                    {m.cards && m.cards.length > 0 && (
                                        <div className="flex gap-2 overflow-x-auto max-w-full pb-1">
                                            {m.cards.map(card => (
                                                <Link
                                                    key={card.id}
                                                    href={card.url}
                                                    onClick={close}
                                                    className="shrink-0 w-32 bg-white border border-gray-100 hover:border-luxury-gold transition-colors"
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={getOptimizedImageUrl(card.photo, { width: 400 })}
                                                        alt={card.name}
                                                        loading="lazy"
                                                        className="w-full h-36 object-cover bg-luxury-gray"
                                                    />
                                                    <div className="p-2">
                                                        <p className="text-[11px] leading-tight line-clamp-2 text-luxury-black">{card.name}</p>
                                                        <p className="text-[11px] mt-1 font-semibold">
                                                            {formatPrice(card.price)}
                                                            {card.originalPrice && card.originalPrice > card.price && (
                                                                <span className="ml-1 font-normal text-gray-400 line-through">{formatPrice(card.originalPrice)}</span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {chat.messages.length === 1 && !sending && (
                                <div className="flex flex-wrap gap-2">
                                    {SUGGESTIONS.map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => send(s)}
                                            className="text-xs border border-gray-200 bg-white px-3 py-1.5 hover:border-luxury-black transition-colors"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {sending && (
                                <div className="flex items-center gap-1 px-4 py-3 bg-white border border-gray-100 w-fit" aria-label="Assistant is typing">
                                    {[0, 1, 2].map(d => (
                                        <motion.span
                                            key={d}
                                            className="w-1.5 h-1.5 rounded-full bg-gray-400"
                                            animate={{ opacity: [0.3, 1, 0.3] }}
                                            transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }}
                                        />
                                    ))}
                                </div>
                            )}

                            {error && <p className="text-xs text-red-500">{error}</p>}
                        </div>

                        {cart.length > 0 && (
                            <Link
                                href="/cart"
                                onClick={close}
                                className="flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-luxury border-t border-gray-100 hover:text-luxury-gold"
                            >
                                <ShoppingBag size={13} /> View bag & checkout
                            </Link>
                        )}

                        <form
                            onSubmit={e => { e.preventDefault(); void send(input); }}
                            className="flex items-end gap-2 border-t border-gray-100 p-3"
                        >
                            {chat.ended ? (
                                <button type="button" onClick={reset} className="w-full py-2.5 text-xs font-bold uppercase tracking-luxury bg-luxury-black text-white">
                                    Start a new chat
                                </button>
                            ) : (
                                <>
                                    <textarea
                                        ref={inputRef}
                                        value={input}
                                        onChange={e => setInput(e.target.value.slice(0, MAX_INPUT))}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(input); }
                                        }}
                                        rows={1}
                                        maxLength={MAX_INPUT}
                                        placeholder="Ask about products, sizes, styling…"
                                        aria-label="Message"
                                        className="flex-1 resize-none max-h-28 text-sm px-3 py-2.5 border border-gray-200 focus:outline-none focus:border-luxury-black"
                                    />
                                    <button
                                        type="submit"
                                        disabled={sending || !input.trim()}
                                        aria-label="Send message"
                                        className="h-[42px] w-[42px] flex items-center justify-center bg-luxury-black text-white disabled:opacity-40"
                                    >
                                        <Send size={16} />
                                    </button>
                                </>
                            )}
                        </form>
                        <p className="text-[9px] text-center text-gray-400 pb-2 px-4">
                            AI assistant. Prices and stock are confirmed at checkout. Never share payment details here.
                        </p>
                    </motion.section>
                )}
            </AnimatePresence>
        </>
    );
};

export default ChatWidget;
