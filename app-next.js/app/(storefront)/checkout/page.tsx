import type { Metadata } from 'next';
import CheckoutClient from './CheckoutClient';

/**
 * /checkout — server route wrapper for the ported `frontend/pages/Checkout.tsx`.
 *
 * The page itself is a client component (payment flow: hydration-safe
 * useCart/useAuth contexts, sessionStorage, dynamically-loaded Razorpay
 * checkout.js), so the SEO metadata lives here, in the server component, per
 * the App Router contract ('use client' files cannot export metadata).
 *
 * Metadata decisions (docs/SEO_AUDIT.md §6, row `/checkout`):
 *  - `title` and `description` replicate the legacy `usePageMeta({ title:
 *    'Checkout | V2 Enterprise', description: 'Securely complete your V2
 *    Enterprise order.', canonical: '/checkout' })` call verbatim (OG/Twitter
 *    title+description below mirror the tags that hook set; og:image is
 *    intentionally omitted — the referenced /og-image.jpg asset does not exist
 *    anywhere in the repo, same call the root layout makes).
 *  - No canonical: the legacy hook set one, but this is a private/transactional
 *    route already blocked by robots.txt, so the audit §6 row explicitly drops
 *    it as pointless ("legacy had /checkout — pointless on a blocked page").
 *  - `robots: { index: false }`: the legacy app emitted no robots meta here,
 *    but the audit §6 rule for private/transactional routes explicitly asks
 *    page agents to export the noindex meta tag (robots.txt already Disallow:
 *    /checkout; the tag also protects against indexing via incoming links).
 */

export const metadata: Metadata = {
  title: 'Checkout | V2 Enterprise',
  description: 'Securely complete your V2 Enterprise order.',
  robots: { index: false },
  openGraph: {
    title: 'Checkout | V2 Enterprise',
    description: 'Securely complete your V2 Enterprise order.',
  },
  twitter: {
    title: 'Checkout | V2 Enterprise',
    description: 'Securely complete your V2 Enterprise order.',
  },
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
