'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Scroll restoration for the App Router.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Vite SPA (and the first Next port in CustomerLayout) forced
 * `history.scrollRestoration = 'manual'` and then `scrollTo(0, 0)` on EVERY
 * pathname change. That is correct for forward navigation but it also fired on
 * browser Back/Forward, so returning from a product page always slammed the
 * shopper back to the top of the listing — the bug we are fixing.
 *
 * WHAT IT DOES
 * ------------
 * We take over scroll restoration deterministically:
 *   • PUSH navigation (clicking a product, a link, a new filter URL) → top.
 *   • POP navigation (browser Back/Forward) → restore the Y we saved for that
 *     history entry.
 *
 * Next's App Router does soft client navigations, so the browser's native
 * restoration is unreliable here; we manage positions ourselves in a Map keyed
 * by a per-entry id persisted in `history.state`.
 *
 * LAZY CONTENT
 * ------------
 * The shop grid is client-fetched and resets to page 1 on Back, so immediately
 * after a POP the document is far shorter than it was when the user left. A
 * single `scrollTo` would be clamped to the short page and lose the position.
 * We therefore re-apply the target Y across a short window (rAF + a few timed
 * retries) as more products stream in and the document grows, stopping early
 * once the target is actually reachable. This is best-effort and self-limiting;
 * it never scrolls past the current document height.
 */

const KEY = '__v2_scroll_key';
const positions = new Map<string, number>();

/** Stable id for the current history entry (created lazily, survives Back/Forward). */
function currentKey(): string {
    if (typeof window === 'undefined') return 'ssr';
    const state = window.history.state as Record<string, unknown> | null;
    const existing = state && typeof state[KEY] === 'string' ? (state[KEY] as string) : null;
    if (existing) return existing;
    const generated = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
        window.history.replaceState({ ...(state ?? {}), [KEY]: generated }, '');
    } catch {
        /* replaceState can throw in rare sandboxed contexts — degrade gracefully. */
    }
    return generated;
}

export default function ScrollRestoration() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    // Tracks whether the NEXT route change came from a browser Back/Forward.
    const popRef = useRef(false);
    // The key of the entry we are currently on (so we save against the right id).
    const activeKeyRef = useRef<string>('');

    // Own scroll restoration; the browser must not also try to restore.
    useEffect(() => {
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
        activeKeyRef.current = currentKey();

        const onPopState = () => {
            popRef.current = true;
        };
        window.addEventListener('popstate', onPopState);

        // Continuously record the current entry's scroll position so a later
        // Back to it lands where the user was. Passive + the ref write is cheap.
        const onScroll = () => {
            positions.set(activeKeyRef.current, window.scrollY);
        };
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            window.removeEventListener('popstate', onPopState);
            window.removeEventListener('scroll', onScroll);
        };
    }, []);

    // React to route changes (pathname OR query string — filter changes on the
    // shop page keep the same pathname but are still forward navigations).
    useEffect(() => {
        const key = currentKey();
        activeKeyRef.current = key;

        const isPop = popRef.current;
        popRef.current = false;

        if (!isPop) {
            // Forward navigation: start a fresh entry at the top.
            positions.set(key, 0);
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
            return;
        }

        // Back/Forward: restore the saved position, retrying while lazily
        // fetched content grows the document tall enough to reach it.
        const target = positions.get(key) ?? 0;
        if (target === 0) {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
            return;
        }

        let cancelled = false;
        const delays = [0, 60, 120, 240, 400, 700, 1000];
        const timers: ReturnType<typeof setTimeout>[] = [];

        const apply = () => {
            if (cancelled) return;
            const maxScroll = Math.max(
                0,
                document.documentElement.scrollHeight - window.innerHeight,
            );
            window.scrollTo({ top: Math.min(target, maxScroll), left: 0, behavior: 'instant' as ScrollBehavior });
        };

        // rAF for the first paint, then timed retries as more products load.
        const raf = requestAnimationFrame(apply);
        for (const d of delays) timers.push(setTimeout(apply, d));

        return () => {
            cancelled = true;
            cancelAnimationFrame(raf);
            timers.forEach(clearTimeout);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, searchParams]);

    return null;
}
