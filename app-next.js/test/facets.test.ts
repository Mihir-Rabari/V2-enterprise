/**
 * Unit tests for lib/facets.ts — category-scoped facet derivation.
 *
 * Client requirement (2026-10-14): filter options on category pages must
 * come from the products in scope, not the global suggestions doc. Fixtures
 * below mirror the live seed shapes (2026-10-14) where that failed: the
 * Denim page's product (Indigo, 32/34, Selvedge Denim) vs the stale global
 * suggestions (color ["Ivory"], size ["S"], fabric ["Tencel"], length ["Midi"]).
 */
import { describe, it, expect } from 'vitest';
import { deriveFacets } from '../lib/facets';

const selvedgeDenim = {
    name: 'Selvedge Slim Fit Denim',
    fabric: 'Selvedge Denim',
    patternType: 'Solid',
    color: 'Indigo',
    sizes: ['32', '34'],
};

const fluidMidi = {
    name: 'Fluid Midi Dress',
    fabric: 'Tencel',
    length: 'Midi',
    color: 'Ivory',
    colors: ['Ivory', 'Sand'],
    sizes: ['M', 'S'],
    customAttributes: { care: 'Dry clean only' },
    variants: [
        { color: 'Sand', size: 'S' },
        { color: 'Ivory', size: 'M' },
    ],
};

describe('deriveFacets', () => {
    it('derives facets from the products in scope, not global suggestions', () => {
        const facets = deriveFacets([selvedgeDenim]);
        expect(facets.color).toEqual(['Indigo']);      // NOT the stale global ["Ivory"]
        expect(facets.size).toEqual(['32', '34']);     // NOT ["S"]
        expect(facets.fabric).toEqual(['Selvedge Denim']); // NOT ["Tencel"]
        expect(facets.patternType).toEqual(['Solid']);
    });

    it('returns empty entries for attributes no in-scope product carries', () => {
        const facets = deriveFacets([selvedgeDenim]);
        // Empty entry = "hide the Length section on the Denim page".
        expect(facets.length).toEqual([]);
        expect('custom_care' in facets).toBe(false);
    });

    it('collects colors/sizes from top-level fields and variants, deduped and sorted', () => {
        const facets = deriveFacets([fluidMidi]);
        expect(facets.color).toEqual(['Ivory', 'Sand']);
        expect(facets.size).toEqual(['M', 'S']);
        expect(facets.custom_care).toEqual(['Dry clean only']);
    });

    it('merges facets across the products of a scope', () => {
        const facets = deriveFacets([selvedgeDenim, fluidMidi]);
        expect(facets.color).toEqual(['Indigo', 'Ivory', 'Sand']);
        expect(facets.fabric).toEqual(['Selvedge Denim', 'Tencel']);
        expect(facets.length).toEqual(['Midi']);
        expect(facets.patternType).toEqual(['Solid']);
    });

    it('returns every attribute key for an empty scope', () => {
        const facets = deriveFacets([]);
        expect(facets.color).toEqual([]);
        expect(facets.size).toEqual([]);
        expect(facets.fabric).toEqual([]);
        expect(facets.length).toEqual([]);
    });

    it('ignores blank and non-string values', () => {
        const facets = deriveFacets([{ fabric: '   ', collar: undefined, color: null, sizes: [32, 'L'] }]);
        expect(facets.fabric).toEqual([]);
        expect(facets.collar).toEqual([]);
        expect(facets.color).toEqual([]);
        expect(facets.size).toEqual(['L']); // numeric sizes are skipped
    });
});
