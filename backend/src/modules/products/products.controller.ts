import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import {
    getProductsService, getProductByIdService, createProductService,
    updateProductService, deleteProductService,
} from './products.service';

export const getProducts = async (req: Request, res: Response) => {
    try {
        const { 
            mainCategories, subCategories, isTrending, isNew, tag, search, 
            page, limit, status, groupByColor,
            minPrice, maxPrice, colors, sizes, fabrics, collars, sleeves, necks, pockets, lengths, patternTypes
        } = req.query;

        const toArray = (val: any): string[] | undefined => {
            if (!val) return undefined;
            if (Array.isArray(val)) return val as string[];
            return [val as string];
        };

        const result = await getProductsService({
            mainCategories: toArray(mainCategories || req.query.mainCategory),
            subCategories: toArray(subCategories || req.query.subCategory),
            isTrending: isTrending === 'true' ? true : isTrending === 'false' ? false : undefined,
            isNewArrival: isNew === 'true' ? true : isNew === 'false' ? false : undefined,
            tag: tag as string,
            search: search as string,
            status: status as 'ACTIVE' | 'INACTIVE' | 'ALL',
            page: page ? parseInt(page as string) : 1,
            limit: limit ? parseInt(limit as string) : 12,
            groupByColor: groupByColor === 'true',
            // Dynamic Filters
            minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
            colors: toArray(colors),
            sizes: toArray(sizes),
            fabrics: toArray(fabrics),
            collars: toArray(collars),
            sleeves: toArray(sleeves),
            necks: toArray(necks),
            pockets: toArray(pockets),
            lengths: toArray(lengths),
            patternTypes: toArray(patternTypes),
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
