import React, { createContext, useContext, useState, useEffect } from 'react';
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

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cart, setCart] = useState<CartItem[]>(() => {
        const savedCart = localStorage.getItem('v2_cart');
        return savedCart ? JSON.parse(savedCart) : [];
    });

    const [toast, setToast] = useState<ToastState>({
        message: '',
        isVisible: false,
        type: 'success'
    });

    useEffect(() => {
        // Sanitize cart: Ensure all items use string IDs (ObjectIds) and remove numeric ones if they can't be resolved
        // This is important after reseeding the database
        const sanitized = cart.filter(item => {
            const idStr = String(item.id || item._id || '');
            return idStr.length > 10; // Simple check for ObjectId length vs small numeric IDs
        }).map(item => ({
            ...item,
            id: String(item._id || item.id) // Ensure ID is a string
        }));

        if (sanitized.length !== cart.length) {
            console.log('[Cart] Sanitized cart, removed invalid/numeric IDs');
            setCart(sanitized);
        }

        localStorage.setItem('v2_cart', JSON.stringify(cart));
    }, [cart]);

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

        setCart(prev => {
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
        setCart(prev => prev.filter(item =>
            !(item.id === productId && item.selectedSize === size && item.selectedColor === color)
        ));
    };

    const updateQuantity = (productId: string | number, delta: number, size?: string, color?: string) => {
        setCart(prev => prev.map(item => {
            if (item.id === productId && item.selectedSize === size && item.selectedColor === color) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : item;
            }
            return item;
        }));
    };

    const clearCart = () => setCart([]);

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
