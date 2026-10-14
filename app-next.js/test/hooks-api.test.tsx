/**
 * Unit tests for `hooks/useProducts.ts` (useProducts / useProduct) and
 * `hooks/useMyOrders.ts`.
 *
 * `lib/apiClient` (productsAPI / ordersAPI) is mocked with vi.mock — no
 * network. Pinned behavior (lib/README.md + PR #16 test notes):
 *   - useProducts: loading/error lifecycle; page 1 replaces, page > 1
 *     appends; loadingMore while an append is in flight; hasMore is
 *     `newProducts.length >= limit`; total from the response; the effect
 *     re-runs on JSON.stringify(params) — a new object with the same JSON
 *     does NOT refetch.
 *   - useProduct: single fetch by id, 'Product not found' on failure; no
 *     fetch (loading stays true) while id is undefined — verbatim source
 *     behavior.
 *   - useMyOrders: loading/error lifecycle with the `res.data.data ?? []`
 *     null-guard.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProducts, useProduct, type ApiProduct } from '../hooks/useProducts';
import { useMyOrders, type MyOrder } from '../hooks/useMyOrders';

vi.mock('../lib/apiClient', () => ({
    productsAPI: {
        getAll: vi.fn(),
        getById: vi.fn(),
    },
    ordersAPI: {
        getMyOrders: vi.fn(),
    },
}));

// Import AFTER the vi.mock declaration — vitest hoists vi.mock above imports.
import { productsAPI, ordersAPI } from '../lib/apiClient';

const getAllMock = productsAPI.getAll as unknown as Mock;
const getByIdMock = productsAPI.getById as unknown as Mock;
const getMyOrdersMock = ordersAPI.getMyOrders as unknown as Mock;

const apiProduct = (id: string): ApiProduct => ({
    id,
    name: `Product ${id}`,
    price: 100,
    photo: `/img/${id}.jpg`,
    status: 'Active',
    isFeatured: false,
    isTrending: false,
    isNewArrival: false,
    stock: 10,
    sizes: ['M'],
    colors: ['Black'],
    tags: [],
});

const pagePayload = (ids: string[], total: number, limit: number) => ({
    data: { data: { products: ids.map(apiProduct), total, limit } },
});

const myOrder = (id: string): MyOrder => ({
    id,
    total: 199,
    status: 'CONFIRMED',
    paymentMethod: 'CARD',
    createdAt: '2026-01-01T00:00:00.000Z',
    items: [{ productName: 'Test Shirt', quantity: 1, priceAtTime: 199, size: 'M', color: 'Black' }],
    address: 'Bhavnagar',
});

beforeEach(() => {
    vi.clearAllMocks();
});

describe('useProducts', () => {
    it('loading → success on page 1 (replaces, sets total, hasMore when a full page arrives)', async () => {
        getAllMock.mockResolvedValue(pagePayload(Array.from({ length: 20 }, (_, i) => `p${i}`), 40, 20));

        const { result } = renderHook((params: Record<string, unknown>) => useProducts(params), {
            initialProps: { page: 1 },
        });

        // In-flight state before the promise resolves.
        expect(result.current.loading).toBe(true);
        expect(result.current.loadingMore).toBe(false);
        expect(result.current.error).toBe('');

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.products).toHaveLength(20);
        expect(result.current.total).toBe(40);
        expect(result.current.hasMore).toBe(true); // 20 >= limit(20)
        expect(getAllMock).toHaveBeenCalledTimes(1);
        expect(getAllMock).toHaveBeenCalledWith({ page: 1 });
    });

    it('page 2 appends (loadingMore in flight, no full-page reset), short page → hasMore=false', async () => {
        const deferreds: Array<(value: unknown) => void> = [];
        getAllMock.mockImplementation(() => new Promise(resolve => { deferreds.push(resolve); }));

        const { result, rerender } = renderHook((params: Record<string, unknown>) => useProducts(params), {
            initialProps: { page: 1 },
        });

        // Page 1 resolves with a full page of 20.
        await act(async () => {
            deferreds[0](pagePayload(Array.from({ length: 20 }, (_, i) => `p1-${i}`), 40, 20));
        });
        expect(result.current.products).toHaveLength(20);
        expect(result.current.loading).toBe(false);

        // Move to page 2 — the effect re-runs (JSON.stringify(params) changed).
        rerender({ page: 2 });

        // Append in flight: loadingMore, NOT a full-page loading state.
        expect(result.current.loadingMore).toBe(true);
        expect(result.current.loading).toBe(false);
        expect(result.current.products).toHaveLength(20); // old page kept while appending

        // Page 2 resolves with only 5 items → append + hasMore=false.
        await act(async () => {
            deferreds[1](pagePayload(['p2-0', 'p2-1', 'p2-2', 'p2-3', 'p2-4'], 40, 20));
        });

        expect(result.current.products).toHaveLength(25);
        expect(result.current.products[0].id).toBe('p1-0');
        expect(result.current.products[24].id).toBe('p2-4'); // appended at the end
        expect(result.current.hasMore).toBe(false); // 5 < limit(20)
        expect(result.current.loadingMore).toBe(false);
        expect(result.current.loading).toBe(false);
        expect(getAllMock).toHaveBeenCalledTimes(2);
    });

    it('sets error="Failed to load products" on failure and clears loading', async () => {
        getAllMock.mockRejectedValue(new Error('network down'));

        const { result } = renderHook(() => useProducts({ page: 1 }));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.error).toBe('Failed to load products');
        expect(result.current.products).toEqual([]);
    });

    it('does NOT refetch when the params object is recreated with the same JSON (JSON.stringify dependency)', async () => {
        getAllMock.mockResolvedValue(pagePayload(['p0'], 1, 20));

        const { result, rerender } = renderHook(
            (params: Record<string, unknown>) => useProducts(params),
            { initialProps: { page: 1, filters: { color: 'red' } } },
        );
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(getAllMock).toHaveBeenCalledTimes(1);

        // Brand-new object identity, identical serialized shape.
        rerender({ page: 1, filters: { color: 'red' } });

        expect(getAllMock).toHaveBeenCalledTimes(1); // no refetch
        expect(result.current.loading).toBe(false);
    });
});

describe('useProduct', () => {
    it('loading → product resolved by id', async () => {
        getByIdMock.mockResolvedValue({ data: { data: apiProduct('p9') } });

        const { result } = renderHook(() => useProduct('p9'));

        expect(result.current.loading).toBe(true);
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.product).toEqual(apiProduct('p9'));
        expect(result.current.error).toBe('');
        expect(getByIdMock).toHaveBeenCalledWith('p9');
    });

    it('sets error="Product not found" when getById fails', async () => {
        getByIdMock.mockRejectedValue({ response: { status: 404 } });

        const { result } = renderHook(() => useProduct('missing'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.error).toBe('Product not found');
        expect(result.current.product).toBeNull();
    });

    it('does not fetch while id is undefined (loading stays true — verbatim source behavior)', () => {
        const { result } = renderHook(() => useProduct(undefined));

        expect(getByIdMock).not.toHaveBeenCalled();
        expect(result.current.product).toBeNull();
        expect(result.current.loading).toBe(true); // documented verbatim behavior: no early return resets loading
    });
});

describe('useMyOrders', () => {
    it('loading → orders resolved', async () => {
        const orders = [myOrder('o1'), myOrder('o2')];
        getMyOrdersMock.mockResolvedValue({ data: { data: orders } });

        const { result } = renderHook(() => useMyOrders());

        expect(result.current.loading).toBe(true);
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.orders).toEqual(orders);
        expect(result.current.error).toBe('');
        expect(getMyOrdersMock).toHaveBeenCalledTimes(1);
    });

    it('falls back to [] when the API responds with data: null (?? [] guard)', async () => {
        getMyOrdersMock.mockResolvedValue({ data: { data: null } });

        const { result } = renderHook(() => useMyOrders());
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.orders).toEqual([]);
        expect(result.current.error).toBe('');
    });

    it('sets error="Failed to load orders" on failure', async () => {
        getMyOrdersMock.mockRejectedValue(new Error('network down'));

        const { result } = renderHook(() => useMyOrders());
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.error).toBe('Failed to load orders');
        expect(result.current.orders).toEqual([]);
    });
});
