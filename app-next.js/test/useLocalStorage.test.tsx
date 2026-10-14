/**
 * Unit tests for `hooks/useLocalStorage.ts`.
 *
 * Pinned behavior (lib/README.md + PR #16 test notes):
 *   - hydration-safe: value starts at `initialValue` on the first render,
 *     the stored value is restored in a mount effect
 *   - every `setValue` writes through to localStorage immediately
 *     (plain and functional updates)
 *   - the writeBeforeHydration ref keeps an early write (child effect that
 *     fires before this hook's own mount effect) from being clobbered by
 *     the stale stored read
 */
import React, { useEffect } from 'react';
import { describe, it, expect } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../hooks/useLocalStorage';

describe('useLocalStorage — hydration lifecycle', () => {
    it('first render shows initialValue; the stored value applies after mount', () => {
        localStorage.setItem('us-key', JSON.stringify('stored'));

        const snapshots: unknown[] = [];
        function Probe() {
            const [value] = useLocalStorage('us-key', 'init');
            snapshots.push(value);
            return null;
        }
        render(<Probe />);

        // First render is the initial value (server / first client render
        // agreement — the hydration-safety contract).
        expect(snapshots[0]).toBe('init');
        // The stored value is applied by the mount effect.
        expect(snapshots[snapshots.length - 1]).toBe('stored');
    });

    it('keeps initialValue when nothing is stored', () => {
        const { result } = renderHook(() => useLocalStorage('us-empty', 'init'));
        expect(result.current[0]).toBe('init');
        expect(localStorage.getItem('us-empty')).toBeNull();
    });

    it('restores non-string values through JSON round-trip', () => {
        localStorage.setItem('us-obj', JSON.stringify({ a: 1, b: [2, 3] }));

        const { result } = renderHook(() => useLocalStorage('us-obj', { a: 0, b: [] }));

        expect(result.current[0]).toEqual({ a: 1, b: [2, 3] });
    });
});

describe('useLocalStorage — writes', () => {
    it('writes through to localStorage on plain setValue', () => {
        const { result } = renderHook(() => useLocalStorage('us-write', 'a'));

        act(() => {
            result.current[1]('b');
        });

        expect(result.current[0]).toBe('b');
        expect(localStorage.getItem('us-write')).toBe(JSON.stringify('b'));
    });

    it('supports functional updates (same API as useState)', () => {
        const { result } = renderHook(() => useLocalStorage('us-fn', 'a'));

        act(() => {
            result.current[1](prev => prev + '!');
        });

        expect(result.current[0]).toBe('a!');
        expect(localStorage.getItem('us-fn')).toBe(JSON.stringify('a!'));
    });

    it('persists the last write across unmount + remount', () => {
        const first = renderHook(() => useLocalStorage('us-session', 'init'));
        act(() => {
            first.result.current[1]('survived');
        });
        first.unmount();

        const second = renderHook(() => useLocalStorage('us-session', 'init'));
        // Restored in the mount effect — value survives the remount.
        expect(second.result.current[0]).toBe('survived');
        expect(localStorage.getItem('us-session')).toBe(JSON.stringify('survived'));
    });
});

describe('useLocalStorage — pre-hydration write guard', () => {
    it('a write that runs before the hook\'s own mount effect is not clobbered by the stale stored read', () => {
        localStorage.setItem('us-race', JSON.stringify('stale'));

        const snapshots: unknown[] = [];
        /**
         * React runs child effects before parent effects, so <Child/>'s
         * setValue fires before the useLocalStorage mount effect in <Parent/>
         * could re-read the (stale) stored value. The writeBeforeHydration
         * ref must make the fresh write win.
         */
        function Child({ onMount }: { onMount: () => void }) {
            useEffect(() => {
                onMount();
            }, []);
            return null;
        }
        function Parent() {
            const [value, setValue] = useLocalStorage('us-race', 'init');
            snapshots.push(value);
            return <Child onMount={() => setValue('fresh')} />;
        }

        render(<Parent />);

        // The stale stored value never enters state…
        expect(snapshots).toEqual(['init', 'fresh']);
        expect(snapshots).not.toContain('stale');
        // …and storage ends up holding the fresh write.
        expect(localStorage.getItem('us-race')).toBe(JSON.stringify('fresh'));
    });
});
