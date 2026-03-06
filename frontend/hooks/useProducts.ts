import { useState, useEffect } from 'react';
import { productsAPI } from '../lib/apiClient';

export interface ApiProduct {
    id: string | number;
    name: string;
    price: number;
    originalPrice?: number;
    photo: string;
    photos?: string[];
    description?: string;
    status: string;
    isFeatured: boolean;
    isTrending: boolean;
    isNewArrival: boolean;
    stock: number;
    sizes: string[];
    colors: string[];
    color?: string;
    styleCode?: string;
    tags: string[];
    category?: { id: string | number; name: string; slug: string; parent?: { id: string | number; name: string; slug: string } };
    reviews?: { rating: number; reviewText: string; user: { name: string }; createdAt: string }[];
    siblings?: { id: string; name: string; color: string; photo: string; price: number }[];
    // Legacy compat
    mainCategory?: string;
    subCategory?: string;
    photo2?: string;
}

export function useProducts(params?: Record<string, string | number | boolean>) {
    const [products, setProducts] = useState<ApiProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        productsAPI.getAll(params)
            .then(res => setProducts(res.data.data?.products ?? []))
            .catch(() => setError('Failed to load products'))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(params)]);

    return { products, loading, error };
}

export function useProduct(id: string | number | undefined) {
    const [product, setProduct] = useState<ApiProduct | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        productsAPI.getById(id)
            .then(res => setProduct(res.data.data))
            .catch(() => setError('Product not found'))
            .finally(() => setLoading(false));
    }, [id]);

    return { product, loading, error };
}
