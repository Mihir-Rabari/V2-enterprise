import type { Metadata } from 'next';
import HomePage from '../../components/home/HomePage';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE } from '../../lib/seo';
import { backendGet } from '../../lib/serverApi';
import { pickInitialProducts, type HomeInitialData } from '../../components/home/homeData';
import type { ApiProduct } from '../../hooks/useProducts';

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
 * ── Server-rendered, cached homepage ───────────────────────────────────────
 * All homepage data is fetched here, in parallel, straight from the backend on
 * the same machine (lib/serverApi.ts), so the first HTML response contains the
 * whole page instead of an empty shell that waits for ~10 browser API calls.
 * The page is rendered at build time (warm from the first visitor), cached,
 * and regenerated in the background at most every 10 minutes; admin edits
 * expire the cache immediately (app/api/revalidate/route.ts). Only the
 * products the first screens show go into the HTML — HomePage loads the full
 * list in the background for the Essentials filters. Any piece that fails to
 * load here is `null` and fetched in the browser instead.
 */

// Must be a literal; keep in sync with HOME_REVALIDATE_SECONDS.
export const revalidate = 600;

async function getHomeData(): Promise<HomeInitialData> {
  const [heroSlides, promoSlides, marquee, categories, reviews, filterSuggestions, lookbook, productPage] =
    await Promise.all([
      backendGet<HomeInitialData['heroSlides']>('/sliders/hero'),
      backendGet<HomeInitialData['promoSlides']>('/sliders/promotional'),
      backendGet<HomeInitialData['marquee']>('/content/MARQUEE'),
      backendGet<HomeInitialData['categories']>('/categories'),
      backendGet<HomeInitialData['reviews']>('/reviews/homepage'),
      backendGet<HomeInitialData['filterSuggestions']>('/filters/suggestions'),
      backendGet<HomeInitialData['lookbook']>('/content/LOOKBOOK_ITEM'),
      backendGet<{ products?: ApiProduct[] }>('/products?limit=300&groupByColor=true'),
    ]);
  return {
    heroSlides, promoSlides, marquee, categories, reviews, filterSuggestions, lookbook,
    products: productPage?.products ? pickInitialProducts(productPage.products) : null,
  };
}

export const metadata: Metadata = {
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
};

export default async function StorefrontHomePage() {
  return <HomePage initialData={await getHomeData()} />;
}
