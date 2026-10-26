/**
 * Unit tests for lib/categoryScope.ts — the category-scope resolution that
 * feeds BOTH the product grid query and the scoped facet baseline.
 *
 * Primary regression target (bug fixed 2026-10-26): on `/<category>/All`
 * (a main category with no subcategories, forwarded there by the SubCategories
 * page) the main category was dropped, so the grid showed the whole catalog
 * and the sidebar showed catalog-wide "dead" filters. The route's main category
 * must now scope the query. Also guards the pre-existing checkbox behaviour.
 */
import { describe, it, expect } from 'vitest';
import { resolveCategoryScope, type CategoryLike } from '../lib/categoryScope';

const categories: CategoryLike[] = [
    { name: 'Mens' }, // main (no parentId)
    { name: 'Womens' }, // main
    { name: 'Shirts', parentId: '1' }, // sub of Mens
    { name: 'Denim', parentId: '1' }, // sub of Mens
];

describe('resolveCategoryScope', () => {
    it('scopes /<category>/All to the main category (the dropped-category bug)', () => {
        // URL: /mens/All → subcategory="All" → initialCategory="All" →
        // selectedCategories=[] (nothing checked). The route main category must
        // still constrain the scope.
        const scope = resolveCategoryScope({
            selectedCategories: [],
            allCategories: categories,
            subcategory: 'All',
            initialCategory: 'All',
            routeMainCategory: 'Mens',
        });
        expect(scope.mainCategories).toEqual(['Mens']);
        expect(scope.subCategories).toEqual([]);
    });

    it('canonicalises the route main category case-insensitively', () => {
        // /MENS/All should resolve to the stored "Mens" name.
        const scope = resolveCategoryScope({
            selectedCategories: [],
            allCategories: categories,
            subcategory: 'All',
            initialCategory: 'All',
            routeMainCategory: 'mens',
        });
        expect(scope.mainCategories).toEqual(['Mens']);
    });

    it('still scopes before categories have loaded (uses the raw segment)', () => {
        const scope = resolveCategoryScope({
            selectedCategories: [],
            allCategories: [],
            subcategory: 'All',
            initialCategory: 'All',
            routeMainCategory: 'Mens',
        });
        expect(scope.mainCategories).toEqual(['Mens']);
        expect(scope.subCategories).toEqual([]);
    });

    it('prefers a real subcategory over the route main category', () => {
        // /mens/shirts → the subcategory is the narrower, correct scope; the
        // main category is NOT also added.
        const scope = resolveCategoryScope({
            selectedCategories: ['Shirts'],
            allCategories: categories,
            subcategory: 'Shirts',
            initialCategory: 'Shirts',
            routeMainCategory: 'Mens',
        });
        expect(scope.subCategories).toEqual(['Shirts']);
        expect(scope.mainCategories).toEqual([]);
    });

    it('does not duplicate a main category already checked in the sidebar', () => {
        const scope = resolveCategoryScope({
            selectedCategories: ['Mens'],
            allCategories: categories,
            subcategory: 'All',
            initialCategory: 'All',
            routeMainCategory: 'Mens',
        });
        expect(scope.mainCategories).toEqual(['Mens']);
    });

    it('splits checked categories into main vs sub buckets', () => {
        const scope = resolveCategoryScope({
            selectedCategories: ['Womens', 'Denim'],
            allCategories: categories,
            subcategory: undefined,
            initialCategory: 'All',
            routeMainCategory: '',
        });
        expect(scope.mainCategories).toEqual(['Womens']);
        expect(scope.subCategories).toEqual(['Denim']);
    });

    it('is an empty scope on /shop (no route category, nothing checked)', () => {
        const scope = resolveCategoryScope({
            selectedCategories: [],
            allCategories: categories,
            subcategory: undefined,
            initialCategory: 'All',
            routeMainCategory: '',
        });
        expect(scope.mainCategories).toEqual([]);
        expect(scope.subCategories).toEqual([]);
    });
});
