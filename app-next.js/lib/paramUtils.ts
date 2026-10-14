/**
 * Route-param helpers shared by the catalog workstream (client + server).
 *
 * The Vite app received category/subcategory params from React Router and ran
 * `decodeURIComponent(...)` on them for display (`Shop.tsx`, `SubCategories.tsx`).
 * The original code never ran `tsc` and would throw a `URIError` on a malformed
 * percent sequence (e.g. `/50%-off`) — harmless in a client-only SPA, but a
 * server-side crash (500) in the App Router. `safeDecode` keeps the successful
 * path byte-identical and falls back to the raw value instead of throwing.
 */

/** decodeURIComponent that falls back to the raw value instead of throwing. */
export function safeDecode(value: string | undefined): string {
    if (!value) return '';
    try {
        return decodeURIComponent(value);
    } catch {
        // Malformed percent sequence — the legacy SPA would have crashed here;
        // degrade to the raw segment so the route still renders.
        return value;
    }
}

/**
 * Human-readable label for a route param, per docs/SEO_AUDIT.md §6
 * (`paramToLabel`): decode, split kebab/snake into words, title-case.
 * Used for the `generateMetadata` titles of `/[category]` and
 * `/[category]/[subcategory]`, which had no legacy titles to port.
 */
export function paramToLabel(value: string | undefined): string {
    return safeDecode(value)
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}
