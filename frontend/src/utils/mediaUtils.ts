/**
 * Media Optimization Utility for ImageKit
 */

export interface ImageKitOptions {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'auto' | 'webp' | 'avif';
    blur?: number;
    crop?: 'maintain-ratio' | 'force' | 'at-least' | 'at-max';
}

/**
 * Transforms a raw ImageKit URL into an optimized version using ImageKit's
 * transformation parameters.
 * 
 * Default transformation: auto-format, quality 70.
 * 
 * @param url - The original ImageKit URL
 * @param options - Transformation options (width, height, quality, etc)
 * @returns The optimized URL string
 */
export const getOptimizedImageUrl = (url: string | undefined, options: ImageKitOptions = {}): string => {
    if (!url) return '';
    
    // Skip if not an ImageKit URL (though most are in this project)
    if (!url.includes('ik.imagekit.io')) return url;

    const { 
        width, 
        height, 
        quality = 70, 
        format = 'auto',
        blur,
        crop = 'at-max'
    } = options;

    const transforms: string[] = [];

    // Format (WebP/AVIF auto-detection)
    if (format) transforms.push(`f-${format}`);
    
    // Quality
    if (quality) transforms.push(`q-${quality}`);

    // Responsive sizing
    if (width) transforms.push(`w-${width}`);
    if (height) transforms.push(`h-${height}`);

    // Crop strategy
    if (width || height) {
        const cmMap: Record<string, string> = {
            'maintain-ratio': 'maintain_ratio',
            'force': 'force',
            'at-least': 'at_least',
            'at-max': 'at_max'
        };
        transforms.push(`cm-${cmMap[crop] || 'at_max'}`);
    }

    if (blur) transforms.push(`bl-${blur}`);

    // Filter out potential double question marks or existing query params
    const baseUrl = url.split('?')[0];

    // ImageKit uses tr= parameter for transformations
    const trString = transforms.length > 0 ? `?tr=${transforms.join(',')}` : '';

    return `${baseUrl}${trString}`;
};
