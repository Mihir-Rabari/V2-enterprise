import { Product } from '../../models/Product';
import mongoose from 'mongoose';

export interface ProductFilters {
    mainCategory?: string;
    subCategory?: string;
    isTrending?: boolean;
    isNewArrival?: boolean;
    tag?: string;
    search?: string;
    page?: number;
    limit?: number;
    status?: 'ACTIVE' | 'INACTIVE';
}

export const getProductsService = async (filters: ProductFilters) => {
    const { mainCategory, subCategory, isTrending, isNewArrival, tag, search, status, page = 1, limit = 12 } = filters;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
        ...(mainCategory && { mainCategory }),
        ...(subCategory && { subCategory }),
        ...(isTrending !== undefined && { isTrending }),
        ...(isNewArrival !== undefined && { isNewArrival }),
        ...(status ? { status } : { status: 'ACTIVE' }),
        ...(tag && { tags: tag }),
        ...(search && {
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ],
        }),
    };

    const [products, total] = await Promise.all([
        Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Product.countDocuments(query),
    ]);

    const productsWithId = products.map(p => {
        const obj = p.toObject();
        return { ...obj, id: p._id.toString() };
    });

    return { products: productsWithId, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getProductByIdService = async (id: string | number) => {
    const filter: any = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };

    const product = await Product.findOne(filter);
    if (!product) throw new Error('Product not found.');

    const obj = product.toObject();
    return { ...obj, id: product._id.toString() };
};

export const createProductService = async (data: any) => {
    const product = await Product.create(data);
    const obj = product.toObject();
    return { ...obj, id: product._id.toString() };
};

export const updateProductService = async (id: string | number, data: any) => {
    const filter: any = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
    const product = await Product.findOneAndUpdate(filter, data, { new: true });
    if (!product) throw new Error('Product not found.');

    const obj = product.toObject();
    return { ...obj, id: product._id.toString() };
};

export const deleteProductService = async (id: string | number) => {
    const filter: any = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
    const product = await Product.findOneAndDelete(filter);
    if (!product) throw new Error('Product not found.');
    return product;
};
