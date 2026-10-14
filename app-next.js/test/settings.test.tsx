/**
 * Unit tests for `context/SettingsContext.tsx` (SettingsProvider / useSettings).
 *
 * `settingsAPI` is mocked with vi.mock — no network. Pinned behavior
 * (lib/README.md + PR #16 test notes):
 *   - fetches public settings exactly once per page load (single mount →
 *     exactly one settingsAPI.get call, one applied response)
 *   - the `cancelled` flag discards a response that resolves after the
 *     effect was cleaned up (React StrictMode double-mount semantics)
 *   - `loaded` flips true on completion (even when success:false or the
 *     request rejects)
 *   - `useSettings()` outside a provider returns the safe default
 *     `{ settings: {}, loaded: false }` without throwing
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { render, renderHook, act, waitFor } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../context/SettingsContext';
import type { SiteSettings } from '../types';

vi.mock('../lib/apiClient', () => ({
    settingsAPI: {
        get: vi.fn(),
    },
}));

// Import AFTER the vi.mock declaration — vitest hoists vi.mock above imports.
import { settingsAPI } from '../lib/apiClient';

const getMock = settingsAPI.get as unknown as Mock;

const settings = (overrides: Partial<SiteSettings> = {}): SiteSettings => ({
    id: 'settings-1',
    logoText: 'V2 Enterprise',
    logoSubtext: 'Premium Luxury Fashion',
    email: 'support@v2enterprise.in',
    phone: '+91 12345 67890',
    address: 'Bhavnagar, Gujarat',
    instagram: 'v2enterprise',
    twitter: 'v2enterprise',
    facebook: 'v2enterprise',
    youtube: 'v2enterprise',
    slogan: 'Crafted with care',
    copyright: '© V2 Enterprise',
    storeHours: 'Mon–Sat, 10:00–20:00',
    gridSettings: { mobile: 2, tablet: 3, desktop: 4 },
    ...overrides,
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SettingsProvider>{children}</SettingsProvider>
);

/** Records every useSettings() snapshot across renders. */
interface SettingsSnapshot {
    settings: SiteSettings;
    loaded: boolean;
}
function SettingsProbe({ snapshots }: { snapshots: SettingsSnapshot[] }) {
    const value = useSettings();
    snapshots.push(value);
    return null;
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('SettingsProvider — single fetch per page load', () => {
    it('performs exactly one settingsAPI.get and applies the response', async () => {
        const payload = settings();
        getMock.mockResolvedValue({ data: { success: true, data: payload } });

        const { result } = renderHook(() => useSettings(), { wrapper });

        expect(result.current.loaded).toBe(false);
        await waitFor(() => expect(result.current.loaded).toBe(true));

        expect(getMock).toHaveBeenCalledTimes(1);
        expect(result.current.settings).toEqual(payload);
    });

    it('starts with the safe default ({} + loaded=false) while the fetch is in flight', async () => {
        const deferreds: Array<(value: unknown) => void> = [];
        getMock.mockImplementation(() => new Promise(resolve => { deferreds.push(resolve); }));

        const snapshots: SettingsSnapshot[] = [];
        render(
            <SettingsProvider>
                <SettingsProbe snapshots={snapshots} />
            </SettingsProvider>,
        );

        // First render: fetch started, nothing applied yet.
        expect(getMock).toHaveBeenCalledTimes(1);
        expect(snapshots[0]).toEqual({ settings: {} as SiteSettings, loaded: false });

        await act(async () => {
            deferreds[0]({ data: { success: true, data: settings() } });
        });

        expect(snapshots[snapshots.length - 1].loaded).toBe(true);
        expect(snapshots[snapshots.length - 1].settings).toEqual(settings());
    });
});

describe('SettingsProvider — cancelled-flag guard', () => {
    it('discards a response that resolves after the effect was cleaned up (StrictMode double-mount semantics)', async () => {
        const deferreds: Array<(value: unknown) => void> = [];
        getMock.mockImplementation(() => new Promise(resolve => { deferreds.push(resolve); }));

        const stalePayload = settings({ logoText: 'STALE' });
        const freshPayload = settings({ logoText: 'FRESH' });

        const snapshots: SettingsSnapshot[] = [];
        const first = render(
            <SettingsProvider>
                <SettingsProbe snapshots={snapshots} />
            </SettingsProvider>,
        );
        expect(getMock).toHaveBeenCalledTimes(1);

        // Simulate StrictMode: cleanup (cancelled = true), then a second
        // mount that starts its own fetch.
        first.unmount();
        render(
            <SettingsProvider>
                <SettingsProbe snapshots={snapshots} />
            </SettingsProvider>,
        );
        expect(getMock).toHaveBeenCalledTimes(2);

        // The STALE response from the first (cleaned-up) run arrives first —
        // it must be discarded, not applied.
        await act(async () => {
            deferreds[0]({ data: { success: true, data: stalePayload } });
        });

        const appliedStale = snapshots.filter(snap => snap.settings.logoText === 'STALE');
        expect(appliedStale).toEqual([]); // nothing stale was ever applied
        // loaded stayed false: the stale run's finally() is also guarded.
        expect(snapshots[snapshots.length - 1].loaded).toBe(false);

        // The FRESH response from the live run applies normally.
        await act(async () => {
            deferreds[1]({ data: { success: true, data: freshPayload } });
        });

        expect(snapshots[snapshots.length - 1].loaded).toBe(true);
        expect(snapshots[snapshots.length - 1].settings).toEqual(freshPayload);
        // Exactly one response was applied across both mounts. Count identity
        // transitions to a NON-EMPTY settings object (the remount legitimately
        // swaps the default {} for a new default {} — that is not an applied
        // response), and note that setSettings/setLoaded land in different
        // microtask ticks, so one applied response can span multiple renders
        // while the settings object identity stays the same.
        const appliedChanges = snapshots.reduce<number>(
            (count, snap, i) =>
                count +
                (i > 0 && snap.settings !== snapshots[i - 1].settings && Object.keys(snap.settings).length > 0 ? 1 : 0),
            0,
        );
        expect(appliedChanges).toBe(1);
    });

    it('still flips loaded when the response has success:false (guarded apply, guarded finally not skipped)', async () => {
        getMock.mockResolvedValue({ data: { success: false, data: null } });

        const { result } = renderHook(() => useSettings(), { wrapper });
        await waitFor(() => expect(result.current.loaded).toBe(true));

        // Nothing was applied — settings stay at the safe default.
        expect(result.current.settings).toEqual({} as SiteSettings);
        expect(getMock).toHaveBeenCalledTimes(1);
    });

    it('logs the fetch failure and still flips loaded (never throws to consumers)', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        getMock.mockRejectedValue(new Error('settings backend down'));

        const { result } = renderHook(() => useSettings(), { wrapper });
        await waitFor(() => expect(result.current.loaded).toBe(true));

        expect(error).toHaveBeenCalledTimes(1);
        expect(error).toHaveBeenCalledWith('Error fetching site settings:', expect.any(Error));
        expect(result.current.settings).toEqual({} as SiteSettings);
        error.mockRestore();
    });
});

describe('useSettings outside SettingsProvider', () => {
    it('returns the safe default { settings: {}, loaded: false } without throwing', () => {
        const { result } = renderHook(() => useSettings());
        expect(result.current.settings).toEqual({} as SiteSettings);
        expect(result.current.loaded).toBe(false);
    });
});
