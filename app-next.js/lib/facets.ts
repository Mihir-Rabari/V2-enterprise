/**
 * Category-scoped facet derivation.
 *
 * Client requirement (2026-10-14): the filter sidebar on a category page must
 * offer only values that exist among the products in that category — not the
 * global suggestions doc, which is catalog-wide and had gone stale (live
 * example at the time: the Denim page offered Color "Ivory" / Size "S" /
 * Fabric "Tencel" while its only product is Indigo, sizes 32/34, fabric
 * "Selvedge Denim").
 *
 * Pure and client-side on purpose — the backend is a frozen migration
 * dependency. ShopView feeds this the products of ONE bounded query for the
 * active category scope (see the "Category-scoped filter facets" block there).
 */

/** Attribute keys the shop sidebar builds sections for (mirrors ShopView.dynamicFiltersList). */
const ATTRIBUTE_KEYS = [
    'color', 'size', 'patternType', 'fabric', 'collar', 'sleeve', 'neck',
    'pocket', 'length', 'chest', 'waist', 'shoulder', 'sleeveLength',
] as const;

/** Facet map: every attribute key is always present; `custom_<key>` only when products carry it. */
export type Facets = Record<string, string[]>;

const isObjectLike = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const readTrimmed = (value: unknown): string | null =>
    typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

const readStringArray = (value: unknown): readonly string[] =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/**
 * Derive filter facet values from a list of products.
 *
 * - Every ATTRIBUTE_KEYS entry is always present in the result, EMPTY arrays
 *   included: an empty entry means "no product in scope carries this
 *   attribute", which the sidebar renders as a hidden section — that is the
 *   point of scoped facets. An ABSENT key means "not derived at all" (the
 *   caller then falls back to legacy suggestions).
 * - Colors/sizes are collected from the top-level fields AND from variants
 *   (groupByColor products carry per-variant color/size).
 * - Product customAttributes become `custom_<key>` entries.
 */
export const deriveFacets = (products: readonly unknown[]): Facets => {
    const sets: Record<string, Set<string>> = {};
    for (const key of ATTRIBUTE_KEYS) sets[key] = new Set<string>();

    const add = (key: string, value: unknown) => {
        const trimmed = readTrimmed(value);
        if (trimmed === null) return;
        if (!sets[key]) sets[key] = new Set<string>();
        sets[key].add(trimmed);
    };

    for (const product of products) {
        if (!isObjectLike(product)) continue;

        add('color', product.color);
        readStringArray(product.colors).forEach(value => add('color', value));
        readStringArray(product.sizes).forEach(value => add('size', value));
        for (const variant of Array.isArray(product.variants) ? product.variants : []) {
            if (!isObjectLike(variant)) continue;
            add('color', variant.color);
            add('size', variant.size);
        }

        for (const key of ATTRIBUTE_KEYS) {
            if (key !== 'color' && key !== 'size') add(key, product[key]);
        }

        for (const [key, value] of Object.entries(isObjectLike(product.customAttributes) ? product.customAttributes : {})) {
            add(`custom_${key}`, value);
        }
    }

    const facets: Facets = {};
    for (const [key, values] of Object.entries(sets)) facets[key] = Array.from(values).sort();
    return facets;
};
