import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { parseIntParam, asString } from '../../utils/query';
import {
    getProductsService, getProductByIdService, ProductFilters, createProductService,
    updateProductService, deleteProductService,
} from './products.service';

export const MAX_PRODUCTS_LIMIT = 500;

/** Parses the shared list/filter query string. Deliberately does NOT read `status`: callers decide visibility. */
const parseProductFilters = (req: Request): Omit<ProductFilters, 'status'> => {
        const getParam = (key: string) => req.query[key] || req.query[`${key}[]`];

        // Only plain strings are accepted; `?x[$ne]=1` style objects are dropped.
        const toArray = (val: any): string[] | undefined => {
            if (!val) return undefined;
            const arr = Array.isArray(val) ? val : [val];
            const strs = arr.filter((v): v is string => typeof v === 'string');
            return strs.length > 0 ? strs : undefined;
        };

        return {
            mainCategories: toArray(getParam('mainCategories') || getParam('mainCategory')),
            subCategories: toArray(getParam('subCategories') || getParam('subCategory')),
            isTrending: getParam('isTrending') === 'true' ? true : getParam('isTrending') === 'false' ? false : undefined,
            isNewArrival: getParam('isNew') === 'true' ? true : getParam('isNew') === 'false' ? false : undefined,
            tag: asString(getParam('tag')),
            search: asString(getParam('search')),
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
        };
};

/** Public listing: ALWAYS ACTIVE only. The `status` query param and any Authorization header are ignored. */
export const getProducts = async (req: Request, res: Response) => {
    try {
        const result = await getProductsService({ ...parseProductFilters(req), status: 'ACTIVE' });
        return sendSuccess(res, result);
    } catch (err: unknown) {
        return sendError(res, (err as Error).message);
    }
};

/** Admin listing (route is behind protect + adminOnly). `status` = ACTIVE | INACTIVE | ALL (default ALL). */
export const getAdminProducts = async (req: Request, res: Response) => {
    try {
        const wanted = asString(req.query.status)?.toUpperCase();
        const status = wanted === 'ACTIVE' || wanted === 'INACTIVE' ? wanted : 'ALL';
        const result = await getProductsService({ ...parseProductFilters(req), status });
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

/** Admin detail (route is behind protect + adminOnly): may return inactive products. */
export const getAdminProduct = async (req: Request, res: Response) => {
    try {
        const product = await getProductByIdService(req.params.id, { includeInactive: true });
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
