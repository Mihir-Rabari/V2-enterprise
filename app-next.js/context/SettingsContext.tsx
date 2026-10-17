'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { settingsAPI } from '../lib/apiClient';
import { SiteSettings } from '../types';

interface SettingsContextValue {
    settings: SiteSettings;
    loaded: boolean;
}

const SettingsContext = createContext<SettingsContextValue>({ settings: {} as SiteSettings, loaded: false });

/**
 * Fetches public site settings once per page load and shares them with every
 * consumer. Mounted once at the root provider level (app/providers.tsx).
 *
 * The `cancelled` flag below is the original guard from the Vite source: under
 * React StrictMode (dev) the effect mounts → cleans up → re-mounts, and the
 * first run's response is discarded instead of applied. In production the
 * effect runs exactly once, so there is a single fetch. `useSettings()` also
 * never throws — consumers outside a provider get the safe default
 * `{ settings: {}, loaded: false }`, exactly like the Vite version.
 */
export const SettingsProvider: React.FC<{ children: React.ReactNode; initialSettings?: SiteSettings | null }> = ({ children, initialSettings = null }) => {
    // The root layout fetches settings on the server (cached), so the first
    // HTML already has the navbar/section order; fetch here only if that failed.
    const [settings, setSettings] = useState<SiteSettings>(initialSettings ?? ({} as SiteSettings));
    const [loaded, setLoaded] = useState(initialSettings !== null);

    useEffect(() => {
        if (initialSettings !== null) return;
        let cancelled = false;
        settingsAPI.get()
            .then(res => {
                if (!cancelled && res.data.success && res.data.data) setSettings(res.data.data);
            })
            .catch(err => console.error('Error fetching site settings:', err))
            .finally(() => { if (!cancelled) setLoaded(true); });
        return () => { cancelled = true; };
    }, [initialSettings]);

    return <SettingsContext.Provider value={{ settings, loaded }}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => useContext(SettingsContext);
