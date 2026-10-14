/**
 * Server-side product SEO data + schema builders for the product detail routes
 * (`/product/[id]` and `/[category]/[subcategory]/[id]`), shared by their thin
 * `page.tsx` entries so the implementation exists exactly once.
 *
 * Server-only module — plain `fetch` against the backend with response-shape
 * guards (strict TS), mirroring `app/sitemap.ts`. It deliberately does NOT
 * import `lib/apiClient.ts` (client-only: localStorage in its axios
 * interceptors — see that file's header).
 *
 * What replaces what (docs/SEO_AUDIT.md §6.4):
 *  - Legacy `usePageMeta({ title, description, ogImage, canonical, jsonLd })`
 *    ran CLIENT-side and upserted <head> tags at runtime. Here the server
 *    entries own it: `buildProductMetadata` → the Next Metadata API;
 *    `ProductJsonLd` → a `<script type="application/ld+json">` rendered in the
 *    page body (Google reads JSON-LD from body or head).
 *  - The legacy Product schema (frontend/pages/ProductDetails.tsx lines 63–108)
 *    is reproduced field-for-field: name, image[photo, ...photos], description,
 *    brand V2 Enterprise, sku/mpn (styleCode || id), offers {url, INR, price,
 *    priceValidUntil +1y, NewCondition, InStock ↔ quantity>0, seller}, and —
 *    only when reviews exist — aggregateRating + review[].
 *  - `offers.url` uses `absoluteUrl(\`/product/${id}\`)` (lib/seo.ts) instead
 *    of the legacy hardcoded `https://v2enterprise.in/product/<id>` (§6.4).
 *
 * Graceful degradation (no invented data):
 *  - No backend / API error / unknown id → `fetchSeoProduct` returns null →
 *    the page emits the legacy fallback title ('Product Details | V2
 *    Enterprise') + fallback description ('Premium luxury fashion from V2
 *    Enterprise.') with a canonical that still carries the REAL route id, and
 *    NO JSON-LD (legacy also produced `undefined` JSON-LD without a product).
 *    The interactive page itself still renders its loading → "Item not found"
 *    client states (the fetch stays client-side, like the Vite app).
 *  - Reviews are only fetched once a product resolved (legacy parity: the
 *    reviews fetch lived in a `useEffect` gated on `product`).
 */

import type { Metadata } from 'next';
import { SEO_API_BASE_URL, absoluteUrl } from '@/lib/seo';

/** Fallbacks ported verbatim from the legacy usePageMeta call. */
export const PRODUCT_FALLBACK_TITLE = 'Product Details | V2 Enterprise';
export const PRODUCT_FALLBACK_DESCRIPTION =
    'Premium luxury fashion from V2 Enterprise.';

/** Per-request timeout: fail fast, never block the page on a slow API (sitemap.ts policy). */
const FETCH_TIMEOUT_MS = 5_000;

// ── API response guards (server-side JSON is `unknown` under strict TS) ──────

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

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

// ── Server-side product/review shapes (only what SEO consumes) ───────────────

export interface SeoProduct {
    id: string;
    name?: string;
    description?: string;
    photo?: string;
    photos?: string[];
    price?: number;
    quantity?: number;
    styleCode?: string;
}

export interface SeoReview {
    rating: number;
    reviewText: string;
    customerName?: string;
    date?: string;
}

/**
 * Product for metadata/JSON-LD, or null when the API is unreachable/unknown —
 * callers then fall back to the legacy static metadata. `id` prefers the API's
 * own id/_id (mirrors the CartContext id normalization) and falls back to the
 * route id.
 */
export async function fetchSeoProduct(id: string): Promise<SeoProduct | null> {
    const payload = await fetchJson(
        `${SEO_API_BASE_URL}/products/${encodeURIComponent(id)}`,
    );
    const body = isRecord(payload) ? payload : null;
    const data = isRecord(body?.data) ? body.data : null;
    if (!data) return null;

    const rawId = data.id ?? data._id;
    const resolvedId =
        typeof rawId === 'string' && rawId !== ''
            ? rawId
            : typeof rawId === 'number'
              ? String(rawId)
              : id;

    const product: SeoProduct = { id: resolvedId };
    if (typeof data.name === 'string') product.name = data.name;
    if (typeof data.description === 'string') product.description = data.description;
    if (typeof data.photo === 'string') product.photo = data.photo;
    if (Array.isArray(data.photos)) {
        product.photos = data.photos.filter(
            (photo): photo is string => typeof photo === 'string',
        );
    }
    if (typeof data.price === 'number') product.price = data.price;
    if (typeof data.quantity === 'number') product.quantity = data.quantity;
    if (typeof data.styleCode === 'string') product.styleCode = data.styleCode;
    return product;
}

/**
 * Published reviews for the Product JSON-LD (aggregateRating + review[]).
 * Entries without a numeric rating or textual body are skipped — they could
 * not populate the legacy schema fields.
 */
export async function fetchSeoReviews(id: string): Promise<SeoReview[]> {
    const payload = await fetchJson(
        `${SEO_API_BASE_URL}/reviews/product/${encodeURIComponent(id)}`,
    );
    const body = isRecord(payload) ? payload : null;
    const list = Array.isArray(body?.data) ? body.data : [];

    const reviews: SeoReview[] = [];
    for (const entry of list) {
        if (!isRecord(entry)) continue;
        if (typeof entry.rating !== 'number' || typeof entry.reviewText !== 'string') {
            continue;
        }
        reviews.push({
            rating: entry.rating,
            reviewText: entry.reviewText,
            customerName:
                typeof entry.customerName === 'string' ? entry.customerName : undefined,
            date: typeof entry.date === 'string' ? entry.date : undefined,
        });
    }
    return reviews;
}

/**
 * Product + reviews for one page render. Sequential by design: reviews are
 * only fetched once the product resolved (legacy parity — the legacy
 * reviews effect called `reviewsAPI.getForProduct(product.id)` with the API's
 * OWN product id, so the reviews fetch uses the resolved id, not the route
 * id). `fetch` request memoization dedupes the product call between
 * generateMetadata and the page render.
 */
export async function getProductPageData(
    id: string,
): Promise<{ product: SeoProduct | null; reviews: SeoReview[] }> {
    const product = await fetchSeoProduct(id);
    if (!product) return { product: null, reviews: [] };
    const reviews = await fetchSeoReviews(product.id);
    return { product, reviews };
}

// ── Product JSON-LD (docs/SEO_AUDIT.md §6.4) ────────────────────────────────

/**
 * schema.org Product, reproduced from the legacy client-side memo
 * (frontend/pages/ProductDetails.tsx lines 63–108):
 *  - same fields, same availability/priceValidUntil logic;
 *  - `offers.url` absolutized via `absoluteUrl('/product/<id>')` instead of
 *    the hardcoded production domain (§6.4 port requirement);
 *  - `image` filters falsy entries — the legacy `[product.photo, ...photos]`
 *    emitted `null` for a missing photo once JSON-stringified; with data
 *    present the array is identical;
 *  - availability keeps the legacy truth table: missing quantity → OutOfStock
 *    (`undefined > 0` was false in the Vite app).
 * Returns null when there is no product (legacy returned `undefined` and the
 * hook then emitted no JSON-LD at all).
 */
export function buildProductJsonLd(
    id: string,
    product: SeoProduct | null,
    reviews: SeoReview[],
): Record<string, unknown> | null {
    if (!product) return null;

    const jsonLd: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        image: [product.photo, ...(product.photos ?? [])].filter(Boolean),
        description: product.description,
        brand: {
            '@type': 'Brand',
            name: 'V2 Enterprise',
        },
        sku: product.styleCode || product.id,
        mpn: product.styleCode || product.id,
        offers: {
            '@type': 'Offer',
            url: absoluteUrl(`/product/${id}`),
            priceCurrency: 'INR',
            price: product.price,
            priceValidUntil: new Date(
                new Date().setFullYear(new Date().getFullYear() + 1),
            )
                .toISOString()
                .split('T')[0],
            itemCondition: 'https://schema.org/NewCondition',
            availability:
                (product.quantity ?? 0) > 0
                    ? 'https://schema.org/InStock'
                    : 'https://schema.org/OutOfStock',
            seller: {
                '@type': 'Organization',
                name: 'V2 Enterprise',
            },
        },
    };

    if (reviews.length > 0) {
        jsonLd.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: (
                reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
            ).toFixed(1),
            reviewCount: reviews.length,
        };
        jsonLd.review = reviews.map((review) => ({
            '@type': 'Review',
            author: review.customerName || 'Anonymous',
            datePublished: review.date,
            reviewBody: review.reviewText,
            reviewRating: {
                '@type': 'Rating',
                ratingValue: review.rating,
            },
        }));
    }

    return jsonLd;
}

/**
 * Renders the Product JSON-LD as a `<script type="application/ld+json">` inside
 * the page body (§6.4: inject via dangerouslySetInnerHTML). Renders nothing
 * when there is no product data — no invented schema. `<` is escaped to the
 * JSON-compatible `\u003C` so review text can never break out of the script
 * tag (the legacy hook used `textContent`, which was injection-safe by
 * construction; this restores that guarantee for server-rendered HTML).
 */
export function ProductJsonLd({
    id,
    product,
    reviews,
}: {
    id: string;
    product: SeoProduct | null;
    reviews: SeoReview[];
}) {
    const jsonLd = buildProductJsonLd(id, product, reviews);
    if (!jsonLd) return null;
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify(jsonLd).replace(/</g, '\\u003C'),
            }}
        />
    );
}

// ── Page metadata ────────────────────────────────────────────────────────────

/**
 * Route metadata for a product page, replacing the legacy usePageMeta call:
 *
 *   title:       `${product.name} | V2 Enterprise` (fallback title without a
 *                product — and, unlike `${undefined} | …`, also when the API
 *                somehow returns a nameless product)
 *   description: `product.description.slice(0, 160)` (legacy truncation),
 *                fallback 'Premium luxury fashion from V2 Enterprise.'
 *   canonical:   `canonicalPath` — the REAL route the user is on
 *                (`/product/<id>` or `/<category>/<subcategory>/<id>`), with
 *                the real id interpolated; absolutized by the root
 *                metadataBase like every other route.
 *   OG:          type 'website' (og:type has no product value — §6.4; product
 *                semantics live in the JSON-LD), og:title/description,
 *                og:image = product photo (CDN/absolute as-is; relative
 *                photos absolutized by metadataBase — same as the legacy
 *                `${BASE_URL}${ogImage}`) and og:url = canonicalPath (the
 *                legacy hook never set og:url; under the Metadata API the
 *                root layout's og:url '/' would otherwise inherit).
 *   Twitter:     title/description/image, mirroring the legacy hook's
 *                twitter:title/twitter:image/twitter:description upserts.
 */
export function buildProductMetadata(
    canonicalPath: string,
    product: SeoProduct | null,
): Metadata {
    const title = product?.name
        ? `${product.name} | V2 Enterprise`
        : PRODUCT_FALLBACK_TITLE;
    const description =
        product?.description?.slice(0, 160) || PRODUCT_FALLBACK_DESCRIPTION;
    const ogImage = product?.photo;

    return {
        title,
        description,
        alternates: { canonical: canonicalPath },
        openGraph: {
            type: 'website',
            url: canonicalPath,
            title,
            description,
            ...(ogImage ? { images: [ogImage] } : {}),
        },
        twitter: {
            title,
            description,
            ...(ogImage ? { images: [ogImage] } : {}),
        },
    };
}
