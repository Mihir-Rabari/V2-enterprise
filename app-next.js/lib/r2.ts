/**
 * client-only module
 *
 * Reads the auth token from localStorage and uploads from the browser;
 * only import from client components / event handlers.
 *
 * Cloudflare R2 Upload Utility
 *
 * Architecture:
 *   Browser → POST /api/v1/admin/upload (our backend) → Cloudflare R2
 *
 * Ported from frontend/lib/r2.ts (Vite → Next.js): the only Vite-ism was
 * `import.meta.env.VITE_API_URL`, replaced with process.env.NEXT_PUBLIC_API_URL.
 */

const IS_LOCALHOST = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('192.168.'));

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ||
    (IS_LOCALHOST ? 'http://localhost:5000/api/v1' : '/api/v1');

// Deprecated in favor of direct R2 URLs returned by the backend
export const IMAGEKIT_PUBLIC_URL = 'https://ik.imagekit.io/ma42aehxw/';

/**
 * Upload a file via our backend proxy to Cloudflare R2.
 * @param file   - File object from <input type="file">
 * @param folder - Destination folder on R2 (e.g. 'products')
 * @returns CDN URL string
 */
export async function uploadToR2(file: File, folder = 'v2-uploads'): Promise<string> {
    const token = localStorage.getItem('v2_token');

    const form = new FormData();
    form.append('file', file, file.name);
    form.append('fileName', `${Date.now()}_${file.name.replace(/\s+/g, '_')}`);
    form.append('folder', folder);

    const res = await fetch(`${BASE_URL}/admin/upload`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            // browser sets multipart/form-data boundary automatically
        },
        body: form,
    });

    if (!res.ok) {
        let errMsg = `Upload failed (${res.status})`;
        try {
            const json = await res.json();
            errMsg = json?.message || json?.error || errMsg;
        } catch {
            errMsg = await res.text().catch(() => errMsg);
        }
        throw new Error(errMsg);
    }

    const json = await res.json();
    const url = json?.data?.url;
    if (!url) throw new Error('Backend did not return an R2 URL');
    return url;
}
