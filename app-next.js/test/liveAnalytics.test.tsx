import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { adminAPI } from '../lib/apiClient';
import { useLiveAnalytics, ANALYTICS_REFRESH_MS } from '../hooks/useLiveAnalytics';

vi.mock('../lib/apiClient', () => ({ adminAPI: { getStats: vi.fn() } }));
const REQUEST_ID = '00000000-0000-4000-8000-000000000001';
const response = (revenue: number, generatedAt = new Date().toISOString()) => ({ data: { data: {
    generatedAt, serverTime: '2026-11-04T10:00:00Z', requestId: REQUEST_ID, period: { range: '30d' }, stats: { revenue: revenue },
} } });
const flush = async () => { await act(async () => { await Promise.resolve(); }); };
beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T10:00:00Z'));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    vi.mocked(adminAPI.getStats).mockReset();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(REQUEST_ID);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

it('refreshes every 30 seconds and hides previous figures on refresh failure', async () => {
    vi.mocked(adminAPI.getStats).mockResolvedValueOnce(response(100) as any).mockRejectedValueOnce(new Error('unavailable'));
    const { result } = renderHook(() => useLiveAnalytics());
    await flush();
    expect(result.current.data?.stats.revenue).toBe(100);
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
    expect(result.current.data?.stats.revenue).toBe(200);
});

it('pauses while hidden, refreshes on return and hides data immediately when offline', async () => {
    vi.mocked(adminAPI.getStats).mockImplementation(async () => ({ data: { data: {
        ...response(100).data.data, serverTime: new Date().toISOString(),
    } } }) as any);
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

it('uses server time when the device clock is wrong and keeps ticking through device clock changes', async () => {
    vi.setSystemTime(new Date('2035-01-01T00:00:00Z'));
    vi.mocked(adminAPI.getStats).mockResolvedValue(response(100, '2026-11-04T10:00:00Z') as any);
    const { result } = renderHook(() => useLiveAnalytics());
    await flush();
    expect(result.current.data?.stats.revenue).toBe(100);
    expect(result.current.serverNow).toBe(Date.parse('2026-11-04T10:00:00Z'));
    vi.setSystemTime(new Date('2000-01-01T00:00:00Z'));
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(result.current.serverNow).toBe(Date.parse('2026-11-04T10:00:02Z'));
    expect(result.current.error).toBe('');
});

it('rejects a cached response belonging to another request', async () => {
    const cached = response(100);
    cached.data.data.requestId = 'different-request';
    vi.mocked(adminAPI.getStats).mockResolvedValue(cached as any);
    const { result } = renderHook(() => useLiveAnalytics());
    await flush();
    expect(result.current.data).toBeNull();
    expect(result.current.error).not.toBe('');
});

it('fetches a selected timeframe and ignores a late response from the previous range', async () => {
    let finishOld!: (value: any) => void;
    vi.mocked(adminAPI.getStats).mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
    vi.mocked(adminAPI.getStats).mockImplementationOnce(async (_signal, _id, range) => ({ data: { data: {
        ...response(700).data.data, period: { range },
    } } }) as any);
    const { result, rerender } = renderHook(({ range }) => useLiveAnalytics(range), { initialProps: { range: '30d' as '30d' | '7d' } });
    const oldSignal = vi.mocked(adminAPI.getStats).mock.calls[0][0];
    rerender({ range: '7d' });
    await flush();
    expect(oldSignal?.aborted).toBe(true);
    expect(adminAPI.getStats).toHaveBeenLastCalledWith(expect.any(AbortSignal), REQUEST_ID, '7d');
    expect(result.current.data?.stats.revenue).toBe(700);
    await act(async () => { finishOld(response(3000)); });
    expect(result.current.data?.stats.revenue).toBe(700);
    expect(result.current.data?.period.range).toBe('7d');
});
