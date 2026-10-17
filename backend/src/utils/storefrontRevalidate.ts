/**
 * Tells the Next.js storefront that admin data changed, so its cached homepage
 * (and site settings) refresh right away instead of after the 10-minute cache.
 *
 * Expires the cache via Next's internal POST /api/revalidate, then requests "/"
 * once so the fresh page is rendered (warm) before the next visitor arrives.
 * Saves are debounced: a burst of admin edits causes one refresh, 2s after the
 * first. Failures are logged and never affect the admin request.
 */

const NEXT_URL = process.env.NEXT_INTERNAL_URL || 'http://127.0.0.1:3001';
const DEBOUNCE_MS = 2000;

let pending: NodeJS.Timeout | null = null;

export function notifyStorefrontChanged(): void {
    // Without a local storefront (dev backend on its own) there is nothing to refresh.
    if (process.env.NODE_ENV !== 'production' && !process.env.NEXT_INTERNAL_URL) return;
    if (pending) return;
    pending = setTimeout(async () => {
        pending = null;
        try {
            const secret = process.env.REVALIDATE_SECRET;
            const res = await fetch(`${NEXT_URL}/api/revalidate`, {
                method: 'POST',
                headers: secret ? { 'x-revalidate-secret': secret } : {},
                signal: AbortSignal.timeout(5000),
            });
            if (!res.ok) throw new Error(`revalidate returned ${res.status}`);
            await fetch(`${NEXT_URL}/`, { signal: AbortSignal.timeout(20000) });
        } catch (err) {
            console.warn('[storefront] cache refresh failed:', (err as Error).message);
        }
    }, DEBOUNCE_MS);
}
