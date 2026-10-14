import type { Metadata } from 'next';
import CartClient from './CartClient';

/**
 * /cart — server route wrapper for the ported `frontend/pages/Cart.tsx`.
 *
 * The page itself is a client component (it needs the hydration-safe useCart
 * context), so the SEO metadata lives here, in the server component, per the
 * App Router contract ('use client' files cannot export metadata).
 *
 * Metadata decisions (docs/SEO_AUDIT.md §6, row `/cart`):
 *  - The legacy Vite page called NO usePageMeta hook, so it set no page-level
 *    title/description/canonical of its own. The audit's per-route checklist
 *    recommends a descriptive full title for this route, so `Your Cart |
 *    V2 Enterprise` is exported (deliberate, audit-driven addition — not legacy
 *    behavior; see PR notes).
 *  - `robots: { index: false }`: the legacy app emitted no robots meta for this
 *    route but robots.txt already Disallow: /cart; the audit §6 rule for
 *    private/transactional routes explicitly asks page agents to export the
 *    noindex meta tag as well (protects against indexing via incoming links).
 *  - No canonical (non-indexable transactional route) and no description —
 *    the audit row specifies both as absent.
 */

export const metadata: Metadata = {
  title: 'Your Cart | V2 Enterprise',
  robots: { index: false },
};

export default function CartPage() {
  return <CartClient />;
}
