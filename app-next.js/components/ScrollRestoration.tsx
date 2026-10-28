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
 * pathname change. That fires on browser Back/Forward too, so returning from a
 * product page always slammed the shopper back to the top of the listing.
 *
 * WHY THE EARLIER FIXES DIDN'T WORK (both verified with a headless repro)
 * ----------------------------------------------------------------------
 * 1. Keying saved positions by an id in `history.state`: Next's App Router
 *    rewrites `history.state` on its soft navigations, so the id was lost and
 *    every Back generated a fresh id with no saved position → scroll to top.
 * 2. Keying by URL but saving on every `scroll` event: when the user clicks a
 *    product the outgoing shop page is scrolled to 0 (Next's default link
 *    scroll + the layout's AnimatePresence remount) BEFORE the route key
 *    switches, so a `scroll → 0` event overwrote the saved 1600 with 0. The
 *    repro showed exactly: `save /shop = 1600` then `save /shop = 0`.
 *
 * WHAT IT DOES NOW
 * ----------------
 * Positions are keyed by URL (survives Next's history churn) and the leaving
 * position is captured at NAVIGATION INTENT — a capture-phase listener on
 * `click` (and `keydown` Enter) reads `window.scrollY` the instant a link is
 * activated, before any scroll reset or remount can zero it. That frozen value
 * is stored for the URL being left. We also snapshot on `pagehide`.
 *
 * On each route change we restore the saved position for the URL we landed on
 * (the hallmark of Back/Forward to an already-scrolled page); otherwise we go
 * to the top (a genuine forward navigation, including product pages).
 *
 * LAZY CONTENT
 * ------------
 * The shop grid is client-fetched and rebuilt on Back, so briefly the document
 * is shorter than the saved Y. We re-apply the target across a short window
 * (rAF + timed retries) and keep a MutationObserver running briefly so
 * late-arriving rows still get the scroll re-applied. Never scrolls past the
 * current document height.
 */

const positions = new Map<string, number>();

function urlKey(pathname: string, search: string): string {
    return search ? `${pathname}?${search}` : pathname;
}

export default function ScrollRestoration() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const search = searchParams.toString();
    const activeKeyRef = useRef<string>('');

    useEffect(() => {
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }

        // Freeze the current URL's scroll position at the moment the user
        // intends to navigate — before any programmatic scroll-to-top or the
        // layout's route remount can zero it out. Capture phase so we run
        // ahead of React/Next click handlers.
        const snapshot = () => {
            if (activeKeyRef.current) positions.set(activeKeyRef.current, window.scrollY);
        };
        const onClickCapture = (e: MouseEvent) => {
            const el = e.target as Element | null;
            if (el && el.closest('a[href]')) snapshot();
        };
        const onKeyDownCapture = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                const el = e.target as Element | null;
                if (el && el.closest('a[href]')) snapshot();
            }
        };
        const onPageHide = () => snapshot();

        document.addEventListener('click', onClickCapture, true);
        document.addEventListener('keydown', onKeyDownCapture, true);
        window.addEventListener('pagehide', onPageHide);

        return () => {
            document.removeEventListener('click', onClickCapture, true);
            document.removeEventListener('keydown', onKeyDownCapture, true);
            window.removeEventListener('pagehide', onPageHide);
        };
    }, []);

    useEffect(() => {
        const key = urlKey(pathname, search);
        const target = positions.get(key);
        activeKeyRef.current = key;

        if (target === undefined || target === 0) {
            // Forward navigation to a URL we haven't scrolled (incl. product
            // pages), or one last left at the top: start at the top.
            positions.set(key, 0);
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
            return;
        }

        // Returning to a scrolled URL: restore, retrying while the client-fetched
        // grid grows the document tall enough to reach the saved Y.
        let cancelled = false;
        let settled = false;

        const maxScroll = () =>
            Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

        const apply = () => {
            if (cancelled) return;
            window.scrollTo({ top: Math.min(target, maxScroll()), left: 0, behavior: 'instant' as ScrollBehavior });
            if (maxScroll() >= target - 2) settled = true;
        };

        const raf = requestAnimationFrame(apply);
        const delays = [0, 50, 120, 220, 360, 550, 800, 1100, 1500, 2000, 2600];
        const timers = delays.map((d) => setTimeout(apply, d));

        const mo = new MutationObserver(() => {
            if (!settled) apply();
        });
        mo.observe(document.body, { childList: true, subtree: true });
        const moStop = setTimeout(() => mo.disconnect(), 3500);

        return () => {
            cancelled = true;
            cancelAnimationFrame(raf);
            timers.forEach(clearTimeout);
            clearTimeout(moStop);
            mo.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, search]);

    return null;
}
