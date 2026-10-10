// Run with: npm run test:media   (Node >= 22.18 strips TypeScript types natively; no extra dependency)
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getHighResImageUrl, getImageSrcSet, getOptimizedImageUrl, isCanonicalMedia, parseCanonicalMedia, pickVariantWidth,
} from '../src/utils/mediaUtils.ts';

const ID = 'abcdefghijklmnopqrstuvwxy'.replace(/^./, 'a'); // 25 chars, starts with "a", base32 alphabet
const U = (w: number) => `https://cdn.v2enterprise.in/media/v1/${ID}/${w}.webp`;

test('canonical URLs are recognised only on the media CDN host with the exact path shape', () => {
    assert.deepEqual(parseCanonicalMedia(U(1600)), { origin: 'https://cdn.v2enterprise.in', version: 'v1', assetId: ID, width: 1600 });
    for (const bad of [
        `https://evil.example/media/v1/${ID}/400.webp`, `https://cdn.v2enterprise.in.evil.com/media/v1/${ID}/400.webp`, `http://cdn.v2enterprise.in/media/v1/${ID}/400.webp`,
        `https://cdn.v2enterprise.in/media/v1/${ID}/400.png`, 'https://cdn.v2enterprise.in/products/a.jpg', `https://u:p@cdn.v2enterprise.in/media/v1/${ID}/400.webp`,
        `https://cdn.v2enterprise.in:8443/media/v1/${ID}/400.webp`, 'https://cdn.v2enterprise.in/media/v1/SHORT/400.webp', '', undefined, 'not a url',
    ]) {
        assert.equal(isCanonicalMedia(bad as string), false, String(bad));
    }
});

test('getOptimizedImageUrl: picks the smallest generated variant covering the requested width', () => {
    assert.equal(getOptimizedImageUrl(U(1600), { width: 400 }), U(400));
    assert.equal(getOptimizedImageUrl(U(1600), { width: 401 }), U(800));
    assert.equal(getOptimizedImageUrl(U(400), { width: 1200 }), U(1200));
    assert.equal(getOptimizedImageUrl(U(400), { width: 5000 }), U(1600), 'never above the largest generated width');
    assert.equal(getOptimizedImageUrl(U(400)), U(1600), 'no width => highest quality variant');
    assert.equal(pickVariantWidth(600), 800);
});

test('getOptimizedImageUrl: is idempotent and leaves legacy / third-party / empty values untouched (fallback preserved)', () => {
    const once = getOptimizedImageUrl(U(1600), { width: 800 });
    assert.equal(getOptimizedImageUrl(once, { width: 800 }), once);
    for (const same of [
        'https://cdn.v2enterprise.in/products/1786273628083-175204331-917128.jpg', 'https://pub-8848abc.r2.dev/products/x.jpg', 'https://images.pexels.com/photos/1/x.jpeg',
        '/relative/logo.webp', 'data:image/png;base64,AAAA',
    ]) {
        assert.equal(getOptimizedImageUrl(same, { width: 400 }), same);
    }
    assert.equal(getOptimizedImageUrl(undefined), '');
    assert.equal(getOptimizedImageUrl(''), '');
});

test('getOptimizedImageUrl: ImageKit behaviour is unchanged', () => {
    assert.equal(getOptimizedImageUrl('https://ik.imagekit.io/ma42/x.jpg?old=1', { width: 600, quality: 75 }), 'https://ik.imagekit.io/ma42/x.jpg?tr=f-auto,q-75,w-600,cm-at_max');
});

test('getImageSrcSet: only for canonical media, only generated widths', () => {
    assert.equal(getImageSrcSet(U(1600), [400, 800]), `${U(400)} 400w, ${U(800)} 800w`);
    assert.equal(getImageSrcSet(U(1600), [300, 999]), undefined);
    assert.equal(getImageSrcSet('https://cdn.v2enterprise.in/products/a.jpg'), undefined);
    assert.equal(getImageSrcSet(undefined), undefined);
});

test('getHighResImageUrl: product-detail views get the largest variant; legacy URLs unchanged', () => {
    assert.equal(getHighResImageUrl(U(400)), U(1600));
    assert.equal(getHighResImageUrl('https://pub-1.r2.dev/x.jpg'), 'https://pub-1.r2.dev/x.jpg');
    assert.equal(getHighResImageUrl(undefined), '');
});
