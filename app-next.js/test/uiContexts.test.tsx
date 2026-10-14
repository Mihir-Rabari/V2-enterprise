/**
 * Unit tests for `context/QuickViewContext.tsx` and
 * `context/InitialLoadContext.tsx`.
 *
 * Both are pure in-memory state (no persistence — see lib/README.md).
 * Pinned behavior (PR #16 test notes):
 *   - QuickView: selectedProductId starts null; openQuickView(id) sets it
 *     (string or number pass through unchanged); closeQuickView() nulls it;
 *     useQuickView outside the provider throws.
 *   - InitialLoad: isInitialLoad starts true (splash screen); the consumer
 *     flips it via setIsInitialLoad(false); useInitialLoad outside the
 *     provider throws.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QuickViewProvider, useQuickView } from '../context/QuickViewContext';
import { InitialLoadProvider, useInitialLoad } from '../context/InitialLoadContext';

describe('QuickViewContext', () => {
    it('starts with no selected product, then opens/closes quick view', () => {
        const { result } = renderHook(() => useQuickView(), { wrapper: QuickViewProvider });

        expect(result.current.selectedProductId).toBeNull();

        act(() => {
            result.current.openQuickView('abc123');
        });
        expect(result.current.selectedProductId).toBe('abc123');

        // Numbers pass through unchanged (no coercion).
        act(() => {
            result.current.openQuickView(42);
        });
        expect(result.current.selectedProductId).toBe(42);

        act(() => {
            result.current.closeQuickView();
        });
        expect(result.current.selectedProductId).toBeNull();
    });

    it('throws when useQuickView is used outside QuickViewProvider', () => {
        const err = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => renderHook(() => useQuickView())).toThrow(
            'useQuickView must be used within QuickViewProvider',
        );
        err.mockRestore();
    });
});

describe('InitialLoadContext', () => {
    it('starts with isInitialLoad=true (splash screen) and flips false via the consumer', () => {
        const { result } = renderHook(() => useInitialLoad(), { wrapper: InitialLoadProvider });

        expect(result.current.isInitialLoad).toBe(true);

        act(() => {
            result.current.setIsInitialLoad(false);
        });
        expect(result.current.isInitialLoad).toBe(false);

        act(() => {
            result.current.setIsInitialLoad(true);
        });
        expect(result.current.isInitialLoad).toBe(true);
    });

    it('throws when useInitialLoad is used outside InitialLoadProvider', () => {
        const err = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => renderHook(() => useInitialLoad())).toThrow(
            'useInitialLoad must be used within an InitialLoadProvider',
        );
        err.mockRestore();
    });
});
