import { Product } from '../../models/Product';
import mongoose from 'mongoose';
import { syncFiltersFromProducts } from '../filters/filters.service';

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
    groupByColor?: boolean;
}

export const getProductsService = async (filters: ProductFilters) => {
    const { mainCategory, subCategory, isTrending, isNewArrival, tag, search, status, page = 1, limit = 12, groupByColor } = filters;
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
                { styleCode: { $regex: search, $options: 'i' } },
                { mainCategory: { $regex: search, $options: 'i' } },
                { subCategory: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ],
        }),
    };

    if (groupByColor) {
        // Group by (styleCode, color) so only one product per color variant is returned.
        // Products without a styleCode are treated as unique (grouped by their own _id).
        const colorGroupKey = {
            $cond: [
                { $gt: [{ $ifNull: ['$styleCode', ''] }, ''] },
                { styleCode: '$styleCode', color: '$color' },
                '$_id'
            ]
        };

        const pipeline: any[] = [
            { $match: query },
            { $sort: { createdAt: -1 as const } },
            { 
                $group: { 
                    _id: colorGroupKey, 
                    doc: { $first: '$$ROOT' },
                    sizes: { $addToSet: '$size' }
                } 
            },
            { 
                $replaceRoot: { 
                    newRoot: { 
                        $mergeObjects: [ "$doc", { sizes: "$sizes" } ] 
                    } 
                } 
            },
            { $sort: { createdAt: -1 as const } },
        ];

        const countPipeline: any[] = [
            { $match: query },
            { $group: { _id: colorGroupKey } },
            { $count: 'total' }
        ];

        const [products, countResult] = await Promise.all([
            Product.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
            Product.aggregate(countPipeline),
        ]);

        const total = countResult[0]?.total || 0;
        const productsWithId = products.map(p => ({
            ...p,
            id: p._id.toString(),
        }));

        return { products: productsWithId, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

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

    // Fetch siblings — other SKUs sharing the same styleCode
    let siblings: any[] = [];
    if (product.styleCode) {
        const siblingDocs = await Product.find({
            styleCode: product.styleCode,
            _id: { $ne: product._id },
            status: 'ACTIVE',
        }).select('_id name color colorHex size photo price quantity styleCode');

        siblings = siblingDocs.map(s => {
            const sObj = s.toObject();
            return { ...sObj, id: s._id.toString() };
        });
    }

    return { ...productWithId, siblings };
};

export const createProductService = async (data: any) => {
    const product = await Product.create(data);

    // Sync new attributes to filters collection (fire-and-forget)
    syncFiltersFromProducts(product).catch(err => console.error("Filter sync error:", err));

    const obj = product.toObject();
    return { ...obj, id: product._id.toString() };
};

export const updateProductService = async (id: string | number, data: any) => {
    const idStr = String(id);
    const filter: any = mongoose.Types.ObjectId.isValid(idStr) ? { _id: idStr } : { id: id };
    const product = await Product.findOneAndUpdate(filter, data, { new: true });
    if (!product) throw new Error('Product not found.');

    syncFiltersFromProducts(product).catch(err => console.error("Filter sync error:", err));

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
