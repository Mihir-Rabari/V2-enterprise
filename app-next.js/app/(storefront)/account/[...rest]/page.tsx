import type { Metadata } from 'next';

/**
 * /account/<unknown> — catch-all preserving the Vite SPA's behavior for
 * unmatched account subpaths.
 *
 * In the Vite app, `CustomerView.tsx` mounted `<Route path="account/*">` and
 * `Account.tsx` rendered its shell around NESTED `<Routes>` that only defined
 * `index`, `orders`, `wishlist` and `addresses`. A URL like /account/foo
 * matched the outer route (shell + nav rendered) but matched nothing inside
 * the nested Routes, so the content area rendered EMPTY while the URL stayed
 * put and the server kept answering 200 (it was an SPA).
 *
 * This required catch-all (it does NOT match /account itself — that is
 * page.tsx above) reproduces exactly that: the shared shell from
 * ../layout.tsx renders around an empty content area. The layout's auth gate
 * still applies, so unauthenticated visitors are sent to
 * /login?redirect=/account/foo just like the Vite `<Navigate>` did.
 *
 * Metadata: minimal title + `robots: { index: false }` per docs/SEO_AUDIT.md
 * §6.3 (private route, no canonical).
 */

export const metadata: Metadata = {
    title: 'My Account | V2 Enterprise',
    robots: { index: false },
};

export default function AccountCatchAllPage() {
    // Vite parity: nested Routes rendered nothing for unmatched subpaths.
    return null;
}
