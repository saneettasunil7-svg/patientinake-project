"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@/utils/apiConfig';

interface User {
    email: string;
    role: string;
    id: number;
    name: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, userData: User) => void;
    logout: (redirectUrl?: string) => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const logout = useCallback((redirectUrl?: string) => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        // Use hard navigation to prevent race conditions with protected route useEffects
        // which might otherwise redirect to /auth/login when user becomes null.
        window.location.href = redirectUrl || '/';
    }, []);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            setToken(storedToken);

            // Add a timeout so we don't hang forever if backend is slow/unreachable
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            fetch(`${getApiBaseUrl()}/users/me`, {
                headers: { Authorization: `Bearer ${storedToken}` },
                signal: controller.signal
            })
                .then(async response => {
                    if (response.ok) {
                        const data = await response.json();
                        setUser(data);
                    } else if (response.status === 401) {
                        console.warn('Session expired or invalid token - clearing');
                        logout();
                    } else {
                        console.warn(`Auth check failed: ${response.status} - preserving token`);
                    }
                })
                .catch((err) => {
                    if (err.name === 'AbortError') {
                        console.warn('Auth check timed out - backend may be unreachable. Preserving token.');
                    } else if (err.message === 'Failed to fetch' || err.message === 'Network Error') {
                        console.warn('Backend unreachable - preserving token for retry');
                    } else {
                        console.error('Initial auth check error:', err);
                        setToken(null);
                        setUser(null);
                        localStorage.removeItem('token');
                    }
                })
                .finally(() => {
                    clearTimeout(timeoutId);
                    setIsLoading(false);
                });
        } else {
            setIsLoading(false);
        }
    }, [logout]);

    const login = (newToken: string, userData: User) => {
        setToken(newToken);
        setUser(userData);
        localStorage.setItem('token', newToken);

        // Redirect based on role
        if (userData.role === 'patient') router.push('/patient/dashboard');
        else if (userData.role === 'doctor') router.push('/doctor/dashboard');
        else if (userData.role === 'admin') router.push('/admin/dashboard');
        else if (userData.role === 'agency') router.push('/agency/dashboard');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
