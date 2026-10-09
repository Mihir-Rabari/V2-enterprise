import React, { createContext, useContext, useEffect, useState } from 'react';
import { settingsAPI } from '../lib/apiClient';
import { SiteSettings } from '../types';

interface SettingsContextValue {
    settings: SiteSettings;
    loaded: boolean;
}

const SettingsContext = createContext<SettingsContextValue>({ settings: {} as SiteSettings, loaded: false });

/** Fetches public site settings once per page load and shares them with every consumer. */
export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<SiteSettings>({} as SiteSettings);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        settingsAPI.get()
            .then(res => {
                if (!cancelled && res.data.success && res.data.data) setSettings(res.data.data);
            })
            .catch(err => console.error('Error fetching site settings:', err))
            .finally(() => { if (!cancelled) setLoaded(true); });
        return () => { cancelled = true; };
    }, []);

    return <SettingsContext.Provider value={{ settings, loaded }}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => useContext(SettingsContext);
