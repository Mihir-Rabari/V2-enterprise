import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { verifyToken } from '../../utils/jwt';
import { parseIntParam, asString } from '../../utils/query';
import {
    getProductsService, getProductByIdService, createProductService,
    updateProductService, deleteProductService,
} from './products.service';

/** Non-ACTIVE catalog data is only visible to a valid admin token (public callers always get ACTIVE). */
export const resolveListStatus = (authHeader: string | undefined, requested: string | undefined): 'ACTIVE' | 'INACTIVE' | 'ALL' => {
    const wanted = requested?.toUpperCase();
    if (wanted !== 'ALL' && wanted !== 'INACTIVE' && wanted !== 'ACTIVE') return 'ACTIVE';
    try {
        if (!authHeader?.startsWith('Bearer ')) return 'ACTIVE';
        return verifyToken(authHeader.split(' ')[1]).role === 'ADMIN' ? wanted : 'ACTIVE';
    } catch {
        return 'ACTIVE';
    }
};

export const MAX_PRODUCTS_LIMIT = 500;

export const getProducts = async (req: Request, res: Response) => {
    try {
        const getParam = (key: string) => req.query[key] || req.query[`${key}[]`];

        // Only plain strings are accepted; `?x[$ne]=1` style objects are dropped.
        const toArray = (val: any): string[] | undefined => {
            if (!val) return undefined;
            const arr = Array.isArray(val) ? val : [val];
            const strs = arr.filter((v): v is string => typeof v === 'string');
            return strs.length > 0 ? strs : undefined;
        };

        const status = resolveListStatus(req.headers.authorization, asString(getParam('status')));

        const result = await getProductsService({
            mainCategories: toArray(getParam('mainCategories') || getParam('mainCategory')),
            subCategories: toArray(getParam('subCategories') || getParam('subCategory')),
            isTrending: getParam('isTrending') === 'true' ? true : getParam('isTrending') === 'false' ? false : undefined,
            isNewArrival: getParam('isNew') === 'true' ? true : getParam('isNew') === 'false' ? false : undefined,
            tag: asString(getParam('tag')),
            search: asString(getParam('search')),
            status,
            page: parseIntParam(getParam('page'), 1, 1, 100000),
            limit: parseIntParam(getParam('limit'), 12, 1, MAX_PRODUCTS_LIMIT),
            groupByColor: getParam('groupByColor') === 'true',
            sort: asString(getParam('sort')),
            // Dynamic Filters
            minPrice: getParam('minPrice') ? parseFloat(getParam('minPrice') as string) : undefined,
            maxPrice: getParam('maxPrice') ? parseFloat(getParam('maxPrice') as string) : undefined,
            colors: toArray(getParam('colors')),
            sizes: toArray(getParam('sizes')),
            fabrics: toArray(getParam('fabrics')),
            collars: toArray(getParam('collars')),
            sleeves: toArray(getParam('sleeves')),
            necks: toArray(getParam('necks')),
            pockets: toArray(getParam('pockets')),
            lengths: toArray(getParam('lengths')),
            patternTypes: toArray(getParam('patternTypes')),
            // Custom dynamic attribute filters: any query param prefixed with "custom_"
            customFilters: (() => {
                const known = new Set(['mainCategories', 'mainCategory', 'subCategories', 'subCategory',
                    'isTrending', 'isNew', 'tag', 'search', 'status', 'page', 'limit', 'groupByColor',
                    'sort', 'minPrice', 'maxPrice', 'colors', 'sizes', 'fabrics', 'collars', 'sleeves',
                    'necks', 'pockets', 'lengths', 'patternTypes']);
                const custom: Record<string, string[]> = {};
                Object.keys(req.query).forEach(key => {
                    const cleanKey = key.replace(/\[\]$/, '');
                    if (!known.has(cleanKey) && cleanKey.startsWith('custom_')) {
                        const attrKey = cleanKey.replace(/^custom_/, '');
                        const vals = toArray(getParam(key));
                        if (vals && vals.length > 0) custom[attrKey] = vals;
                    }
                });
                return Object.keys(custom).length > 0 ? custom : undefined;
            })(),
        });
        return sendSuccess(res, result);
    } catch (err: unknown) {
        return sendError(res, (err as Error).message);
    }
};

export const getProduct = async (req: Request, res: Response) => {
    try {
        const product = await getProductByIdService(req.params.id);
        return sendSuccess(res, product);
    } catch (err: unknown) {
        return sendError(res, (err as Error).message, 404);
    }
};

export const createProduct = async (req: Request, res: Response) => {
    try {
        const product = await createProductService(req.body);
        return sendSuccess(res, product, 'Product created', 201);
    } catch (err: any) {
        console.error('[Products] Failed to create product:', err.message, err.errors || err);
        return sendError(res, err.message, 400);
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    try {
        const product = await updateProductService(req.params.id, req.body);
        return sendSuccess(res, product, 'Product updated');
    } catch (err: any) {
        console.error('[Products] Failed to update product:', err.message, err.errors || err);
        return sendError(res, err.message, 400);
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    try {
        await deleteProductService(req.params.id);
        return sendSuccess(res, null, 'Product deleted');
    } catch (err: unknown) {
        return sendError(res, (err as Error).message, 404);
    }
};
