'use client';

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
    fabric?: string;
    patternType?: string;
    collar?: string;
    sleeve?: string;
    neck?: string;
    pocket?: string;
    length?: string;
    chest?: string;
    waist?: string;
    shoulder?: string;
    sleeveLength?: string;
    customAttributes?: Record<string, string>;
    materialCare?: string;
    variants?: any[];
}

export function useProducts(params?: Record<string, any>) {
    const [products, setProducts] = useState<ApiProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [hasMore, setHasMore] = useState(true);
    const [total, setTotal] = useState(0);

    const page = params?.page || 1;

    useEffect(() => {
        if (page === 1) {
            setLoading(true);
            // Reset products when starting a new filtered search
            // setProducts([]); // Optional: clear immediately for UI feedback
        } else {
            setLoadingMore(true);
        }

        productsAPI.getAll(params)
            .then(res => {
                const data = res.data.data;
                const newProducts = data?.products ?? [];
                const totalCount = data?.total ?? 0;
                const limitCount = data?.limit ?? 20;

                if (page === 1) {
                    setProducts(newProducts);
                } else {
                    setProducts(prev => [...prev, ...newProducts]);
                }

                setTotal(totalCount);
                // Simple hasMore logic: if we got less than the limit, there's no more
                setHasMore(newProducts.length >= limitCount);
            })
            .catch(() => setError('Failed to load products'))
            .finally(() => {
                setLoading(false);
                setLoadingMore(false);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(params)]);

    return { products, loading, loadingMore, error, hasMore, total };
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
