'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { CartItem, Product } from '../types';

interface ToastState {
    message: string;
    isVisible: boolean;
    type: 'success' | 'error';
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (product: Product, quantity?: number, size?: string, color?: string) => void;
    removeFromCart: (productId: string | number, size?: string, color?: string) => void;
    updateQuantity: (productId: string | number, delta: number, size?: string, color?: string) => void;
    clearCart: () => void;
    cartCount: number;
    cartTotal: number;
    toast: ToastState;
    showToast: (message: string, type?: 'success' | 'error') => void;
    hideToast: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'v2_cart';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // ── Hydration-safe persistence ─────────────────────────────────────────────
    // The Vite version seeded state from localStorage inside the useState
    // initializer. That is unsafe under Next.js SSR/hydration: the server
    // render (no localStorage → empty cart) would disagree with the first
    // client render (saved cart), throwing a hydration mismatch. Instead:
    //   1. Always start with an empty cart, so server render and the first
    //      client render agree.
    //   2. Hydrate from localStorage in a mount effect (never during render).
    //   3. Only persist to localStorage once hydration has completed, so the
    //      initial empty state can never clobber the saved cart.
    // Data model, item shape, merge/quantity math, and totals are preserved
    // exactly from the Vite source.
    const [cart, setCart] = useState<CartItem[]>([]);
    const [hydrated, setHydrated] = useState(false);

    // Set when a cart mutation runs before hydration completed (only possible
    // from a child mount effect — React runs child effects before this
    // provider's own effects). In that case the fresh mutation wins and the
    // stale stored value is NOT read over it. The mutation also persists
    // normally once `hydrated` flips.
    const cartMutatedBeforeHydration = useRef(false);

    // All cart mutations go through this wrapper (identical functional-update
    // semantics to the original setCart calls).
    const mutateCart = (updater: (prev: CartItem[]) => CartItem[]) => {
        cartMutatedBeforeHydration.current = true;
        setCart(updater);
    };

    useEffect(() => {
        if (cartMutatedBeforeHydration.current) {
            setHydrated(true);
            return;
        }
        try {
            const savedCart = localStorage.getItem(CART_STORAGE_KEY);
            if (savedCart) {
                const parsed = JSON.parse(savedCart);
                // Defensive: malformed storage (e.g. "null" or a non-array)
                // falls back to an empty cart instead of crashing the tree.
                if (Array.isArray(parsed)) setCart(parsed);
            }
        } catch (err) {
            console.warn('[Cart] Failed to restore cart from localStorage:', err);
        }
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;

        // [Preserved verbatim from the Vite source] Sanitize cart: Ensure all
        // items use string IDs (ObjectIds) and remove numeric ones if they
        // can't be resolved. This is important after reseeding the database.
        //
        // NOTE (source defect, preserved intentionally): this branch is dead
        // code in the original — `Array.prototype.map` never changes array
        // length, so `sanitized.length !== cart.length` is always false and
        // `setCart(sanitized)` never runs. Behavior kept as-is to avoid any
        // semantic drift; see PR notes.
        const sanitized = cart.map(item => ({
            ...item,
            id: String(item._id || item.id) // Ensure ID is a string
        }));

        if (sanitized.length !== cart.length) {
            console.log('[Cart] Sanitized cart, removed invalid/numeric IDs');
            setCart(sanitized);
        }

        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    }, [cart, hydrated]);

    const [toast, setToast] = useState<ToastState>({
        message: '', isVisible: false, type: 'success'
    });

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, isVisible: true, type });
    };

    const hideToast = () => {
        setToast(prev => ({ ...prev, isVisible: false }));
    };

    const addToCart = (product: Product, quantity: number = 1, size?: string, color?: string) => {
        const productId = String(product._id || product.id);

        const alreadyInCart = cart.find(item =>
            String(item.id || item._id) === productId &&
            item.selectedSize === size &&
            item.selectedColor === color
        );

        if (alreadyInCart) {
            showToast(`Increased ${product.name} quantity in bag.`);
        } else {
            showToast(`Added ${product.name} to your collection.`);
        }

        mutateCart(prev => {
            const existingItem = prev.find(item =>
                String(item.id || item._id) === productId &&
                item.selectedSize === size &&
                item.selectedColor === color
            );

            if (existingItem) {
                return prev.map(item =>
                    (String(item.id || item._id) === productId && item.selectedSize === size && item.selectedColor === color)
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }

            return [...prev, { ...product, id: productId, quantity, selectedSize: size, selectedColor: color }];
        });
    };

    const removeFromCart = (productId: string | number, size?: string, color?: string) => {
        mutateCart(prev => prev.filter(item =>
            !(item.id === productId && item.selectedSize === size && item.selectedColor === color)
        ));
    };

    const updateQuantity = (productId: string | number, delta: number, size?: string, color?: string) => {
        mutateCart(prev => prev.map(item => {
            if (item.id === productId && item.selectedSize === size && item.selectedColor === color) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : item;
            }
            return item;
        }));
    };

    const clearCart = () => mutateCart(() => []);

    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, cartTotal, toast, showToast, hideToast }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
