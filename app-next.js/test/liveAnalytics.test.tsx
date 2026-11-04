import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { adminAPI } from '../lib/apiClient';
import { useLiveAnalytics, ANALYTICS_REFRESH_MS } from '../hooks/useLiveAnalytics';

vi.mock('../lib/apiClient', () => ({ adminAPI: { getStats: vi.fn() } }));
const response = (revenue: number, generatedAt = new Date().toISOString()) => ({ data: { data: {
    generatedAt, stats: { revenue30d: revenue },
} } });
const flush = async () => { await act(async () => { await Promise.resolve(); }); };
beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T10:00:00Z'));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    vi.mocked(adminAPI.getStats).mockReset();
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

it('refreshes every 30 seconds and hides previous figures on refresh failure', async () => {
    vi.mocked(adminAPI.getStats).mockResolvedValueOnce(response(100) as any).mockRejectedValueOnce(new Error('unavailable'));
    const { result } = renderHook(() => useLiveAnalytics());
    await flush();
    expect(result.current.data?.stats.revenue30d).toBe(100);
    await act(async () => { await vi.advanceTimersByTimeAsync(ANALYTICS_REFRESH_MS); });
    expect(adminAPI.getStats).toHaveBeenCalledTimes(2);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toContain('could not be loaded');
});

it('rejects a stale server response instead of displaying it as current', async () => {
    vi.mocked(adminAPI.getStats).mockResolvedValue(response(100, '2026-11-04T09:59:00Z') as any);
    const { result } = renderHook(() => useLiveAnalytics());
    await flush();
    expect(result.current.data).toBeNull();
    expect(result.current.error).not.toBe('');
});

it('aborts older requests and never lets a late response overwrite the latest snapshot', async () => {
    let first!: (value: any) => void;
    vi.mocked(adminAPI.getStats).mockImplementationOnce(() => new Promise(resolve => { first = resolve; }));
    vi.mocked(adminAPI.getStats).mockResolvedValueOnce(response(200) as any);
    const { result } = renderHook(() => useLiveAnalytics());
    const signal = vi.mocked(adminAPI.getStats).mock.calls[0][0];
    await act(async () => { await result.current.refresh(); });
    expect(signal?.aborted).toBe(true);
    await act(async () => { first(response(100)); });
    expect(result.current.data?.stats.revenue30d).toBe(200);
});

it('pauses while hidden, refreshes on return and hides data immediately when offline', async () => {
    vi.mocked(adminAPI.getStats).mockImplementation(async () => response(100) as any);
    const { result, unmount } = renderHook(() => useLiveAnalytics());
    await flush();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(result.current.data).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(adminAPI.getStats).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    expect(adminAPI.getStats).toHaveBeenCalledTimes(2);
    expect(result.current.data).not.toBeNull();
    act(() => window.dispatchEvent(new Event('offline')));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toContain('offline');
    unmount();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(adminAPI.getStats).toHaveBeenCalledTimes(2);
});
