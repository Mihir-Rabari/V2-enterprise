import type { MetadataRoute } from 'next';
import { SEO_API_BASE_URL, SITE_URL } from '@/lib/seo';

/**
 * `/sitemap.xml` — Next.js MetadataRoute.Sitemap, replacing BOTH legacy sources:
 *
 *  - `frontend/public/sitemap.xml` (static, Vite-served): /, /shop, /categories,
 *    /about, /contact, /new-arrivals at https://v2enterprise.in
 *  - `backend/src/modules/sitemap/sitemap.controller.ts` (dynamic, mounted at
 *    `/sitemap.xml` in production): /, /shop, /about, /contact + per-product
 *    `/product/<id>` + per-category entries
 *
 * Priorities/change frequencies below are ported from that legacy evidence;
 * static routes come from the committed route matrix (ROUTE_MIGRATION.md).
 *
 * Dynamic entries (products + categories) are fetched at request/render time
 * from the backend API with **graceful degradation**: if the API is
 * unreachable (e.g. no backend running locally, or `NEXT_PUBLIC_API_URL` unset
 * in production) the sitemap simply serves the static entries — no invented
 * URLs, and never dev URLs in production (the origin comes from lib/seo.ts's
 * env-driven canonical base).
 *
 * Revalidated hourly (`export const revalidate`) so product/category additions
 * and edits appear without a redeploy.
 */

/** Hourly ISR: sitemap stays fresh without per-request fetch cost. */
export const revalidate = 3600;

type ChangeFrequency = NonNullable<
  MetadataRoute.Sitemap[number]['changeFrequency']
>;

interface StaticRouteDef {
  path: string;
  changeFrequency: ChangeFrequency;
  priority: number;
}

/**
 * Static storefront routes from the route matrix (ROUTE_MIGRATION.md).
 * Frequencies/priorities: 1:1 with frontend/public/sitemap.xml where it had
 * the route; new matrix additions get conservative values.
 */
const STATIC_ROUTES: readonly StaticRouteDef[] = [
  { path: '/', changeFrequency: 'daily', priority: 1.0 }, // both legacy sources
  { path: '/shop', changeFrequency: 'daily', priority: 0.9 }, // both legacy sources
  { path: '/categories', changeFrequency: 'weekly', priority: 0.8 }, // frontend sitemap.xml
  { path: '/new-arrivals', changeFrequency: 'daily', priority: 0.8 }, // frontend sitemap.xml
  { path: '/about', changeFrequency: 'monthly', priority: 0.7 }, // frontend sitemap.xml
  { path: '/contact', changeFrequency: 'monthly', priority: 0.6 }, // frontend sitemap.xml
  // Matrix additions not present in either legacy sitemap (conservative):
  { path: '/size-guide', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/login', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/signup', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/privacy', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/returns', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/shipping', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'monthly', priority: 0.3 },
] as const;

// ── API response guards (server-side JSON is `unknown` under strict TS) ──────

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asRecordArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

/** Per-request timeout: fail fast, never block the sitemap on a slow API. */
const FETCH_TIMEOUT_MS = 5_000;
/** Backend caps `limit` at 500 (backend/src/modules/products/products.controller.ts). */
const PRODUCTS_PAGE_SIZE = 500;
/** Hard cap on product URL count so a huge catalog can't stall the render. */
const MAX_PRODUCT_PAGES = 3;

const fetchJson = async (url: string): Promise<unknown> => {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null; // unreachable API / timeout / invalid JSON → graceful degradation
  }
};

const parseDate = (value: unknown): Date | undefined => {
  if (typeof value !== 'string' || value === '') return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

// ── Dynamic entries: products ────────────────────────────────────────────────

/**
 * ACTIVE products → `${SITE_URL}/product/<id>`.
 *
 * The public `/products` endpoint always returns ACTIVE-only ("Public listing:
 * ALWAYS ACTIVE only" — products.controller.ts), so parity with the legacy
 * backend sitemap (`Product.find({ status: ACTIVE })`) is preserved. `id` is
 * preferred over `_id` (the service maps both onto every document).
 */
const fetchProductEntries = async (): Promise<MetadataRoute.Sitemap> => {
  const entries: MetadataRoute.Sitemap = [];

  for (let page = 1; page <= MAX_PRODUCT_PAGES; page++) {
    const url = `${SEO_API_BASE_URL}/products?page=${page}&limit=${PRODUCTS_PAGE_SIZE}`;
    const payload = await fetchJson(url);
    const body = isRecord(payload) ? payload : null;
    const data = isRecord(body?.data) ? body.data : null;

    const products = asRecordArray(data?.products);
    if (products.length === 0) break;

    for (const product of products) {
      const id = product.id ?? product._id;
      if (typeof id !== 'string' || id === '') continue;

      // Defensive parity filter (public endpoint should never send inactive).
      const status = product.status;
      if (typeof status === 'string' && status.toUpperCase() !== 'ACTIVE') {
        continue;
      }

      entries.push({
        url: `${SITE_URL}/product/${id}`,
        lastModified: parseDate(product.updatedAt),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    const totalPages =
      typeof data?.totalPages === 'number' ? data.totalPages : page;
    if (page >= totalPages) break;
  }

  return entries;
};

// ── Dynamic entries: categories ──────────────────────────────────────────────

/**
 * ACTIVE categories → `${SITE_URL}/<name>` (top-level) and
 * `${SITE_URL}/<parentName>/<name>` (children).
 *
 * URL shape evidence — the legacy frontend links categories by NAME, not slug
 * (and the backend sitemap's `/category/<slug>` shape was stale/legacy):
 *   - frontend/pages/Categories.tsx:
 *       `<Link to={`/${encodeURIComponent(category.name || category.title)}`}>`
 *   - frontend/pages/SubCategories.tsx:
 *       `<Link to={`/${category}/${encodeURIComponent(sub.name || sub.title)}`}>`
 *
 * `/[category]` (SubCategories page) and `/[category]/[subcategory]` (Shop
 * variant) are committed routes in ROUTE_MIGRATION.md. `/${category}/All`
 * redirect targets are deliberately NOT emitted (canonical duplication).
 */
const fetchCategoryEntries = async (): Promise<MetadataRoute.Sitemap> => {
  const payload = await fetchJson(`${SEO_API_BASE_URL}/categories`);
  const body = isRecord(payload) ? payload : null;
  const categories = asRecordArray(body?.data);

  // Parent lookup: children reference `parentId: { _id, name }` (populated).
  const nameById = new Map<string, string>();
  for (const cat of categories) {
    if (typeof cat._id === 'string' && typeof cat.name === 'string') {
      nameById.set(cat._id, cat.name);
    }
  }

  const entries: MetadataRoute.Sitemap = [];
  for (const cat of categories) {
    const name = cat.name;
    if (typeof name !== 'string' || name === '') continue;
    if (typeof cat.status === 'string' && cat.status.toUpperCase() !== 'ACTIVE') {
      continue;
    }

    const parentRef = cat.parentId;
    const parentId =
      isRecord(parentRef) && typeof parentRef._id === 'string'
        ? parentRef._id
        : typeof parentRef === 'string'
          ? parentRef
          : null;
    const parentName =
      (isRecord(parentRef) && typeof parentRef.name === 'string'
        ? parentRef.name
        : null) ??
      (typeof cat.parentCategory === 'string' ? cat.parentCategory : null) ??
      (parentId ? nameById.get(parentId) ?? null : null);

    const lastModified = parseDate(cat.updatedAt);
    const segment = encodeURIComponent(name);

    if (parentName) {
      entries.push({
        url: `${SITE_URL}/${encodeURIComponent(parentName)}/${segment}`,
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    } else {
      entries.push({
        url: `${SITE_URL}/${segment}`,
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  }

  return entries;
};

// ── Route entry point ────────────────────────────────────────────────────────

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [productEntries, categoryEntries] = await Promise.all([
    fetchProductEntries(),
    fetchCategoryEntries(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
