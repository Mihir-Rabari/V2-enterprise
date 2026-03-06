import { useState, useEffect } from 'react';
import { ordersAPI } from '../lib/apiClient';

export interface MyOrder {
    id: string;
    total: number;
    status: string;
    paymentMethod: string;
    createdAt: string;
    items: {
        productName: string;
        quantity: number;
        priceAtTime: number;
        size?: string;
        color?: string;
        productPhoto?: string;
    }[];
    address?: string;
}

export function useMyOrders() {
    const [orders, setOrders] = useState<MyOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        ordersAPI.getMyOrders()
            .then(res => setOrders(res.data.data ?? []))
            .catch(() => setError('Failed to load orders'))
            .finally(() => setLoading(false));
    }, []);

    return { orders, loading, error };
}
