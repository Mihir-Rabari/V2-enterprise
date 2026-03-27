import { env } from '../config/env';

/**
 * Generates an absolute URL for a given path.
 * If the path is already absolute (starts with http), it returns it as is.
 * Otherwise, it prepends the BACKEND_URL.
 */
export const getAbsoluteUrl = (path: string): string => {
    if (!path) return '';
    if (path.startsWith('http')) return path;

    const baseUrl = env.BACKEND_URL.replace(/\/+$/, '');
    const cleanPath = '/' + path.replace(/^\/+/, '');
    
    return `${baseUrl}${cleanPath}`;
};

/**
 * Specifically for frontend links (e.g. reset password, order tracking).
 * Uses FRONTEND_URL.
 */
export const getFrontendAbsoluteUrl = (path: string): string => {
    if (!path) return '';
    if (path.startsWith('http')) return path;

    const frontendBase = Array.isArray(env.FRONTEND_URL)
        ? env.FRONTEND_URL[0]
        : env.FRONTEND_URL;

    const baseUrl = frontendBase.replace(/\/+$/, '');
    const cleanPath = '/' + path.replace(/^\/+/, '');
    
    return `${baseUrl}${cleanPath}`;
};
