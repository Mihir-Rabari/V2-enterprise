import type { Metadata } from 'next';
import HomePage from '../../components/home/HomePage';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE } from '../../lib/seo';

/**
 * "/" — server entry for the storefront home page (Next.js port of
 * frontend/pages/Home.tsx).
 *
 * The route group (storefront) owns "/": the page renders inside the shared
 * customer layout (Navbar/Footer + the provider stack from
 * frontend/components/CustomerView.tsx). All hooks, data fetching and
 * framer-motion animation live in the HomePage client component
 * (components/home/HomePage.tsx) — this file stays a server component so it
 * can own the route metadata.
 *
 * ── Metadata (docs/SEO_AUDIT.md §6, "/" row) ────────────────────────────────
 * The legacy Vite home page imported `usePageMeta` but never called it (dead
 * import, per the audit) — "/" relied entirely on the static head of
 * frontend/index.html, i.e. the root values. Per the audit checklist this
 * route therefore exports an explicit metadata equal to the root constants
 * (title/description from lib/seo.ts, canonical "/"), which the root
 * `metadataBase` resolves to https://v2enterprise.in/. OG/Twitter/robots are
 * inherited from the root layout (identical values for "/").
 */

export const metadata: Metadata = {
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
};

export default function StorefrontHomePage() {
  return <HomePage />;
}
