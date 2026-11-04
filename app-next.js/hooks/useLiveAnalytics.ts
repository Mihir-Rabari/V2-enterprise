'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { adminAPI } from '../lib/apiClient';

export interface LiveAnalytics {
    generatedAt: string;
    timezone: string;
    period: { from: string; to: string; comparisonFrom: string };
    stats: {
        totalProducts: number; totalOrders: number; totalCustomers: number; totalRevenue: number;
        newCustomers: number; unreadMessages: number; pendingOrders: number;
        revenue30d: number; previousRevenue30d: number; revenueGrowth: number | null;
        orders30d: number; paidOrders30d: number; averagePaidOrder30d: number | null;
        activeProducts: number; lowStockProducts: number; outOfStockProducts: number;
    };
    monthlyRevenue: { month: string; revenue: number }[];
    customerPulse: { date: string; orders: number }[];
    categoryDistribution: { name: string; value: number }[];
    orderStatuses: { status: string; count: number }[];
    recentOrders: { id: string; orderId: string; amount: number; status: string; paymentStatus: string; date: string }[];
    aiToday: { day: string; messages: number; requests: number; estimatedCostUsd: number; searches: number; emptySearches: number; blockedMessages: number };
}

export const ANALYTICS_REFRESH_MS = 30_000;
export function useLiveAnalytics() {
    const [data, setData] = useState<LiveAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const request = useRef<AbortController | null>(null);
    const refresh = useCallback(async () => {
        request.current?.abort();
        const controller = new AbortController();
        request.current = controller;
        setLoading(true);
        // Do not display the previous snapshot as current while refreshing.
        setData(null);
        setError('');
        try {
            const res = await adminAPI.getStats(controller.signal);
            if (controller.signal.aborted) return;
            const value = res.data.data as LiveAnalytics;
            const age = Date.now() - Date.parse(value.generatedAt);
            if (!Number.isFinite(age) || age > ANALYTICS_REFRESH_MS || age < -ANALYTICS_REFRESH_MS || !value.stats) {
                throw new Error('Analytics response is out of date.');
            }
            setData(value);
        } catch {
            if (!controller.signal.aborted) setError('Current analytics could not be loaded. Refresh to try again.');
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
        const onVisible = () => {
            if (document.visibilityState === 'visible') void refresh();
            else {
                request.current?.abort();
                setData(null);
            }
        };
        const timer = window.setInterval(() => {
            if (document.visibilityState === 'visible') void refresh();
        }, ANALYTICS_REFRESH_MS);
        const onOnline = () => { if (document.visibilityState === 'visible') void refresh(); };
        const onOffline = () => {
            request.current?.abort();
            setData(null);
            setLoading(false);
            setError('You are offline. Reconnect to load current analytics.');
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onOnline);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            request.current?.abort();
            clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onOnline);
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, [refresh]);
    return { data, loading, error, refresh };
}
