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
    status?: 'ACTIVE' | 'INACTIVE' | 'ALL';
}

export const getProductsService = async (filters: ProductFilters) => {
    const { mainCategory, subCategory, isTrending, isNewArrival, tag, search, status, page = 1, limit = 12 } = filters;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
        ...(mainCategory && { mainCategory }),
        ...(subCategory && { subCategory }),
        ...(isTrending !== undefined && { isTrending }),
        ...(isNewArrival !== undefined && { isNewArrival }),
        ...(status === 'ALL' ? {} : status ? { status } : { status: 'ACTIVE' }),
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
    let product;

    const idStr = String(id);

    if (mongoose.Types.ObjectId.isValid(idStr)) {
        product = await Product.findById(idStr);
    }

    if (!product) {
        product = await Product.findOne({
            $or: [
                { id: id },
                { _id: mongoose.Types.ObjectId.isValid(idStr) ? idStr : undefined }
            ].filter(Boolean) as any[]
        });
    }

    if (!product) throw new Error('Product not found.');

    const obj = product.toObject();
    const productWithId = { ...obj, id: product._id.toString() };

    // Fetch siblings — other color variants sharing the same styleCode
    let siblings: any[] = [];
    if (product.styleCode) {
        const siblingDocs = await Product.find({
            styleCode: product.styleCode,
            _id: { $ne: product._id },
            status: 'ACTIVE',
        }).select('_id name color photo price');

        siblings = siblingDocs.map(s => {
            const sObj = s.toObject();
            return { ...sObj, id: s._id.toString() };
        });
    }

    return { ...productWithId, siblings };
};

export const createProductService = async (data: any) => {
    const product = await Product.create(data);
    const obj = product.toObject();
    return { ...obj, id: product._id.toString() };
};

export const updateProductService = async (id: string | number, data: any) => {
    const idStr = String(id);
    const filter: any = mongoose.Types.ObjectId.isValid(idStr) ? { _id: idStr } : { id: id };
    const product = await Product.findOneAndUpdate(filter, data, { new: true });
    if (!product) throw new Error('Product not found.');

    const obj = product.toObject();
    return { ...obj, id: product._id.toString() };
};

export const deleteProductService = async (id: string | number) => {
    const idStr = String(id);
    const filter: any = mongoose.Types.ObjectId.isValid(idStr) ? { _id: idStr } : { id: id };
    const product = await Product.findOneAndDelete(filter);
    if (!product) throw new Error('Product not found.');
    return product;
};
