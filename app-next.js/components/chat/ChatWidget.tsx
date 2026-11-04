'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X, Send, RotateCcw, ShoppingBag, Sparkles, ArrowUpRight, ChevronRight } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatAPI } from '../../lib/apiClient';
import { SHOPPING_CHAT_LAUNCH_EVENT, type ShoppingChatLaunch } from '../../lib/chatEvents';
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
const SUGGESTIONS = ['Linen for warm days', 'A look for a wedding', 'Help me choose a gift'];

const formatPrice = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const STORE_PATH = /^\/(?:product\/[a-f0-9]{24}|shop|cart|checkout|returns|shipping|contact|size-guide|account\/orders)(?:[/?#]|$)/i;

/** Render model output as Markdown without enabling raw HTML. */
const AssistantText: React.FC<{ text: string; onNavigate: () => void }> = ({ text, onNavigate }) => {
    const components: Components = {
        p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>,
        li: ({ children }) => <li className="pl-0.5">{children}</li>,
        h1: ({ children }) => <h3 className="my-2 text-base font-semibold">{children}</h3>,
        h2: ({ children }) => <h3 className="my-2 text-sm font-semibold">{children}</h3>,
        h3: ({ children }) => <h3 className="my-1.5 text-sm font-semibold">{children}</h3>,
        blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-luxury-gold pl-3 text-gray-600">{children}</blockquote>,
        pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded bg-gray-100 p-2 text-xs">{children}</pre>,
        code: ({ children, className }) => (
            <code className={`${className ?? ''} rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.9em]`}>{children}</code>
        ),
        a: ({ href, children }) => {
            if (href && STORE_PATH.test(href)) {
                return <Link href={href} onClick={onNavigate} className="underline underline-offset-2 hover:text-luxury-gold">{children}</Link>;
            }
            if (href && /^https:\/\/(?:www\.)?v2enterprise\.in(?:\/|$)/i.test(href)) {
                return <a href={href} onClick={onNavigate} className="underline underline-offset-2 hover:text-luxury-gold">{children}</a>;
            }
            return <span>{children}</span>;
        },
        table: ({ children }) => <table className="my-2 block w-full overflow-x-auto border-collapse text-left">{children}</table>,
        th: ({ children }) => <th className="border border-gray-200 bg-gray-50 px-2 py-1 font-semibold">{children}</th>,
        td: ({ children }) => <td className="border border-gray-200 px-2 py-1 align-top">{children}</td>,
        hr: () => <hr className="my-2 border-gray-200" />,
    };

    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{text}</ReactMarkdown>
    );
};

const ChatWidget: React.FC = () => {
    const { cart, addToCart } = useCart();
    const [enabled, setEnabled] = useState(false);
    const [open, setOpen] = useState(false);
    const [chat, setChat] = useState<StoredChat>({ messages: [GREETING] });
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
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

    useEffect(() => {
        const onLaunch = (event: Event) => {
            const detail = (event as CustomEvent<ShoppingChatLaunch>).detail;
            const prompt = detail?.prompt?.trim().slice(0, MAX_INPUT);
            if (!prompt) return;
            setError(null);
            setOpen(true);
            if (detail.sendImmediately === false) {
                setPendingPrompt(null);
                setInput(prompt);
            } else {
                setPendingPrompt(prompt);
            }
        };
        window.addEventListener(SHOPPING_CHAT_LAUNCH_EVENT, onLaunch);
        return () => window.removeEventListener(SHOPPING_CHAT_LAUNCH_EVENT, onLaunch);
    }, []);

    useEffect(() => {
        if (!open || !pendingPrompt || sending) return;
        const prompt = pendingPrompt;
        setPendingPrompt(null);
        void send(prompt);
    }, [open, pendingPrompt, sending, send]);

    if (!enabled) return null;

    return (
        <>
            <AnimatePresence>
                {!open && (
                    <motion.button
                        key="launcher"
                        type="button"
                        initial={{ scale: 0.92, y: 12, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.92, y: 12, opacity: 0 }}
                        onClick={() => setOpen(true)}
                        aria-label="Open shopping assistant"
                        className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-[90] flex items-center gap-3 rounded-full border border-white/15 bg-[#191816] py-2 pl-2 pr-5 text-white shadow-[0_16px_40px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#28251f] sm:bottom-6 sm:right-6"
                    >
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-[#b79a62] text-[#171613] shadow-inner">
                            <MessageCircle size={19} strokeWidth={1.7} />
                        </span>
                        <span className="flex flex-col items-start leading-tight">
                            <span className="text-xs font-semibold tracking-wide">Ask V2</span>
                            <span className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-white/55">Your style desk</span>
                        </span>
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
                        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                        className="fixed inset-0 z-[95] flex h-[100dvh] flex-col overflow-hidden bg-[#f6f4ef] shadow-[0_28px_90px_rgba(0,0,0,0.3)] sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(46rem,calc(100dvh-3rem))] sm:w-[420px] sm:rounded-[24px] sm:border sm:border-black/10"
                    >
                        <header className="relative flex shrink-0 items-center justify-between overflow-hidden bg-[#191816] px-5 pb-5 pt-5 text-white sm:px-6">
                            <div className="pointer-events-none absolute -right-10 -top-24 h-56 w-56 rounded-full border border-[#c9aa6b]/15" />
                            <div className="pointer-events-none absolute -right-2 -top-16 h-40 w-40 rounded-full border border-[#c9aa6b]/10" />
                            <div className="relative flex min-w-0 items-center gap-3">
                                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] border border-[#c9aa6b]/40 bg-[#c9aa6b]/10 font-serif text-lg italic text-[#d7bd83] shadow-[inset_0_0_18px_rgba(201,170,107,0.08)]">
                                    V2
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#d7bd83]">V2 Enterprise · Style desk</p>
                                    <h2 className="mt-1 truncate font-serif text-[19px] leading-none tracking-wide">Your personal edit</h2>
                                    <p className="mt-2 flex items-center gap-1.5 text-[10px] tracking-wide text-white/55">
                                        <span className="h-1.5 w-1.5 rounded-full bg-[#9db68b] shadow-[0_0_8px_rgba(157,182,139,0.7)]" />
                                        Online · Ready to help
                                    </p>
                                </div>
                            </div>
                            <div className="relative ml-3 flex shrink-0 items-center gap-1.5">
                                <button type="button" onClick={reset} aria-label="Start a new chat" title="New chat" className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-white/65 transition hover:border-white/25 hover:bg-white/10 hover:text-white">
                                    <RotateCcw size={15} />
                                </button>
                                <button type="button" onClick={close} aria-label="Close assistant" className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-white/65 transition hover:border-white/25 hover:bg-white/10 hover:text-white">
                                    <X size={17} />
                                </button>
                            </div>
                        </header>

                        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_rgba(201,170,107,0.08),_transparent_58%),linear-gradient(180deg,#f8f7f3_0%,#f1efe9_100%)] px-4 py-5 sm:px-5" aria-live="polite">
                            <div className="mx-auto flex max-w-md flex-col gap-5">
                                {chat.messages.map((m, i) => (
                                    m.role === 'user' ? (
                                        <div key={i} className="flex justify-end pl-10">
                                            <div className="max-w-[92%] whitespace-pre-wrap break-words rounded-[20px] rounded-br-[6px] bg-[#191816] px-4 py-3 text-[13px] leading-6 text-white shadow-[0_8px_24px_rgba(25,24,22,0.12)]">
                                                {m.text}
                                            </div>
                                        </div>
                                    ) : (
                                        <div key={i} className="flex items-start gap-2.5 pr-2">
                                            <div aria-hidden="true" className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#b79a62]/30 bg-[#201f1b] font-serif text-[10px] italic text-[#d5bc84] shadow-sm">V2</div>
                                            <div className="min-w-0 max-w-[calc(100%-2.625rem)] flex-1 overflow-hidden rounded-[20px] rounded-tl-[6px] border border-[#e9e5dc] bg-white text-[#25231f] shadow-[0_8px_26px_rgba(35,31,23,0.055)]">
                                                <div className="px-4 py-3.5 text-[13px] leading-[1.7] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                                                    <AssistantText text={m.text} onNavigate={close} />
                                                </div>
                                                {m.cards && m.cards.length > 0 && (
                                                    <section className="mx-4 mb-4 border-t border-[#eeeae2] pt-3.5" aria-label="Recommended pieces">
                                                        <div className="mb-2.5 flex items-center justify-between">
                                                            <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.19em] text-[#88764f]">
                                                                <Sparkles size={12} strokeWidth={1.8} /> A few good finds
                                                            </p>
                                                            <span className="text-[9px] tracking-wider text-[#aaa59a]">{String(m.cards.length).padStart(2, '0')} PIECES</span>
                                                        </div>
                                                        <div className="flex flex-col gap-2">
                                                            {m.cards.map((card, cardIndex) => (
                                                                <Link
                                                                    key={card.id}
                                                                    href={card.url}
                                                                    onClick={close}
                                                                    className="group flex min-w-0 overflow-hidden rounded-[15px] border border-[#e9e5dc] bg-[#faf9f6] transition duration-300 hover:border-[#b79a62]/60 hover:bg-white hover:shadow-[0_8px_24px_rgba(35,31,23,0.07)]"
                                                                >
                                                                    <div className="relative w-[84px] shrink-0 overflow-hidden bg-[#ece9e1] sm:w-[92px]">
                                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                        <img
                                                                            src={getOptimizedImageUrl(card.photo, { width: 400 })}
                                                                            alt={card.name}
                                                                            loading="lazy"
                                                                            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                                                                        />
                                                                        <span className="absolute left-2 top-2 rounded-full bg-black/55 px-1.5 py-1 text-[8px] tracking-widest text-white backdrop-blur-sm">{String(cardIndex + 1).padStart(2, '0')}</span>
                                                                    </div>
                                                                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-3">
                                                                        <div className="min-w-0">
                                                                            <p className="mb-1 text-[8px] font-medium uppercase tracking-[0.16em] text-[#a18a59]">V2 · Selected piece</p>
                                                                            <p className="line-clamp-2 text-[12px] font-medium leading-[1.35] text-[#292722]">{card.name}</p>
                                                                            {card.color && <p className="mt-1 truncate text-[10px] text-[#89857b]">{card.color}</p>}
                                                                            <p className="mt-2 text-[12px] font-semibold tracking-wide text-[#292722]">
                                                                                {formatPrice(card.price)}
                                                                                {card.originalPrice && card.originalPrice > card.price && (
                                                                                    <span className="ml-1.5 text-[10px] font-normal text-[#9b978e] line-through">{formatPrice(card.originalPrice)}</span>
                                                                                )}
                                                                            </p>
                                                                        </div>
                                                                        <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#e5dfd2] text-[#84744f] transition group-hover:border-[#b79a62] group-hover:bg-[#b79a62] group-hover:text-white">
                                                                            <ArrowUpRight size={14} strokeWidth={1.7} />
                                                                        </span>
                                                                    </div>
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    </section>
                                                )}
                                            </div>
                                        </div>
                                    )
                                ))}

                                {chat.messages.length === 1 && !sending && (
                                    <div className="ml-10">
                                        <p className="mb-2.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#9a927f]">A little inspiration</p>
                                        <div className="flex flex-wrap gap-2">
                                            {SUGGESTIONS.map(s => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => send(s)}
                                                    className="rounded-full border border-[#dfdbd1] bg-white/80 px-3.5 py-2 text-[11px] text-[#514d43] shadow-[0_2px_8px_rgba(35,31,23,0.025)] transition hover:border-[#b79a62] hover:bg-white hover:text-[#8a7546]"
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {sending && (
                                    <div className="flex items-start gap-2.5" aria-label="Assistant is typing">
                                        <div aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#201f1b] font-serif text-[10px] italic text-[#d5bc84]">V2</div>
                                        <div className="flex items-center gap-1.5 rounded-[18px] rounded-tl-[6px] border border-[#e9e5dc] bg-white px-4 py-3.5 shadow-sm">
                                            {[0, 1, 2].map(d => (
                                                <motion.span
                                                    key={d}
                                                    className="h-1.5 w-1.5 rounded-full bg-[#b79a62]"
                                                    animate={{ y: [0, -3, 0], opacity: [0.45, 1, 0.45] }}
                                                    transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.14 }}
                                                />
                                            ))}
                                            <span className="ml-1 text-[10px] tracking-wide text-[#8d887c]">Finding your edit…</span>
                                        </div>
                                    </div>
                                )}

                                {error && <p role="alert" className="ml-10 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">{error}</p>}
                            </div>
                        </div>

                        {cart.length > 0 && (
                            <Link
                                href="/cart"
                                onClick={close}
                                className="flex shrink-0 items-center justify-between border-t border-[#e8e4dc] bg-white px-5 py-3 text-[#37342d] transition hover:bg-[#fbfaf7]"
                            >
                                <span className="flex items-center gap-2.5">
                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f3f0e9] text-[#8c774a]"><ShoppingBag size={14} /></span>
                                    <span className="flex flex-col text-left">
                                        <span className="text-[11px] font-medium">Your bag</span>
                                        <span className="mt-0.5 text-[9px] uppercase tracking-[0.14em] text-[#9a958a]">{cart.reduce((sum, item) => sum + item.quantity, 0)} pieces · Ready when you are</span>
                                    </span>
                                </span>
                                <ChevronRight size={16} className="text-[#9c895c]" />
                            </Link>
                        )}

                        <form
                            onSubmit={e => { e.preventDefault(); void send(input); }}
                            className="shrink-0 border-t border-[#e8e4dc] bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:pb-3"
                        >
                            {chat.ended ? (
                                <button type="button" onClick={reset} className="w-full rounded-xl bg-[#191816] py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#302d25]">
                                    Start a new chat
                                </button>
                            ) : (
                                <>
                                    <div className="flex items-end gap-2 rounded-[18px] border border-[#e7e3da] bg-[#f8f7f3] p-1.5 transition focus-within:border-[#b79a62]/70 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(183,154,98,0.08)]">
                                        <textarea
                                            ref={inputRef}
                                            value={input}
                                            onChange={e => setInput(e.target.value.slice(0, MAX_INPUT))}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(input); }
                                            }}
                                            rows={1}
                                            maxLength={MAX_INPUT}
                                            placeholder="Ask about a look, fabric or fit…"
                                            aria-label="Message"
                                            className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-3 py-2.5 text-[13px] text-[#292722] outline-none placeholder:text-[#aaa59a]"
                                        />
                                        <button
                                            type="submit"
                                            disabled={sending || !input.trim()}
                                            aria-label="Send message"
                                            className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-[#191816] text-white transition hover:bg-[#b79a62] disabled:cursor-not-allowed disabled:opacity-35"
                                        >
                                            <Send size={15} />
                                        </button>
                                    </div>
                                </>
                            )}
                            <p className="mt-2 text-center text-[9px] tracking-wide text-[#aaa59a]">
                                V2 Assist · Secure shopping, with a human touch
                            </p>
                        </form>
                    </motion.section>
                )}
            </AnimatePresence>
        </>
    );
};

export default ChatWidget;
