/** Helpers for safely reading client-supplied query parameters. */

/** Parse an integer query value; non-numeric / out-of-range values fall back or clamp. */
export const parseIntParam = (val: unknown, def: number, min: number, max: number): number => {
    if (typeof val !== 'string') return def;
    const n = parseInt(val, 10);
    if (!Number.isFinite(n)) return def;
    return Math.min(max, Math.max(min, n));
};

/** Only accept plain strings (rejects `?x[$ne]=1` objects and repeated params). */
export const asString = (val: unknown): string | undefined =>
    typeof val === 'string' && val.length > 0 ? val : undefined;

/** Escape user input before embedding it in a RegExp. */
export const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
