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
        id: number; label: string; street: string;
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

    // On mount: restore user from localStorage if token exists
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
    }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
        setAuthError('');
        try {
            const res = await authAPI.login({ email, password });
            const { user: loggedIn, token } = res.data.data;
            localStorage.setItem('v2_token', token);
            localStorage.setItem('v2_user', JSON.stringify(loggedIn));
            setUser(loggedIn);
            return true;
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                || 'Invalid credentials. Please try again.';
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
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                || 'Registration failed. Please try again.';
            setAuthError(msg);
            return false;
        }
    };

    const logout = () => {
        setUser(null);
        setAuthError('');
        localStorage.removeItem('v2_token');
        localStorage.removeItem('v2_user');
        // Keep cart intact on logout — it's tied to browser, not user
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
