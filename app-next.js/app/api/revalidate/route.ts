import { revalidateTag } from 'next/cache';
import { HOME_CACHE_TAG } from '../../../lib/serverApi';

/**
 * POST /api/revalidate — expire the cached storefront data (homepage data and
 * site settings) right away, so the next request renders fresh content.
 *
 * Called by the backend after admin changes (backend/src/utils/storefrontRevalidate.ts).
 * Internal only: nginx sends every public /api/* request to the backend, and
 * Next listens on 127.0.0.1. If REVALIDATE_SECRET is set, the caller must
 * also send it in the `x-revalidate-secret` header.
 */
export async function POST(request: Request) {
    const secret = process.env.REVALIDATE_SECRET;
    if (secret && request.headers.get('x-revalidate-secret') !== secret) {
        return Response.json({ ok: false }, { status: 401 });
    }
    // expire: 0 — the next request waits for fresh data instead of getting the stale copy once.
    revalidateTag(HOME_CACHE_TAG, { expire: 0 });
    return Response.json({ ok: true });
}
