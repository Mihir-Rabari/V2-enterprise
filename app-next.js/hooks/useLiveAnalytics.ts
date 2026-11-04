'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { adminAPI } from '../lib/apiClient';
export type AnalyticsRange = '7d' | '30d' | '12m';

export interface LiveAnalytics {
    generatedAt: string;
    serverTime: string;
    requestId: string;
    timezone: string;
    period: { range: AnalyticsRange; from: string; to: string; comparisonFrom: string };
    stats: {
        totalProducts: number; totalOrders: number; totalCustomers: number; totalRevenue: number;
        newCustomers: number; unreadMessages: number; pendingOrders: number;
        revenue: number; previousRevenue: number; revenueGrowth: number | null;
        orders: number; paidOrders: number; averagePaidOrder: number | null;
        activeProducts: number; lowStockProducts: number; outOfStockProducts: number;
        unitsSold: number; cancelledOrders: number; refundedOrders: number; cancellationRate: number | null;
    };
    trend: { date: string; revenue: number; orders: number }[];
    monthlyRevenue: { month: string; revenue: number }[];
    customerPulse: { date: string; orders: number }[];
    categoryDistribution: { name: string; value: number }[];
    orderStatuses: { status: string; count: number }[];
    recentOrders: { id: string; orderId: string; amount: number; status: string; paymentStatus: string; date: string }[];
    aiToday: { day: string; messages: number; requests: number; estimatedCostUsd: number; searches: number; emptySearches: number; blockedMessages: number };
}

export const ANALYTICS_REFRESH_MS = 30_000;
export function useLiveAnalytics(selectedRange: AnalyticsRange = '30d') {
    const [data, setData] = useState<LiveAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [serverNow, setServerNow] = useState<number | null>(null);
    const clock = useRef<{ serverEpoch: number; receivedAt: number; snapshotAge: number } | null>(null);
    const request = useRef<AbortController | null>(null);
    const refresh = useCallback(async () => {
        request.current?.abort();
        const controller = new AbortController();
        request.current = controller;
        setLoading(true);
        // Do not display the previous snapshot as current while refreshing.
        setData(null);
        setServerNow(null);
        setError('');
        try {
            const requestId = crypto.randomUUID();
            const startedAt = performance.now();
            const res = await adminAPI.getStats(controller.signal, requestId, selectedRange);
            if (controller.signal.aborted) return;
            const value = res.data.data as LiveAnalytics;
            const receivedAt = performance.now();
            const serverEpoch = Date.parse(value.serverTime);
            // Monotonic elapsed time is independent of the device's wall clock.
            // Count the full round trip conservatively so slow responses expire sooner.
            const age = serverEpoch - Date.parse(value.generatedAt) + (receivedAt - startedAt);
            if (value.requestId !== requestId || value.period?.range !== selectedRange || !Number.isFinite(age) || age >= ANALYTICS_REFRESH_MS || age < 0 || !value.stats) {
                throw new Error('Analytics response is out of date.');
            }
            clock.current = { serverEpoch, receivedAt, snapshotAge: age };
            setServerNow(serverEpoch);
            setData(value);
        } catch {
            if (!controller.signal.aborted) setError('Current analytics could not be loaded. Refresh to try again.');
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    }, [selectedRange]);

    useEffect(() => {
        const anchor = clock.current;
        if (!data || !anchor) return;
        const ticker = window.setInterval(() => {
            setServerNow(anchor.serverEpoch + performance.now() - anchor.receivedAt);
        }, 1000);
        // Refresh when the server snapshot expires, rather than using client calendar time.
        const expiry = window.setTimeout(() => { void refresh(); },
            Math.max(0, ANALYTICS_REFRESH_MS - anchor.snapshotAge - (performance.now() - anchor.receivedAt)));
        return () => { clearInterval(ticker); clearTimeout(expiry); };
    }, [data, refresh]);

    useEffect(() => {
        if (!error || loading) return;
        const retry = window.setTimeout(() => {
            if (document.visibilityState === 'visible') void refresh();
        }, ANALYTICS_REFRESH_MS);
        return () => clearTimeout(retry);
    }, [error, loading, refresh]);

    useEffect(() => {
        void refresh();
        const onVisible = () => {
            if (document.visibilityState === 'visible') void refresh();
            else {
                request.current?.abort();
                setData(null);
                setServerNow(null);
            }
        };
        const onOnline = () => { if (document.visibilityState === 'visible') void refresh(); };
        const onOffline = () => {
            request.current?.abort();
            setData(null);
            setServerNow(null);
            setLoading(false);
            setError('You are offline. Reconnect to load current analytics.');
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onOnline);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            request.current?.abort();
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onOnline);
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, [refresh]);
    return { data: data?.period.range === selectedRange ? data : null, loading, error, refresh, serverNow };
}
