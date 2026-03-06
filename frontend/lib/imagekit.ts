/**
 * ImageKit Upload Utility
 *
 * Architecture:
 *   Browser → POST /api/v1/admin/upload (our backend) → ImageKit CDN
 *
 * The backend uses HTTP Basic Auth with the private key (private_key:)
 * — identical to the old PHP: CURLOPT_USERPWD => 'private_key:'
 * The private key NEVER touches the browser.
 */

const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api/v1';

export const IMAGEKIT_PUBLIC_URL = 'https://ik.imagekit.io/ma42aehxw/';

/**
 * Upload a file via our backend proxy to ImageKit.
 * @param file   - File object from <input type="file">
 * @param folder - Destination folder on ImageKit (e.g. '/Products')
 * @returns CDN URL string
 */
export async function uploadToImageKit(file: File, folder = '/v2-uploads'): Promise<string> {
    const token = localStorage.getItem('v2_token');

    const form = new FormData();
    form.append('file', file, file.name);
    form.append('fileName', `${Date.now()}_${file.name.replace(/\s+/g, '_')}`);
    form.append('folder', folder);

    const res = await fetch(`${BASE_URL}/admin/upload`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            // Note: Do NOT set Content-Type manually — browser sets multipart/form-data with boundary automatically
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
    if (!url) throw new Error('ImageKit did not return a URL');
    return url;
}
