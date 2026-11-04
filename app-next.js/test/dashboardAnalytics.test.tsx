import React from 'react';
import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DashboardPage from '../components/admin/DashboardPage';
import { useLiveAnalytics } from '../hooks/useLiveAnalytics';
vi.mock('../hooks/useLiveAnalytics', () => ({ useLiveAnalytics: vi.fn() }));

it('shows genuine empty states and no fabricated growth when the store has no transactions', () => {
    const generatedAt = '2026-11-04T10:00:00Z';
    vi.mocked(useLiveAnalytics).mockReturnValue({ loading: false, error: '', refresh: vi.fn(), serverNow: Date.parse(generatedAt), data: {
        generatedAt, serverTime: generatedAt, requestId: 'test', timezone: 'Asia/Kolkata', period: { range: '30d', from: generatedAt, to: generatedAt, comparisonFrom: generatedAt },
        stats: { totalProducts: 0, totalOrders: 0, totalCustomers: 0, totalRevenue: 0, newCustomers: 0, unreadMessages: 0,
            pendingOrders: 0, revenue: 0, previousRevenue: 0, revenueGrowth: null, orders: 0, paidOrders: 0,
            averagePaidOrder: null, activeProducts: 0, lowStockProducts: 0, outOfStockProducts: 0,
            unitsSold: 0, cancelledOrders: 0, refundedOrders: 0, cancellationRate: null },
        trend: [], monthlyRevenue: [], customerPulse: [], categoryDistribution: [], orderStatuses: [], recentOrders: [],
        aiToday: { day: '2026-11-04', messages: 0, requests: 0, estimatedCostUsd: 0, searches: 0, emptySearches: 0, blockedMessages: 0 },
    } });
    render(<DashboardPage />);
    expect(screen.getByText('No paid revenue in the comparison period')).toBeInTheDocument();
    expect(screen.getByText('No paid revenue recorded in this period.')).toBeInTheDocument();
    expect(screen.getByText('No orders placed in this period.')).toBeInTheDocument();
    expect(screen.getByText('No active product variants.')).toBeInTheDocument();
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh now' })).toBeEnabled();
    expect(screen.getByText('Units sold')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '30 Days' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: '7 Days' }));
    expect(useLiveAnalytics).toHaveBeenLastCalledWith('7d');
    expect(screen.getByRole('button', { name: '7 Days' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: '12 Months' }));
    expect(useLiveAnalytics).toHaveBeenLastCalledWith('12m');
});

it('shows the fetch error instead of fallback zero metrics', () => {
    vi.mocked(useLiveAnalytics).mockReturnValue({ loading: false, error: 'Backend unavailable.', refresh: vi.fn(), data: null, serverNow: null });
    render(<DashboardPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Backend unavailable.');
    expect(screen.queryByText('Paid revenue')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Current data unavailable');
});
