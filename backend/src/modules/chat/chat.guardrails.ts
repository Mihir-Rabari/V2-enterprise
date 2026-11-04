/**
 * Deterministic guardrails for the shopping assistant. These run without the model, so they
 * hold even if the model is talked out of its instructions:
 *   - input normalisation + length cap
 *   - redaction of payment / identity data before anything is sent to the model or stored
 *   - a prompt-injection heuristic (the model-based classifier is a second, independent layer)
 *   - output validation: no leaked system prompt, no external links, no invented prices or codes
 */
import { CHAT_LIMITS } from './chat.config';

// ── Input ────────────────────────────────────────────────────────────────────

// Zero-width / bidi-control characters are used to hide instructions from human reviewers.
const INVISIBLE_CHARS = /[​-‏‪-‮⁠-⁤﻿]/g;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export type InputCheck = { ok: true; text: string } | { ok: false; reason: 'empty' | 'too_long' };

export const normalizeUserInput = (raw: unknown): InputCheck => {
    if (typeof raw !== 'string') return { ok: false, reason: 'empty' };
    const text = raw
        .normalize('NFKC')
        .replace(INVISIBLE_CHARS, '')
        .replace(CONTROL_CHARS, '')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    if (!text) return { ok: false, reason: 'empty' };
    if (text.length > CHAT_LIMITS.maxMessageChars) return { ok: false, reason: 'too_long' };
    return { ok: true, text };
};

// ── Sensitive data redaction ─────────────────────────────────────────────────

const luhnValid = (digits: string): boolean => {
    let sum = 0;
    let double = false;
    for (let i = digits.length - 1; i >= 0; i--) {
        let d = digits.charCodeAt(i) - 48;
        if (double) { d *= 2; if (d > 9) d -= 9; }
        sum += d;
        double = !double;
    }
    return sum % 10 === 0;
};

export type RedactionKind = 'card' | 'aadhaar' | 'pan' | 'email' | 'phone' | 'secret';

export interface RedactionResult {
    text: string;
    kinds: RedactionKind[];
}

/**
 * Removes payment cards, Aadhaar / PAN numbers, e-mails, phone numbers, and OTP / CVV / password
 * values. The assistant never needs any of these: checkout happens on the normal checkout page.
 */
export const redactSensitive = (input: string): RedactionResult => {
    const kinds = new Set<RedactionKind>();
    let text = input;

    // Card numbers: 13-19 digits, optionally grouped by spaces or dashes, Luhn-valid.
    text = text.replace(/\b(?:\d[ -]?){12,18}\d\b/g, m => {
        const digits = m.replace(/\D/g, '');
        if (digits.length >= 13 && digits.length <= 19 && luhnValid(digits)) {
            kinds.add('card');
            return '[card number removed]';
        }
        return m;
    });
    // Aadhaar: 12 digits, usually 4-4-4.
    text = text.replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, () => { kinds.add('aadhaar'); return '[id number removed]'; });
    // PAN: AAAAA9999A
    text = text.replace(/\b[A-Z]{5}\d{4}[A-Z]\b/gi, () => { kinds.add('pan'); return '[id number removed]'; });
    text = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, () => { kinds.add('email'); return '[email removed]'; });
    // Indian mobile numbers (with optional +91 / 0 prefix) and generic 10+ digit phone numbers.
    text = text.replace(/(?:\+?\d{1,3}[ -]?)?\b[6-9]\d{4}[ -]?\d{5}\b/g, () => { kinds.add('phone'); return '[phone removed]'; });
    // "otp 123456", "cvv: 123", "password is hunter2", "upi pin 1234"
    text = text.replace(/\b(otp|cvv|cvc|pin|upi pin|password|passcode)\b\s*(?:is|:|=|-)?\s*\S+/gi, (_m, label: string) => {
        kinds.add('secret');
        return `${label} [removed]`;
    });

    return { text, kinds: [...kinds] };
};

// ── Prompt-injection heuristic ───────────────────────────────────────────────

const INJECTION_PATTERNS: RegExp[] = [
    /\b(ignore|disregard|forget|override|bypass)\b[^.]{0,40}\b(previous|prior|above|earlier|all|your|the|these|system)\b[^.]{0,30}\b(instructions?|rules?|prompts?|guidelines?|directives?|policies)\b/i,
    /\b(system|developer|hidden|initial|original)\s+(prompt|message|instructions?)\b/i,
    // Only "your ..." so that "what are the rules for returns" stays allowed.
    /\b(reveal|show|print|repeat|output|display|tell me|what (is|are))\b[^.]{0,30}\byour\s+(instructions?|rules|prompt|configuration|guidelines)\b/i,
    /\byou are (now|no longer)\b/i,
    /\b(developer|god|dan|jailbreak|debug|admin|sudo|unrestricted)\s*mode\b/i,
    /\bjailbreak/i,
    // Narrow on purpose: "pretend I'm going to a wedding" is a normal styling question.
    /\b(pretend|roleplay|role-play)\s+(to be|you are|you're|as)\b/i,
    /<\/?\s*(system|assistant|instructions?|tool_result|function_results?)\s*>/i,
    /^\s*(system|assistant)\s*:/im,
    /\[\s*(system|inst)\s*\]/i,
    /\b(new|updated) (instructions|rules) (from|by) (the )?(admin|developer|anthropic|owner|operator)\b/i,
];

export const looksLikePromptInjection = (text: string): boolean => INJECTION_PATTERNS.some(re => re.test(text));

// ── Output validation ────────────────────────────────────────────────────────

export interface OutputContext {
    /** Secret marker embedded in the system prompt; seeing it in output means the prompt leaked. */
    canary: string;
    /** Every rupee amount the assistant may legitimately state (from tool results or the user's own message). */
    allowedAmounts: Set<number>;
    /** Percentages that appeared in tool results (e.g. a product's "20% OFF"). */
    allowedPercents: Set<number>;
    /** Hostnames links may point at; relative links are always allowed. */
    allowedHosts: string[];
    /**
     * Lower-cased text the reply may draw product facts from: this turn's tool results, earlier
     * (already validated) assistant replies, and the shopper's message when a search actually ran.
     */
    groundingText: string;
}

// Garment / product-type words a reply might use to describe what the store sells. Words that are
// common outside product talk ("top", "suit", "bag", "short", "watch") are deliberately left out.
const GARMENT_STEMS = [
    'shirt', 'tee', 'polo', 'kurta', 'kurti', 'sherwani', 'bandhgala', 'nehru', 'saree', 'sari', 'lehenga',
    'ghagra', 'dupatta', 'salwar', 'churidar', 'dhoti', 'kaftan', 'anarkali', 'blazer', 'tuxedo', 'waistcoat',
    'jacket', 'coat', 'hoodie', 'sweater', 'sweatshirt', 'cardigan', 'knit', 'jean', 'denim', 'trouser', 'pant',
    'chino', 'jogger', 'skirt', 'dress', 'gown', 'jumpsuit', 'blouse', 'shoe', 'sneaker', 'loafer', 'sandal',
    'boot', 'belt', 'scarf', 'sunglass', 'jewel',
];
const GARMENT_RE = new RegExp(`\\b(${GARMENT_STEMS.join('|')})(?:s|es)?\\b`, 'gi');
const GARMENT_ALIASES: Record<string, string[]> = {
    jean: ['denim'],
    denim: ['jean'],
    trouser: ['pant'],
    pant: ['trouser'],
};
// Devanagari spellings, mapped to the English stem that must appear in the catalogue data.
const DEVANAGARI_GARMENTS: [string, string][] = [
    ['कुर्त', 'kurta'], ['शेरवान', 'sherwani'], ['साड़', 'saree'], ['लहंग', 'lehenga'], ['दुपट्ट', 'dupatta'],
    ['सलवार', 'salwar'], ['धोती', 'dhoti'], ['शर्ट', 'shirt'], ['जींस', 'jean'], ['जैकेट', 'jacket'],
    ['ब्लेज़र', 'blazer'], ['ड्रेस', 'dress'], ['स्कर्ट', 'skirt'], ['पैंट', 'pant'], ['जूत', 'shoe'],
];

/**
 * Product types and quoted names in a reply that no supplied data backs up. This is what stops a
 * reply like "we have a lovely 'Festive Collection' of sherwanis" when the catalogue has neither.
 */
export const findUngroundedClaims = (reply: string, groundingText: string): string[] => {
    const grounded = groundingText.toLowerCase();
    const missing = new Set<string>();
    for (const m of reply.matchAll(GARMENT_RE)) {
        const stem = m[1].toLowerCase();
        const aliases = GARMENT_ALIASES[stem] ?? [];
        if (!grounded.includes(stem) && !aliases.some(alias => grounded.includes(alias))) missing.add(stem);
    }
    for (const [dev, en] of DEVANAGARI_GARMENTS) {
        if (reply.includes(dev) && !grounded.includes(en)) missing.add(en);
    }
    // Quoted names ("Festive Collection", 'Ethnic Wear') must be real catalogue text.
    const quoted = /["“]([^"”\n]{2,40})["”]|(?:^|[\s(])['‘]([A-Z][^'’\n]{1,40})['’](?=[\s.,!?;:)]|$)/g;
    for (const m of reply.matchAll(quoted)) {
        const name = (m[1] ?? m[2]).trim();
        if (/[a-z]/i.test(name) && !grounded.includes(name.toLowerCase())) missing.add(`"${name}"`);
    }
    return [...missing];
};

export type OutputCheck = { ok: true; text: string } | { ok: false; reason: string };

const parseAmount = (s: string): number => Number(s.replace(/,/g, ''));

/** Extracts amounts written as ₹1,299 / Rs. 1299 / INR 1299 / 1299 rupees. */
export const extractRupeeAmounts = (text: string): number[] => {
    const out: number[] = [];
    const re = /(?:₹|\brs\.?|\binr)\s*(\d[\d,]*(?:\.\d+)?)|(\d[\d,]*(?:\.\d+)?)\s*(?:rupees|rs\b|inr\b|\/-)/gi;
    for (const m of text.matchAll(re)) out.push(parseAmount(m[1] ?? m[2]));
    return out.filter(n => Number.isFinite(n));
};

const extractPercents = (text: string): number[] =>
    [...text.matchAll(/(\d{1,3}(?:\.\d+)?)\s*%/g)].map(m => Number(m[1]));

const FORBIDDEN_OUTPUT: { re: RegExp; reason: string }[] = [
    // An actual code-like token after "code"/"coupon" (saying "we have no coupon codes" is fine).
    { re: /\b(?:[Cc]ode|[Cc]oupon|[Vv]oucher|[Pp]romo)\s*[:\-]?\s*["'“]?[A-Z][A-Z0-9]{3,}\b/, reason: 'states a discount code' },
    { re: /\b(i|we)\s+(can|will|could)\s+(give|offer|apply|get)\s+(you\s+)?(a\s+)?(discount|refund|free)/i, reason: 'promises a discount, refund or freebie' },
    { re: /\b(guarantee|guaranteed)\b[^.]{0,40}\b(deliver|delivery|refund|arriv)/i, reason: 'guarantees delivery or refunds' },
    { re: /\b(card number|cvv|otp|upi pin|password)\b[^.]{0,40}\b(share|send|enter|give|type|provide)\b|\b(share|send|enter|give|type|provide)\b[^.]{0,40}\b(card number|cvv|otp|upi pin|password)\b/i, reason: 'asks for payment credentials' },
    { re: /```|<script|<\/?[a-z][a-z0-9]*\s[^>]*>/i, reason: 'contains code or HTML' },
];

/** Tolerance for rounding (e.g. "₹1,299" vs 1299.0). */
const amountAllowed = (n: number, allowed: Set<number>) => {
    for (const a of allowed) if (Math.abs(a - n) < 1) return true;
    return false;
};

export const validateAssistantOutput = (raw: string, ctx: OutputContext): OutputCheck => {
    const text = raw.trim();
    if (!text) return { ok: false, reason: 'empty reply' };
    if (text.length > 2000) return { ok: false, reason: 'reply too long' };
    if (ctx.canary && text.includes(ctx.canary)) return { ok: false, reason: 'system prompt leak' };

    for (const { re, reason } of FORBIDDEN_OUTPUT) {
        if (re.test(text)) return { ok: false, reason };
    }

    // Links: relative paths are fine; absolute URLs only to our own domain.
    for (const m of text.matchAll(/\bhttps?:\/\/([^\s/)\]>"']+)|\bwww\.([^\s/)\]>"']+)/gi)) {
        const host = (m[1] ?? m[2] ?? '').toLowerCase().replace(/:\d+$/, '');
        const ok = ctx.allowedHosts.some(h => host === h || host.endsWith(`.${h}`));
        if (!ok) return { ok: false, reason: `external link (${host})` };
    }

    // Every rupee amount must come from data we supplied. This stops invented prices / totals.
    for (const n of extractRupeeAmounts(text)) {
        if (!amountAllowed(n, ctx.allowedAmounts)) return { ok: false, reason: `unverified amount ₹${n}` };
    }
    for (const p of extractPercents(text)) {
        if (!ctx.allowedPercents.has(p)) return { ok: false, reason: `unverified percentage ${p}%` };
    }

    const ungrounded = findUngroundedClaims(text, ctx.groundingText);
    if (ungrounded.length > 0) return { ok: false, reason: `ungrounded product claims: ${ungrounded.join(', ')}` };

    return { ok: true, text };
};

// ── Cart intent ──────────────────────────────────────────────────────────────

/**
 * What the shopper wants done to their bag, decided without the model.
 *   add     - an explicit, un-negated request ("add this", "please add two")
 *   confirm - a short bare confirmation ("yes", "ok add it"); only acts on a pending offer
 *   decline - any negation or cancel word ("don't add it", "no", "not now"); fails closed
 *   none    - no cart intent
 */
export type CartIntent = 'add' | 'confirm' | 'decline' | 'none';

const NEGATION = /\b(?:no|not|nope|nah|never|dont|do\s+not|cancel|stop|wait|hold\s+on|remove|skip|nahi|nahin|mat)\b|n't\b/i;
const ADD_VERB = /\b(?:add|put|place|include)\b/i;
// The shopper asking for advice ("should I add it?") is not an instruction.
const SELF_QUESTION = /\b(?:should|shall|can|could|would|do)\s+i\b/i;
const AFFIRMATIVE = new Set([
    'yes', 'yeah', 'yep', 'yup', 'yess', 'yesss', 'sure', 'ok', 'okay', 'okk', 'please', 'pls', 'plz',
    'add', 'go', 'do', 'haan', 'han', 'ji', 'perfect', 'great', 'done',
]);
const CONFIRM_FILLER = new Set([
    'it', 'that', 'this', 'them', 'those', 'one', 'ahead', 'bro', 'thanks', 'thank', 'you', 'sounds', 'good', 'to', 'bag', 'cart', 'my', 'the',
]);

export const detectCartIntent = (message: string): CartIntent => {
    const text = message.trim().toLowerCase().replace(/[’‘]/g, "'");
    if (!text) return 'none';
    if (NEGATION.test(text)) return 'decline';
    const words = text.replace(/[^a-z' ]+/g, ' ').split(/\s+/).filter(Boolean);
    const shortConfirm = words.length > 0 && words.length <= 6 && !/\d/.test(text)
        && words.every(w => AFFIRMATIVE.has(w) || CONFIRM_FILLER.has(w))
        && words.some(w => AFFIRMATIVE.has(w));
    if (shortConfirm) return 'confirm';
    if (ADD_VERB.test(text) && !SELF_QUESTION.test(text)) return 'add';
    return 'none';
};

/**
 * True when the shopper's own words ask for an addition: "add this to cart", "yes, add it",
 * "please add two". A bare "yes" is not enough on its own; it only commits a pending offer.
 */
export const explicitlyAsksToAdd = (message: string): boolean => {
    const intent = detectCartIntent(message);
    return intent === 'add' || (intent === 'confirm' && ADD_VERB.test(message));
};

// ── Canned replies ───────────────────────────────────────────────────────────

export const CANNED = {
    offTopic: "I'm the V2 Enterprise shopping assistant, so I can only help with our clothing: finding products, sizes, fit, styling and your bag. What are you shopping for today?",
    injection: "I can't change how I work, but I'm happy to help you shop. Tell me what you're looking for, like a colour, occasion or budget.",
    abusive: "Let's keep things friendly. I'm here to help you find something great to wear whenever you're ready.",
    sensitiveData: "For your safety, please never share card numbers, OTPs, PINs or passwords in chat. I've removed them. Payment only happens on our secure checkout page.",
    unsafeOutput: "Sorry, I couldn't put together a reliable answer for that. Could you rephrase, or tell me what kind of product you're looking for?",
    error: "Sorry, I'm having trouble right now. Please try again in a moment, or browse our shop at /shop.",
    tooLong: `That message is a bit long. Please keep it under ${CHAT_LIMITS.maxMessageChars} characters.`,
    sessionLimit: 'This conversation has reached its limit. Please start a new chat to keep shopping.',
    locked: 'This conversation has been closed. Please start a new chat if you need help shopping.',
    notAdded: "No problem, I haven't added anything to your bag. Let me know if you'd like to see other options.",
    pendingGone:'Sorry, that item is no longer available in that size and colour. Would you like me to look for something similar?',
    unavailable: 'The shopping assistant is unavailable right now. You can still browse everything at /shop.',
} as const;
