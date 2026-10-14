'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Hydration-safe localStorage-backed state.
 *
 * The Vite version read localStorage inside the useState initializer. That is
 * unsafe under Next.js SSR/hydration: the server render (no window → falls
 * back to initialValue) would disagree with the first client render (stored
 * value), producing a hydration mismatch. This port keeps the exact same
 * public API `[value, setValue]` (functional updates supported) with one
 * intentional, documented difference:
 *
 *   - The value is `initialValue` for the very first render(s); the stored
 *     value is restored in a mount effect, then React re-renders consumers.
 *     Server HTML and first client paint therefore always agree (no mismatch).
 *
 * Persistence semantics are unchanged: every `setValue` writes through to
 * localStorage immediately. The `writeBeforeHydration` ref covers the edge
 * where a child effect fires `setValue` before this hook's own mount effect
 * ran (child effects run first in React) — in that case the freshly-written
 * state is kept and the stale stored value is NOT re-read over it.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
    // State to store our value
    // Always start from initialValue so server render and first client render agree
    const [storedValue, setStoredValue] = useState<T>(initialValue);

    // Set once a setValue happens before hydration could read storage
    const writeBeforeHydration = useRef(false);

    // Hydrate from local storage after mount (never during render)
    useEffect(() => {
        if (writeBeforeHydration.current) return;
        try {
            // Get from local storage by key
            const item = window.localStorage.getItem(key);
            // Parse stored json or if none, keep initialValue
            if (item !== null) setStoredValue(JSON.parse(item));
        } catch (error) {
            // If error, keep initialValue
            console.log(error);
        }
    }, [key]);

    // Return a wrapped version of useState's setter function that ...
    // ... persists the new value to localStorage.
    const setValue = (value: T | ((val: T) => T)) => {
        try {
            // Allow value to be a function so we have same API as useState
            const valueToStore =
                value instanceof Function ? value(storedValue) : value;
            // Save state
            setStoredValue(valueToStore);
            writeBeforeHydration.current = true;
            // Save to local storage
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            // A more advanced implementation would handle the error case
            console.log(error);
        }
    };

    return [storedValue, setValue];
}
