/**
 * Unit tests for `context/AuthContext.tsx` (AuthProvider / useAuth).
 *
 * `lib/apiClient` (authAPI) is mocked with vi.mock — no network. The
 * persistence contract (localStorage keys `v2_token` / `v2_user`, kept-cart
 * logout semantics, error-message formatting) is exercised against real
 * jsdom localStorage.
 *
 * Pinned behavior (lib/README.md + PR #16 test notes):
 *   - session restore happens in a mount effect (never during render)
 *   - login/register write v2_token + v2_user, set the user, return true
 *   - logout clears v2_token + v2_user and the user, but KEEPS v2_cart
 *   - refreshUser re-syncs from getMe and force-logs-out on failure
 *   - authError formatting matches the Vite source exactly
 *     (message + " (field: msgs | …)" suffix from data.errors)
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth, type AuthUser } from '../context/AuthContext';

vi.mock('../lib/apiClient', () => ({
    authAPI: {
        login: vi.fn(),
        register: vi.fn(),
        getMe: vi.fn(),
    },
}));

// Import AFTER the vi.mock declaration — vitest hoists vi.mock above imports,
// so this resolves to the mocked module.
import { authAPI } from '../lib/apiClient';

const loginMock = authAPI.login as unknown as Mock;
const registerMock = authAPI.register as unknown as Mock;
const getMeMock = authAPI.getMe as unknown as Mock;

const user = (overrides: Partial<AuthUser> = {}): AuthUser => ({
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'CUSTOMER',
    ...overrides,
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
);

beforeEach(() => {
    vi.clearAllMocks();
});

describe('AuthProvider — session restore (mount effect)', () => {
    it('restores the user from v2_token + v2_user after mount', () => {
        const saved = user();
        localStorage.setItem('v2_token', 'tok-123');
        localStorage.setItem('v2_user', JSON.stringify(saved));

        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(result.current.user).toEqual(saved);
        expect(result.current.isAuthenticated).toBe(true);
    });

    it('renders anonymous when no token is stored (even if v2_user exists)', () => {
        localStorage.setItem('v2_user', JSON.stringify(user()));

        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
    });

    it('clears both keys when the stored v2_user JSON is malformed', () => {
        localStorage.setItem('v2_token', 'tok-123');
        localStorage.setItem('v2_user', '{oops');

        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(result.current.user).toBeNull();
        expect(localStorage.getItem('v2_token')).toBeNull();
        expect(localStorage.getItem('v2_user')).toBeNull();
    });
});

describe('AuthProvider — login', () => {
    it('writes v2_token + v2_user, sets the user, and returns true', async () => {
        const loggedIn = user({ role: 'ADMIN' });
        loginMock.mockResolvedValue({ data: { data: { user: loggedIn, token: 'jwt-abc' } } });

        const { result } = renderHook(() => useAuth(), { wrapper });

        let ok = false;
        await act(async () => {
            ok = await result.current.login('test@example.com', 'pw');
        });

        expect(ok).toBe(true);
        expect(result.current.user).toEqual(loggedIn);
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.authError).toBe('');
        expect(localStorage.getItem('v2_token')).toBe('jwt-abc');
        expect(JSON.parse(localStorage.getItem('v2_user')!)).toEqual(loggedIn);
        expect(loginMock).toHaveBeenCalledWith({ email: 'test@example.com', password: 'pw' });
    });

    it('keeps the cart untouched when writing the session', async () => {
        localStorage.setItem('v2_cart', '[{"id":"p1","quantity":1}]');
        loginMock.mockResolvedValue({ data: { data: { user: user(), token: 'jwt-abc' } } });

        const { result } = renderHook(() => useAuth(), { wrapper });
        await act(async () => {
            await result.current.login('test@example.com', 'pw');
        });

        expect(localStorage.getItem('v2_cart')).toBe('[{"id":"p1","quantity":1}]');
    });

    it('returns false and sets the API message on failure', async () => {
        loginMock.mockRejectedValue({ response: { data: { message: 'Invalid email or password' } } });

        const { result } = renderHook(() => useAuth(), { wrapper });

        let ok = true;
        await act(async () => {
            ok = await result.current.login('test@example.com', 'wrong');
        });

        expect(ok).toBe(false);
        expect(result.current.user).toBeNull();
        expect(result.current.authError).toBe('Invalid email or password');
        expect(localStorage.getItem('v2_token')).toBeNull();
    });

    it('falls back to the default message when the error has no response body', async () => {
        loginMock.mockRejectedValue(new Error('Network Error'));

        const { result } = renderHook(() => useAuth(), { wrapper });

        let ok = true;
        await act(async () => {
            ok = await result.current.login('test@example.com', 'wrong');
        });

        expect(ok).toBe(false);
        expect(result.current.authError).toBe('Invalid credentials. Please try again.');
    });

    it('appends validation-error details in the exact source format', async () => {
        loginMock.mockRejectedValue({
            response: {
                data: {
                    message: 'Validation failed',
                    errors: {
                        email: ['Invalid email'],
                        password: ['Too short', 'Weak'],
                    },
                },
            },
        });

        const { result } = renderHook(() => useAuth(), { wrapper });

        await act(async () => {
            await result.current.login('bad', 'x');
        });

        // `${message} (${field}: ${msgs.join(', ')} | …)` — matches the Vite
        // source formatting character-for-character.
        expect(result.current.authError).toBe(
            'Validation failed (email: Invalid email | password: Too short, Weak)',
        );
    });
});

describe('AuthProvider — register', () => {
    it('writes v2_token + v2_user, sets the user, and returns true', async () => {
        const registered = user();
        registerMock.mockResolvedValue({ data: { data: { user: registered, token: 'jwt-reg' } } });

        const { result } = renderHook(() => useAuth(), { wrapper });

        let ok = false;
        await act(async () => {
            ok = await result.current.register({ name: 'Test User', email: 'test@example.com', password: 'pw' });
        });

        expect(ok).toBe(true);
        expect(result.current.user).toEqual(registered);
        expect(localStorage.getItem('v2_token')).toBe('jwt-reg');
        expect(JSON.parse(localStorage.getItem('v2_user')!)).toEqual(registered);
        expect(registerMock).toHaveBeenCalledWith({ name: 'Test User', email: 'test@example.com', password: 'pw' });
    });

    it('returns false with the register-specific fallback message on a bodyless error', async () => {
        registerMock.mockRejectedValue(new Error('Network Error'));

        const { result } = renderHook(() => useAuth(), { wrapper });

        let ok = true;
        await act(async () => {
            ok = await result.current.register({ name: 'x', email: 'x@x.io', password: 'x' });
        });

        expect(ok).toBe(false);
        expect(result.current.authError).toBe('Registration failed. Please try again.');
    });
});

describe('AuthProvider — logout', () => {
    it('clears v2_token + v2_user and the user, but keeps v2_cart', async () => {
        loginMock.mockResolvedValue({ data: { data: { user: user(), token: 'jwt-abc' } } });
        localStorage.setItem('v2_cart', '[{"id":"p1","quantity":2}]');

        const { result } = renderHook(() => useAuth(), { wrapper });
        await act(async () => {
            await result.current.login('test@example.com', 'pw');
        });
        expect(result.current.isAuthenticated).toBe(true);

        act(() => {
            result.current.logout();
        });

        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.authError).toBe('');
        expect(localStorage.getItem('v2_token')).toBeNull();
        expect(localStorage.getItem('v2_user')).toBeNull();
        // Cart is tied to the browser, not the user — must survive logout.
        expect(localStorage.getItem('v2_cart')).toBe('[{"id":"p1","quantity":2}]');
    });
});

describe('AuthProvider — refreshUser', () => {
    it('re-syncs the user from getMe and updates v2_user', async () => {
        const fresh = user({ name: 'Updated Name' });
        localStorage.setItem('v2_token', 'tok-123');
        localStorage.setItem('v2_user', JSON.stringify(user()));
        getMeMock.mockResolvedValue({ data: { data: fresh } });

        const { result } = renderHook(() => useAuth(), { wrapper });
        expect(result.current.user!.name).toBe('Test User');

        await act(async () => {
            await result.current.refreshUser();
        });

        expect(result.current.user).toEqual(fresh);
        expect(JSON.parse(localStorage.getItem('v2_user')!)).toEqual(fresh);
        expect(getMeMock).toHaveBeenCalledTimes(1);
    });

    it('force-logs-out when getMe fails (clears session keys, keeps cart)', async () => {
        localStorage.setItem('v2_token', 'expired-token');
        localStorage.setItem('v2_user', JSON.stringify(user()));
        localStorage.setItem('v2_cart', '[{"id":"p1","quantity":1}]');
        getMeMock.mockRejectedValue({ response: { status: 401 } });

        const { result } = renderHook(() => useAuth(), { wrapper });
        expect(result.current.isAuthenticated).toBe(true);

        await act(async () => {
            await result.current.refreshUser();
        });

        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
        expect(localStorage.getItem('v2_token')).toBeNull();
        expect(localStorage.getItem('v2_user')).toBeNull();
        expect(localStorage.getItem('v2_cart')).toBe('[{"id":"p1","quantity":1}]');
    });
});

describe('AuthProvider — cross-mount persistence', () => {
    it('a user logged in on one mount is restored on the next mount from v2_user', async () => {
        loginMock.mockResolvedValue({ data: { data: { user: user(), token: 'jwt-abc' } } });

        const first = renderHook(() => useAuth(), { wrapper });
        await act(async () => {
            await first.result.current.login('test@example.com', 'pw');
        });
        first.unmount();

        const second = renderHook(() => useAuth(), { wrapper });
        expect(second.result.current.user).toEqual(user());
        expect(second.result.current.isAuthenticated).toBe(true);
    });
});

describe('useAuth outside AuthProvider', () => {
    it('throws a descriptive error', () => {
        const err = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider');
        err.mockRestore();
    });
});
