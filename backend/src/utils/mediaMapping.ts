import fs from 'fs';

/**
 * Reads the verified legacy->canonical mapping exported by the `media-migrate` tool
 * (`media-migrate export-mapping`, JSON Lines, one asset per line). Used only to give the admin media library
 * small thumbnails instead of full-resolution originals. Missing or corrupt mapping => no thumbnails are rewritten
 * (unresolved is safe; a guessed URL is not).
 */
interface MappingEntry {
    assetId: string;
    sourceKey: string;
    variants: Array<{ width: number; key?: string }>;
}

let cacheFile = '';
let cacheMtime = -1;
let checkedAt = 0;
let byKey = new Map<string, MappingEntry>();

const CHECK_EVERY_MS = 5000;

export const loadMapping = (file: string, now: number = Date.now()): Map<string, MappingEntry> => {
    if (file === cacheFile && now - checkedAt < CHECK_EVERY_MS) return byKey;
    checkedAt = now;
    let mtime = -1;
    try {
        mtime = fs.statSync(file).mtimeMs;
    } catch {
        /* no mapping file yet */
    }
    if (file === cacheFile && mtime === cacheMtime) return byKey;
    cacheFile = file;
    cacheMtime = mtime;
    byKey = new Map();
    if (mtime === -1) return byKey;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        if (!line.trim()) continue;
        try {
            const e = JSON.parse(line) as MappingEntry;
            if (e && typeof e.sourceKey === 'string' && Array.isArray(e.variants)) byKey.set(e.sourceKey, e);
        } catch {
            /* skip a corrupt line */
        }
    }
    return byKey;
};

/** Public URL of a small variant for a legacy object key, or null when there is no verified mapping. */
export const thumbnailUrlFor = (objectKey: string, publicBase: string, mappingFile: string | undefined, width = 400): string | null => {
    if (!mappingFile) return null;
    const e = loadMapping(mappingFile).get(objectKey);
    if (!e) return null;
    const variant = e.variants.filter((v) => v.key).sort((a, b) => a.width - b.width).find((v) => v.width >= width) ?? e.variants.filter((v) => v.key).sort((a, b) => b.width - a.width)[0];
    if (!variant || !variant.key) return null;
    return `${publicBase.replace(/\/+$/, '')}/${variant.key.split('/').map(encodeURIComponent).join('/')}`;
};

/** Test hook: forget cached state. */
export const resetMappingCache = (): void => {
    cacheFile = '';
    cacheMtime = -1;
    checkedAt = 0;
    byKey = new Map();
};
