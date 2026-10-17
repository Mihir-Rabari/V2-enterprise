import type { Metadata } from 'next';
import HomePage from '../../components/home/HomePage';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE } from '../../lib/seo';
import type { HeroSlide } from '../../types';

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
 *
 * ── Server-rendered hero ────────────────────────────────────────────────────
 * The hero slides are fetched here, straight from the backend on the same
 * machine, so the first HTML response already contains the hero instead of
 * waiting for a browser API call. The page is cached and regenerated in the
 * background at most every 60s, so admin edits to the hero show up within a
 * minute. If the backend is unreachable (e.g. during a build with the API
 * down) HomePage gets `null` and fetches the slides in the browser.
 */

export const revalidate = 60;

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:5000';

async function getHeroSlides(): Promise<HeroSlide[] | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/sliders/hero`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.success && Array.isArray(body.data) ? body.data : null;
  } catch {
    return null;
  }
}

export const metadata: Metadata = {
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
};

export default async function StorefrontHomePage() {
  return <HomePage initialHeroSlides={await getHeroSlides()} />;
}
