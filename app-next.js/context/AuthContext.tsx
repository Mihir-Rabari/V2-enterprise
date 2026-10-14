'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../lib/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: 'CUSTOMER' | 'ADMIN';
    addresses?: {
        _id: string; label: string; street: string;
        city: string; state: string; zipCode: string; isDefault: boolean;
    }[];
    wishlist?: string[]; // Array of product IDs
}

interface AuthContextType {
    user: AuthUser | null;
    login: (email: string, password: string) => Promise<boolean>;
    register: (data: { name: string; email: string; password: string; phone?: string }) => Promise<boolean>;
    logout: () => void;
    refreshUser: () => Promise<void>;
    isAuthenticated: boolean;
    authError: string;
}

// ─── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [authError, setAuthError] = useState('');

    // On mount: restore user from localStorage if token exists.
    // (Runs in an effect, never during render — the server render and the
    // first client render both see `user = null`, so there is no hydration
    // mismatch. localStorage is only ever touched here, in handlers, or via
    // the apiClient interceptors.)
    useEffect(() => {
        const token = localStorage.getItem('v2_token');
        const savedUser = localStorage.getItem('v2_user');

        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch {
                localStorage.removeItem('v2_token');
                localStorage.removeItem('v2_user');
            }
        }
    }, []);

    // Stabilized with useCallback so `refreshUser` can depend on it cleanly.
    // In the Vite source, `refreshUser` was a useCallback([]) that closed over
    // the first render's `logout` (declared later in the component body) — an
    // exhaustive-deps violation that happened to be harmless because `logout`
    // only touches stable setState functions + localStorage. Making `logout`
    // an explicit dependency preserves identical behavior while fixing the
    // hidden coupling. (See PR notes — no API/semantic change.)
    const logout = useCallback(() => {
        setUser(null);
        setAuthError('');
        localStorage.removeItem('v2_token');
        localStorage.removeItem('v2_user');
        // Keep cart intact on logout — it's tied to browser, not user
    }, []);

    const refreshUser = useCallback(async () => {
        try {
            const res = await authAPI.getMe();
            const fresh = res.data.data;
            setUser(fresh);
            localStorage.setItem('v2_user', JSON.stringify(fresh));
        } catch {
            // Token invalid — force logout
            logout();
        }
    }, [logout]);

    const login = async (email: string, password: string): Promise<boolean> => {
        setAuthError('');
        try {
            const res = await authAPI.login({ email, password });
            const { user: loggedIn, token } = res.data.data;
            localStorage.setItem('v2_token', token);
            localStorage.setItem('v2_user', JSON.stringify(loggedIn));
            setUser(loggedIn);
            return true;
        } catch (err: any) {
            const data = err.response?.data;
            let msg = data?.message || 'Invalid credentials. Please try again.';
            if (data?.errors) {
                const details = Object.entries(data.errors)
                    .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
                    .join(' | ');
                msg = `${msg} (${details})`;
            }
            setAuthError(msg);
            return false;
        }
    };

    const register = async (data: {
        name: string; email: string; password: string; phone?: string;
    }): Promise<boolean> => {
        setAuthError('');
        try {
            const res = await authAPI.register(data);
            const { user: registered, token } = res.data.data;
            localStorage.setItem('v2_token', token);
            localStorage.setItem('v2_user', JSON.stringify(registered));
            setUser(registered);
            return true;
        } catch (err: any) {
            const data = err.response?.data;
            let msg = data?.message || 'Registration failed. Please try again.';
            if (data?.errors) {
                const details = Object.entries(data.errors)
                    .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
                    .join(' | ');
                msg = `${msg} (${details})`;
            }
            setAuthError(msg);
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{
            user, login, register, logout, refreshUser, isAuthenticated: !!user, authError,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
