import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { env } from '../config/env';
import { thumbnailUrlFor } from './mediaMapping';

// Determine if R2 is configured
export const isR2Configured = () => {
    return Boolean(
        env.R2_ACCOUNT_ID &&
        env.R2_ACCESS_KEY_ID &&
        env.R2_SECRET_ACCESS_KEY &&
        env.R2_BUCKET_NAME &&
        env.R2_PUBLIC_URL
    );
};

// Initialize S3 Client for Cloudflare R2
let s3Client: S3Client | null = null;
if (isR2Configured()) {
    s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: env.R2_ACCESS_KEY_ID as string,
            secretAccessKey: env.R2_SECRET_ACCESS_KEY as string,
        },
    });
}

/**
 * Upload a file buffer/stream to Cloudflare R2
 * @param fileBuffer The file content
 * @param folder The destination folder in R2 (e.g. 'products', 'sliders')
 * @param originalName The original file name
 * @param mimeType The file MIME type
 * @returns Object containing public url, fileId (path in bucket), and name
 */
export const uploadToR2 = async (
    fileBuffer: Buffer,
    folder: string,
    originalName: string,
    mimeType: string
) => {
    if (!s3Client || !env.R2_BUCKET_NAME || !env.R2_PUBLIC_URL) {
        throw new Error('Cloudflare R2 is not fully configured in environment variables');
    }

    // Clean up folder name and generate unique key
    const cleanFolder = folder.replace(/^\/+|\/+$/g, ''); // removes leading/trailing slashes
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const cleanName = originalName.replace(/\s+/g, '_');
    const key = cleanFolder ? `${cleanFolder}/${uniqueSuffix}-${cleanName}` : `${uniqueSuffix}-${cleanName}`;

    const command = new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
    });

    await s3Client.send(command);

    return {
        url: `${env.R2_PUBLIC_URL}/${key}`,
        fileId: key,
        name: cleanName,
        folder: cleanFolder ? `/${cleanFolder}` : '/',
    };
};

/**
 * List paginated objects from R2 based on a given prefix (folder path)
 * @param prefix Path prefix to list objects from (e.g., 'products/')
 * @param limit Max keys to return
 * @param continuationToken For pagination
 * @returns Files list and common prefixes (subfolders)
 */
export const listR2Objects = async (
    prefix: string = '',
    limit: number = 100,
    continuationToken?: string
) => {
    if (!s3Client || !env.R2_BUCKET_NAME || !env.R2_PUBLIC_URL) {
        throw new Error('Cloudflare R2 is not fully configured in environment variables');
    }

    let cleanPrefix = prefix.replace(/^\/+/, ''); // Remove leading slash
    if (cleanPrefix && !cleanPrefix.endsWith('/')) {
        cleanPrefix += '/'; // Ensure trailing slash for folder search
    }

    const command = new ListObjectsV2Command({
        Bucket: env.R2_BUCKET_NAME,
        Prefix: cleanPrefix,
        MaxKeys: limit,
        ContinuationToken: continuationToken,
        Delimiter: '/', // Used to group objects into 'folders' (CommonPrefixes)
    });

    const response = await s3Client.send(command);

    const media = (response.Contents || [])
        .filter(item => item.Key && !item.Key.endsWith('/'))
        .map((item) => ({
        id: item.Key || '',
        url: `${env.R2_PUBLIC_URL}/${item.Key}`,
        // Small verified WebP variant when the migration tool has produced one; otherwise the original (unchanged behaviour)
        thumbnailUrl: (item.Key && thumbnailUrlFor(item.Key, env.R2_PUBLIC_URL as string, env.MEDIA_MAPPING_FILE)) || `${env.R2_PUBLIC_URL}/${item.Key}`,
        name: item.Key?.split('/').pop() || item.Key,
        size: item.Size || 0,
        mimeType: '', // S3 doesn't return mimeType in ListObjects
        folder: prefix.startsWith('/') ? prefix : `/${prefix}`,
        createdAt: item.LastModified?.toISOString(),
        fileId: item.Key // Track this so we can delete if needed
    }));

    const folders = (response.CommonPrefixes || []).map((cp) => {
        const fullPrefix = cp.Prefix || '';
        // Extract just the folder name
        const folderName = fullPrefix.replace(cleanPrefix, '').replace(/\/$/, '');
        return folderName;
    }).filter(Boolean);

    return {
        media,
        folders,
        currentPath: prefix.startsWith('/') ? prefix : `/${prefix}`,
        total: media.length,
        nextContinuationToken: response.NextContinuationToken
    };
};
