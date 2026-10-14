/**
 * Unit tests for `context/CartContext.tsx` (CartProvider / useCart).
 *
 * Regression tests for the public contract documented in `lib/README.md` and
 * PR #16's test notes. No network — CartContext doesn't touch apiClient; the
 * persistence lifecycle (v2_cart localStorage key) is exercised for real
 * against the jsdom localStorage.
 *
 * Behavior pinned here (see also the "preserved source quirk" tests at the
 * bottom, which document intentional defects inherited verbatim from the
 * Vite source):
 *   - starts empty on the first render, hydrates from `v2_cart` in a mount
 *     effect (no hydration-mismatch semantics — server/first client render
 *     always agree on `[]`), and never clobbers the saved cart with `[]`
 *   - addToCart merges by (id, selectedSize, selectedColor) and persists the
 *     exact item shape `{ ...product, id: String(_id || id), quantity,
 *     selectedSize, selectedColor }`
 *   - updateQuantity applies a delta but never drops below 1
 *   - removeFromCart removes only the matching (id,size,color) line
 *   - clearCart empties state + storage
 *   - cartCount = Σ quantity, cartTotal = Σ price × quantity
 *   - malformed `v2_cart` ("{oops") → empty cart + console.warn, no crash
 *   - a pre-hydration mutation is not clobbered by the stale stored read
 */
import React, { useEffect } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from '../context/CartContext';
import type { CartItem, Product } from '../types';

const CART_KEY = 'v2_cart';

/** Valid full `Product` fixture (all required fields of types.ts). */
const product = (overrides: Partial<Product> = {}): Product => ({
    id: 'prod-1',
    _id: '507f1f77bcf86cd799439011',
    photo: '/img/prod-1.jpg',
    name: 'Test Shirt',
    mainCategory: 'Shirts',
    subCategory: 'Casual',
    styleCode: 'TS-01',
    color: 'Black',
    size: 'M',
    quantity: 50,
    price: 100,
    description: 'A test shirt',
    materialCare: 'Machine wash cold',
    status: 'Active',
    ...overrides,
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CartProvider>{children}</CartProvider>
);

/** A consumer that records every rendered `cart` snapshot. */
function CartProbe({ snapshots }: { snapshots: CartItem[][] }) {
    const { cart } = useCart();
    snapshots.push(cart);
    return null;
}

describe('CartProvider — hydration lifecycle', () => {
    it('starts empty on the first render and hydrates from v2_cart after mount', () => {
        const stored: CartItem[] = [
            { ...product(), id: '507f1f77bcf86cd799439011', quantity: 2, selectedSize: 'M', selectedColor: 'Black' },
        ];
        localStorage.setItem(CART_KEY, JSON.stringify(stored));

        const snapshots: CartItem[][] = [];
        render(
            <CartProvider>
                <CartProbe snapshots={snapshots} />
            </CartProvider>,
        );

        // First render (what the server and the first client render see) is
        // always the empty cart — that is the hydration-safety contract.
        expect(snapshots[0]).toEqual([]);
        // The stored cart is applied by the mount effect.
        expect(snapshots[snapshots.length - 1]).toEqual(stored);
        // The stored cart was never clobbered with "[]" at any point: after
        // hydration the persist effect writes back the same items.
        expect(JSON.parse(localStorage.getItem(CART_KEY)!)).toEqual(stored);
    });

    it('renders an empty cart when nothing is stored', () => {
        const { result } = renderHook(() => useCart(), { wrapper });
        expect(result.current.cart).toEqual([]);
        expect(result.current.cartCount).toBe(0);
        expect(result.current.cartTotal).toBe(0);
        // Hydration flipped, so the empty state persists to storage.
        expect(localStorage.getItem(CART_KEY)).toBe('[]');
    });

    it('treats malformed v2_cart ("{oops") as an empty cart, warns, and does not crash', () => {
        localStorage.setItem(CART_KEY, '{oops');
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const { result } = renderHook(() => useCart(), { wrapper });

        expect(result.current.cart).toEqual([]);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledWith('[Cart] Failed to restore cart from localStorage:', expect.any(Error));
        // The persist effect repairs the corrupted value to the empty cart.
        expect(localStorage.getItem(CART_KEY)).toBe('[]');
        warn.mockRestore();
    });

    it('treats the JSON literal "null" as an empty cart without crashing (silent Array.isArray fallback)', () => {
        // Note: JSON.parse("null") succeeds, so unlike "{oops" this takes the
        // Array.isArray guard path — no console.warn is expected. The
        // observable contract (empty cart, no crash, repaired storage) is
        // identical.
        localStorage.setItem(CART_KEY, 'null');
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const { result } = renderHook(() => useCart(), { wrapper });

        expect(result.current.cart).toEqual([]);
        expect(warn).not.toHaveBeenCalled();
        expect(localStorage.getItem(CART_KEY)).toBe('[]');
        warn.mockRestore();
    });

    it('treats a non-array JSON payload ({"a":1}) as an empty cart without crashing', () => {
        localStorage.setItem(CART_KEY, '{"a":1}');
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const { result } = renderHook(() => useCart(), { wrapper });

        expect(result.current.cart).toEqual([]);
        expect(localStorage.getItem(CART_KEY)).toBe('[]');
        warn.mockRestore();
    });
});

describe('CartProvider — pre-hydration mutation guard', () => {
    it('a mutation that runs before the hydration effect is not clobbered by the stale stored read', () => {
        const staleItem: CartItem = {
            ...product({ _id: 'stale0000000000000000000000', name: 'Stale Shirt', styleCode: 'TS-STALE' }),
            id: 'stale0000000000000000000000',
            quantity: 9,
            selectedSize: 'XL',
            selectedColor: 'Red',
        };
        localStorage.setItem(CART_KEY, JSON.stringify([staleItem]));

        const snapshots: CartItem[][] = [];
        /**
         * React runs child effects before parent effects, so this consumer
         * mutates the cart before CartProvider's own hydration effect gets a
         * chance to read the (stale) stored value. The mutateCart wrapper
         * flags the write and the stored read is skipped — the fresh mutation
         * must win.
         */
        function EarlyAdder() {
            const { addToCart, cart } = useCart();
            useEffect(() => {
                addToCart(
                    product({ _id: 'fresh0000000000000000000000', name: 'Fresh Shirt', styleCode: 'TS-FRESH' }),
                    1,
                    'S',
                    'Blue',
                );
                // eslint-disable-next-line react-hooks/exhaustive-deps
            }, []);
            snapshots.push(cart);
            return null;
        }

        render(
            <CartProvider>
                <EarlyAdder />
            </CartProvider>,
        );

        const finalCart = snapshots[snapshots.length - 1];
        // The fresh mutation is in state…
        expect(finalCart).toHaveLength(1);
        expect(finalCart[0].name).toBe('Fresh Shirt');
        // …and the stale stored item never entered state…
        expect(finalCart.some(item => item.name === 'Stale Shirt')).toBe(false);
        // …and the stale stored value was replaced by the fresh mutation.
        const persisted = JSON.parse(localStorage.getItem(CART_KEY)!) as CartItem[];
        expect(persisted).toHaveLength(1);
        expect(persisted[0].name).toBe('Fresh Shirt');
    });
});

describe('CartProvider — addToCart', () => {
    it('appends a new item with the exact persisted shape (id = String(_id || id))', () => {
        const p = product();
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(p, 2, 'M', 'Black');
        });

        const expectedItem = {
            ...p,
            id: '507f1f77bcf86cd799439011', // String(product._id || product.id)
            quantity: 2,
            selectedSize: 'M',
            selectedColor: 'Black',
        };
        expect(result.current.cart).toEqual([expectedItem]);
        expect(JSON.parse(localStorage.getItem(CART_KEY)!)).toEqual([expectedItem]);
    });

    it('falls back to String(product.id) when the product has no _id', () => {
        const p = product({ id: 42, _id: undefined }); // numeric id, no _id
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(p, 1, 'M', 'Black');
        });

        expect(result.current.cart[0].id).toBe('42');
        expect(JSON.parse(localStorage.getItem(CART_KEY)!)[0].id).toBe('42');
    });

    it('merges the same (id, size, color) combo by incrementing quantity and keeps a single line', () => {
        const p = product();
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(p, 1, 'M', 'Black');
        });
        act(() => {
            result.current.addToCart(p, 2, 'M', 'Black'); // same combo → merge
        });

        expect(result.current.cart).toHaveLength(1);
        expect(result.current.cart[0].quantity).toBe(3);
        expect(JSON.parse(localStorage.getItem(CART_KEY)!)).toHaveLength(1);

        // Toast contract (PR #16: "Increased … quantity in bag." on merge).
        expect(result.current.toast).toEqual({
            message: 'Increased Test Shirt quantity in bag.',
            isVisible: true,
            type: 'success',
        });
    });

    it('keeps separate lines for different sizes/colors of the same product', () => {
        const p = product();
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(p, 1, 'M', 'Black');
        });
        act(() => {
            result.current.addToCart(p, 1, 'L', 'Black'); // different size → new line
        });
        act(() => {
            result.current.addToCart(p, 1, 'L', 'White'); // different color → new line
        });

        expect(result.current.cart).toHaveLength(3);
        expect(result.current.cart.map(item => `${item.selectedSize}/${item.selectedColor}`))
            .toEqual(['M/Black', 'L/Black', 'L/White']);
        // "Added … to your collection." toast for the first (new) line.
        expect(result.current.toast.message).toBe('Added Test Shirt to your collection.');
    });
});

describe('CartProvider — updateQuantity / removeFromCart / clearCart', () => {
    it('updateQuantity applies positive deltas', () => {
        const p = product();
        const { result } = renderHook(() => useCart(), { wrapper });
        const id = '507f1f77bcf86cd799439011';

        act(() => {
            result.current.addToCart(p, 2, 'M', 'Black');
        });
        act(() => {
            result.current.updateQuantity(id, 1, 'M', 'Black');
        });

        expect(result.current.cart[0].quantity).toBe(3);
        expect(JSON.parse(localStorage.getItem(CART_KEY)!)[0].quantity).toBe(3);
    });

    it('updateQuantity never drops a line below 1 (a delta to ≤ 0 is a no-op)', () => {
        const p = product();
        const { result } = renderHook(() => useCart(), { wrapper });
        const id = '507f1f77bcf86cd799439011';

        act(() => {
            result.current.addToCart(p, 2, 'M', 'Black');
        });
        act(() => {
            result.current.updateQuantity(id, -1, 'M', 'Black'); // 2 → 1
        });
        expect(result.current.cart[0].quantity).toBe(1);

        act(() => {
            result.current.updateQuantity(id, -1, 'M', 'Black'); // would be 0 → no-op
        });
        expect(result.current.cart[0].quantity).toBe(1);

        act(() => {
            result.current.updateQuantity(id, -5, 'M', 'Black'); // would be -4 → no-op
        });
        expect(result.current.cart[0].quantity).toBe(1);

        // The line is still there (updateQuantity never removes).
        expect(result.current.cart).toHaveLength(1);
        expect(JSON.parse(localStorage.getItem(CART_KEY)!)[0].quantity).toBe(1);
    });

    it('updateQuantity only touches the matching (id,size,color) combo', () => {
        const p = product();
        const { result } = renderHook(() => useCart(), { wrapper });
        const id = '507f1f77bcf86cd799439011';

        act(() => {
            result.current.addToCart(p, 1, 'M', 'Black');
        });
        act(() => {
            result.current.addToCart(p, 1, 'L', 'Black');
        });
        act(() => {
            result.current.updateQuantity(id, 1, 'L', 'Black');
        });

        const byLine = result.current.cart.map(item => `${item.selectedSize}:${item.quantity}`);
        expect(byLine).toEqual(['M:1', 'L:2']);
    });

    it('removeFromCart removes only the matching (id,size,color) line', () => {
        const p = product();
        const other = product({ _id: '507f1f77bcf86cd799439099', id: 'prod-9', name: 'Other Shirt', styleCode: 'TS-09' });
        const { result } = renderHook(() => useCart(), { wrapper });
        const id = '507f1f77bcf86cd799439011';

        act(() => {
            result.current.addToCart(p, 1, 'M', 'Black');
        });
        act(() => {
            result.current.addToCart(p, 1, 'L', 'Black');
        });
        act(() => {
            result.current.addToCart(other, 1, 'M', 'Black');
        });
        expect(result.current.cart).toHaveLength(3);

        act(() => {
            result.current.removeFromCart(id, 'M', 'Black');
        });

        expect(result.current.cart).toHaveLength(2);
        expect(result.current.cart.map(item => `${item.name}/${item.selectedSize}`))
            .toEqual(['Test Shirt/L', 'Other Shirt/M']);
        expect(JSON.parse(localStorage.getItem(CART_KEY)!)).toHaveLength(2);
    });

    it('clearCart empties both state and storage', () => {
        const { result } = renderHook(() => useCart(), { wrapper });
        act(() => {
            result.current.addToCart(product(), 1, 'M', 'Black');
        });
        expect(result.current.cart).toHaveLength(1);

        act(() => {
            result.current.clearCart();
        });

        expect(result.current.cart).toEqual([]);
        expect(localStorage.getItem(CART_KEY)).toBe('[]');
    });
});

describe('CartProvider — totals', () => {
    it('cartCount = Σ quantity and cartTotal = Σ price × quantity', () => {
        const a = product(); // price 100
        const b = product({ _id: '507f1f77bcf86cd799439022', id: 'prod-2', price: 50, name: 'Cheap Shirt', styleCode: 'TS-02' });
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(a, 2, 'M', 'Black');
        });
        act(() => {
            result.current.addToCart(b, 3, 'L', 'White');
        });

        expect(result.current.cartCount).toBe(5); // 2 + 3
        expect(result.current.cartTotal).toBe(350); // 100×2 + 50×3
    });
});

describe('CartProvider — toast API', () => {
    it('showToast sets the toast state and hideToast hides it without clearing the message', () => {
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.showToast('Saved for later', 'error');
        });
        expect(result.current.toast).toEqual({ message: 'Saved for later', isVisible: true, type: 'error' });

        act(() => {
            result.current.hideToast();
        });
        expect(result.current.toast).toEqual({ message: 'Saved for later', isVisible: false, type: 'error' });
    });
});

describe('CartProvider — preserved source quirks (documented, not fixed)', () => {
    it('PRESERVED QUIRK (PR #16 defect #4): removal/update use strict === so a numeric productId never matches the stored string id', () => {
        const p = product({ id: 42, _id: undefined, name: 'Numeric Id Shirt' });
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(p, 1, 'M', 'Black');
        });
        expect(result.current.cart[0].id).toBe('42'); // stored as string

        // addToCart coerces ids via String(...), but removeFromCart compares
        // with strict equality — a numeric id misses the line. Kept verbatim
        // from the Vite source; flagged in PR #16 for a follow-up only if a
        // page ever removes by numeric id.
        act(() => {
            result.current.removeFromCart(42, 'M', 'Black');
        });
        expect(result.current.cart).toHaveLength(1);

        act(() => {
            result.current.updateQuantity(42, 1, 'M', 'Black');
        });
        expect(result.current.cart[0].quantity).toBe(1); // unchanged

        // Passing the same id as a string does match.
        act(() => {
            result.current.removeFromCart('42', 'M', 'Black');
        });
        expect(result.current.cart).toHaveLength(0);
    });

    it('PRESERVED QUIRK (PR #16 defect #1): the sanitize branch is dead code — a stored numeric id is not rewritten after hydration', () => {
        // cart.map(...) never changes the array length, so
        // `sanitized.length !== cart.length` is always false and the
        // sanitize setCart never runs. A numeric id coming from storage
        // therefore survives hydration untouched.
        const stored: CartItem[] = [{ ...product({ id: 42, _id: undefined }), id: 42, quantity: 1, selectedSize: 'M' }];
        localStorage.setItem(CART_KEY, JSON.stringify(stored));
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});

        const { result } = renderHook(() => useCart(), { wrapper });

        expect(result.current.cart[0].id).toBe(42);
        expect(typeof result.current.cart[0].id).toBe('number');
        expect(log).not.toHaveBeenCalledWith('[Cart] Sanitized cart, removed invalid/numeric IDs');
        // …and it is persisted back as-is.
        expect((JSON.parse(localStorage.getItem(CART_KEY)!) as CartItem[])[0].id).toBe(42);
        log.mockRestore();
    });
});

describe('useCart outside CartProvider', () => {
    it('throws a descriptive error', () => {
        const err = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => renderHook(() => useCart())).toThrow('useCart must be used within a CartProvider');
        err.mockRestore();
    });
});
