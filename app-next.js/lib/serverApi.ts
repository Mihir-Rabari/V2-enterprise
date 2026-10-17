/**
 * Server-side reads from the backend API, for server components only.
 *
 * Requests go straight to the backend on the same machine (no internet hop,
 * no nginx) and are stored in Next's data cache for HOME_REVALIDATE_SECONDS
 * under HOME_CACHE_TAG. The backend expires that tag whenever admin data
 * changes (see app/api/revalidate/route.ts), so the timer is only a backstop.
 *
 * Every helper resolves to `null` on any failure (backend down, timeout,
 * non-2xx, `success: false`) so callers can fall back to fetching in the
 * browser instead of failing the render.
 */

export const HOME_CACHE_TAG = 'home';
export const HOME_REVALIDATE_SECONDS = 600;

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:5000';

export async function backendGet<T>(path: string): Promise<T | null> {
    try {
        const res = await fetch(`${BACKEND_URL}/api/v1${path}`, {
            next: { revalidate: HOME_REVALIDATE_SECONDS, tags: [HOME_CACHE_TAG] },
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return null;
        const body = await res.json();
        if (!body || body.success === false) return null;
        return (body.data ?? null) as T | null;
    } catch {
        return null;
    }
}
