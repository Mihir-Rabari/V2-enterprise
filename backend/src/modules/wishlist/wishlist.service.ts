import { User } from '../../models/User';
import { Product } from '../../models/Product';
import mongoose from 'mongoose';
import { isActiveStatus, ACTIVE_STATUS_FILTER } from '../../utils/productStatus';

export const getWishlist = async (userId: string) => {
    // ('[Wishlist] Fetching for user:', userId);
    try {
        const user = await User.findById(userId).populate({ path: 'wishlist', match: { status: ACTIVE_STATUS_FILTER } });
        if (!user) {
            console.warn('[Wishlist] User not found:', userId);
            throw new Error('User not found');
        }
        // console.log('[Wishlist] Found user, wishlist size:', user.wishlist?.length || 0);
        // populate leaves null for products excluded by `match` (inactive/deleted)
        return (user.wishlist || []).filter(Boolean);
    } catch (err: any) {
        console.error('[Wishlist] Error in getWishlist:', err.message);
        throw err;
    }
};

export const addToWishlist = async (userId: string, productId: string) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    const product = await Product.findById(productId);
    if (!product || !isActiveStatus(product.status)) {
        console.warn('[Wishlist] Product not found:', productId);
        throw new Error('Product not found');
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw new Error('Invalid product ID format');
    }
    const pId = new mongoose.Types.ObjectId(productId);

    // Ensure user.wishlist exists
    if (!user.wishlist) user.wishlist = [];

    const alreadyExists = user.wishlist.some(id => {
        const idStr = id._id ? id._id.toString() : id.toString();
        return idStr === productId;
    });

    if (alreadyExists) {
        // console.log('[Wishlist] Product already in wishlist:', productId);
        return user.wishlist;
    }

    user.wishlist.push(pId as any);
    await user.save();
    // console.log('[Wishlist] Added product to wishlist:', productId);
    // return user.wishlist;
};

export const removeFromWishlist = async (userId: string, productId: string) => {
    // console.log('[Wishlist] Removing product:', productId, 'for user:', userId);
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw new Error('Invalid product ID format');
    }

    const initialSize = user.wishlist.length;
    user.wishlist = user.wishlist.filter(id => {
        const idStr = id._id ? id._id.toString() : id.toString();
        return idStr !== productId;
    });

    if (user.wishlist.length !== initialSize) {
        await user.save();
        // console.log('[Wishlist] Removed product from wishlist:', productId);
    } else {
        // console.log('[Wishlist] Product was not in wishlist:', productId);
    }

    return user.wishlist;
};
