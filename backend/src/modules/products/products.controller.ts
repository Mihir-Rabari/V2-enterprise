import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import {
    getProductsService, getProductByIdService, createProductService,
    updateProductService, deleteProductService,
} from './products.service';

export const getProducts = async (req: Request, res: Response) => {
    try {
        const { mainCategory, subCategory, isTrending, isNew, tag, search, page, limit, status } = req.query;
        const result = await getProductsService({
            mainCategory: mainCategory as string,
            subCategory: subCategory as string,
            isTrending: isTrending === 'true' ? true : isTrending === 'false' ? false : undefined,
            isNewArrival: isNew === 'true' ? true : isNew === 'false' ? false : undefined,
            tag: tag as string,
            search: search as string,
            status: status as 'ACTIVE' | 'INACTIVE',
            page: page ? parseInt(page as string) : 1,
            limit: limit ? parseInt(limit as string) : 12,
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
    } catch (err: unknown) {
        return sendError(res, (err as Error).message, 400);
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    try {
        const product = await updateProductService(req.params.id, req.body);
        return sendSuccess(res, product, 'Product updated');
    } catch (err: unknown) {
        return sendError(res, (err as Error).message, 400);
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
