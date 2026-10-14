/**
 * Shared SEO infrastructure for the Next.js app — single source of truth for the
 * canonical origin and site identity consumed by:
 *
 *   - `app/robots.ts`  → served at `/robots.txt`
 *   - `app/sitemap.ts` → served at `/sitemap.xml`
 *   - `app/layout.tsx` → root `Metadata` (metadataBase, canonical, OG/Twitter)
 *
 * ── Canonical-domain evidence (production = https://v2enterprise.in) ──────────
 *
 * The production origin is not ambiguous; it appears consistently across five
 * independent sources in the legacy stack:
 *
 *   1. `frontend/index.html` — `<link rel="canonical" href="https://v2enterprise.in/">`
 *      and `<meta property="og:url" content="https://v2enterprise.in/" />`
 *   2. `frontend/public/robots.txt` — `Sitemap: https://v2enterprise.in/sitemap.xml`
 *   3. `frontend/public/sitemap.xml` — every `<loc>` is `https://v2enterprise.in/…`
 *   4. `frontend/hooks/usePageMeta.ts` — `const BASE_URL = 'https://v2enterprise.in'`
 *      (used to absolutize canonicals and og:image at runtime)
 *   5. `backend/src/modules/sitemap/sitemap.controller.ts` — `const BASE_URL =
 *      'https://v2enterprise.in'`; and `backend/src/config/env.ts` defaults both
 *      `FRONTEND_URL` and `BACKEND_URL` to `https://v2enterprise.in`
 *
 * (`frontend/vercel.json` contains only an SPA rewrite — no domain evidence.)
 *
 * ── Environment contract ─────────────────────────────────────────────────────
 *
 * `NEXT_PUBLIC_SITE_URL` overrides the fallback above in every environment.
 * Local development (per `.env.example`): `NEXT_PUBLIC_SITE_URL=http://localhost:3001`.
 * Production: either set `NEXT_PUBLIC_SITE_URL=https://v2enterprise.in` explicitly
 * or rely on the fallback — but it must NEVER be a localhost/dev URL in a
 * production build, so the sitemap can never emit dev URLs into production.
 *
 * See `docs/SEO_AUDIT.md` for the full metadata audit and per-route checklist.
 */

/** Canonical production origin (see evidence above). */
const PRODUCTION_SITE_URL = 'https://v2enterprise.in';

/** Display name used for `og:site_name` (mirrors frontend/index.html). */
export const SITE_NAME = 'V2 Enterprise';

/** Root title tag of the legacy app (frontend/index.html `<title>`). */
export const DEFAULT_TITLE = 'V2 Enterprise — Premium Luxury Fashion';

/** Root meta description (frontend/index.html `<meta name="description">`). */
export const DEFAULT_DESCRIPTION =
  "Discover V2 Enterprise's exclusive collection of premium menswear and luxury fashion. Crafted with care in Bhavnagar, Gujarat. Shop kurtas, shirts, and more.";

/** Open Graph description (frontend/index.html `og:description`). */
export const DEFAULT_OG_DESCRIPTION =
  "Exclusive premium menswear and luxury fashion from Bhavnagar, Gujarat. Shop V2 Enterprise's curated collections.";

/** Twitter description (frontend/index.html `twitter:description`). */
export const DEFAULT_TWITTER_DESCRIPTION =
  'Exclusive premium menswear and luxury fashion, crafted with care.';

/**
 * Google site-verification token (frontend/index.html
 * `<meta name="google-site-verification">`). Re-exported for the root metadata.
 */
export const GOOGLE_SITE_VERIFICATION =
  'dWAxr9hgKpMtQ9YUgjrYh4rMtAfrcyUS61LZkFG5PKM';

/** PWA theme color (frontend/index.html `<meta name="theme-color">`). */
export const THEME_COLOR = '#0A0A0B';

const normalizeOrigin = (raw: string): string => {
  const trimmed = raw.trim().replace(/\/+$/, '');
  // Never resolve an obviously invalid origin — fall back to production.
  try {
    return new URL(trimmed).origin;
  } catch {
    return PRODUCTION_SITE_URL;
  }
};

/**
 * Canonical origin of this deployment.
 *
 * `NEXT_PUBLIC_SITE_URL` wins when set (dev: `http://localhost:3001`);
 * otherwise falls back to the well-evidenced production domain so a
 * production build without the env var still emits correct URLs (and never
 * localhost URLs).
 */
export const SITE_URL: string = normalizeOrigin(
  process.env.NEXT_PUBLIC_SITE_URL || PRODUCTION_SITE_URL,
);

/** Absolutizes a site-relative path against the canonical origin. */
export const absoluteUrl = (path = '/'): string => {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${suffix}`;
};

/**
 * Base URL of the backend API for **server-side** SEO fetches (sitemap).
 *
 * Deliberately NOT `lib/apiClient.ts` — that module is client-only (it touches
 * `localStorage` in its axios interceptors) and must not be imported from
 * server code like `app/sitemap.ts`.
 *
 * - Dev: `NEXT_PUBLIC_API_URL` (`.env.example`: `http://localhost:5000/api/v1`),
 *   falling back to `http://localhost:5000/api/v1` — matches the dev topology.
 * - Production: `NEXT_PUBLIC_API_URL` must be set to the absolute API base
 *   (e.g. `https://v2enterprise.in/api/v1` — Express serves frontend + API from
 *   one origin). If unset, dynamic sitemap entries simply degrade to empty and
 *   the sitemap serves the static entries only (see `app/sitemap.ts`).
 */
const DEV_API_BASE_URL = 'http://localhost:5000/api/v1';

export const SEO_API_BASE_URL: string = (
  process.env.NEXT_PUBLIC_API_URL || DEV_API_BASE_URL
).replace(/\/+$/, '');
