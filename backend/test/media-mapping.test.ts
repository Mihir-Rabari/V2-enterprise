import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { loadMapping, resetMappingCache, thumbnailUrlFor } from '../src/utils/mediaMapping';

const entry = (key: string, id: string) => ({
    assetId: id, sourceKey: key, state: 'COMPLETE',
    variants: [400, 800, 1600].map((w) => ({ width: w, effectiveWidth: w, format: 'webp', key: `media/v1/${id}/${w}.webp` })),
});

test('thumbnailUrlFor maps a legacy key to the smallest verified variant >= requested width, and ignores everything unmapped', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-map-'));
    try {
        resetMappingCache();
        const file = path.join(dir, 'mapping.jsonl');
        fs.writeFileSync(file, [JSON.stringify(entry('products/a b.jpg', 'aaaaaaaaaaaaaaaaaaaaaaaaa')), 'garbage line', '{"sourceKey":1}'].join('\n'));
        assert.equal(thumbnailUrlFor('products/a b.jpg', 'https://cdn.example.com/', file), 'https://cdn.example.com/media/v1/aaaaaaaaaaaaaaaaaaaaaaaaa/400.webp');
        assert.equal(thumbnailUrlFor('products/a b.jpg', 'https://cdn.example.com', file, 700), 'https://cdn.example.com/media/v1/aaaaaaaaaaaaaaaaaaaaaaaaa/800.webp');
        assert.equal(thumbnailUrlFor('products/a b.jpg', 'https://cdn.example.com', file, 5000), 'https://cdn.example.com/media/v1/aaaaaaaaaaaaaaaaaaaaaaaaa/1600.webp');
        assert.equal(thumbnailUrlFor('products/unknown.jpg', 'https://cdn.example.com', file), null);
        assert.equal(thumbnailUrlFor('products/a b.jpg', 'https://cdn.example.com', undefined), null);
        assert.equal(thumbnailUrlFor('products/a b.jpg', 'https://cdn.example.com', path.join(dir, 'missing.jsonl')), null);
        assert.equal(loadMapping(file).size, 1);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
