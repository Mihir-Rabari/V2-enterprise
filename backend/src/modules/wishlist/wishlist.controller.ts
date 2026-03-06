import { Request, Response } from 'express';
import * as wishlistService from './wishlist.service';

export const getWishlist = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const wishlist = await wishlistService.getWishlist(userId);
        res.status(200).json({
            success: true,
            data: wishlist
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const addToWishlist = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { productId } = req.body;
        const wishlist = await wishlistService.addToWishlist(userId, productId);
        res.status(200).json({
            success: true,
            data: wishlist
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const removeFromWishlist = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { productId } = req.params;
        const wishlist = await wishlistService.removeFromWishlist(userId, productId);
        res.status(200).json({
            success: true,
            data: wishlist
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
