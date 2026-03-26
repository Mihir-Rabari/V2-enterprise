import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import {
    getProductsService, getProductByIdService, createProductService,
    updateProductService, deleteProductService,
} from './products.service';

export const getProducts = async (req: Request, res: Response) => {
    try {
        const getParam = (key: string) => req.query[key] || req.query[`${key}[]`];

        const toArray = (val: any): string[] | undefined => {
            if (!val) return undefined;
            if (Array.isArray(val)) return val as string[];
            return [val as string];
        };

        const result = await getProductsService({
            mainCategories: toArray(getParam('mainCategories') || getParam('mainCategory')),
            subCategories: toArray(getParam('subCategories') || getParam('subCategory')),
            isTrending: getParam('isTrending') === 'true' ? true : getParam('isTrending') === 'false' ? false : undefined,
            isNewArrival: getParam('isNew') === 'true' ? true : getParam('isNew') === 'false' ? false : undefined,
            tag: getParam('tag') as string,
            search: getParam('search') as string,
            status: getParam('status') as 'ACTIVE' | 'INACTIVE' | 'ALL',
            page: getParam('page') ? parseInt(getParam('page') as string) : 1,
            limit: getParam('limit') ? parseInt(getParam('limit') as string) : 12,
            groupByColor: getParam('groupByColor') === 'true',
            sort: getParam('sort') as string,
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
