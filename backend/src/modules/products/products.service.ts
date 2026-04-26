import { Product } from '../../models/Product';
import mongoose from 'mongoose';
import { syncFiltersFromProducts, rebuildFiltersFromAllProducts } from '../filters/filters.service';

export interface ProductFilters {
    mainCategories?: string[];
    subCategories?: string[];
    isTrending?: boolean;
    isNewArrival?: boolean;
    tag?: string;
    search?: string;
    page?: number;
    limit?: number;
    status?: 'ACTIVE' | 'INACTIVE' | 'ALL';
    groupByColor?: boolean;
    // Dynamic Filters
    minPrice?: number;
    maxPrice?: number;
    colors?: string[];
    sizes?: string[];
    fabrics?: string[];
    collars?: string[];
    sleeves?: string[];
    necks?: string[];
    pockets?: string[];
    lengths?: string[];
    patternTypes?: string[];
    sort?: string;
    customFilters?: Record<string, string[]>;
}

export const getProductsService = async (filters: ProductFilters) => {
    const { 
        mainCategories, subCategories, isTrending, isNewArrival, tag, search, status, 
        page = 1, limit = 12, groupByColor,
        minPrice, maxPrice, colors, sizes, fabrics, collars, sleeves, necks, pockets, lengths, patternTypes,
        sort = 'Newest', customFilters
    } = filters;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
        ...(mainCategories && mainCategories.length > 0 && { mainCategory: { $in: mainCategories.map(c => new RegExp(`^${c}$`, 'i')) } }),
        ...(subCategories && subCategories.length > 0 && { subCategory: { $in: subCategories.map(c => new RegExp(`^${c}$`, 'i')) } }),
        ...(isTrending !== undefined && { isTrending }),
        ...(isNewArrival !== undefined && { isNewArrival }),
        ...(status === 'ALL' ? {} : { status: { $regex: new RegExp(`^${status || 'ACTIVE'}$`, 'i') } }),
        ...(tag && { tags: tag }),
        // Price Range
        ...((minPrice !== undefined || maxPrice !== undefined) && {
            price: {
                ...(minPrice !== undefined && { $gte: minPrice }),
                ...(maxPrice !== undefined && { $lte: maxPrice }),
            }
        }),
        // Multi-select Filters
        ...(colors && colors.length > 0 && { color: { $in: colors } }),
        ...(sizes && sizes.length > 0 && { size: { $in: sizes } }),
        ...(fabrics && fabrics.length > 0 && { fabric: { $in: fabrics } }),
        ...(collars && collars.length > 0 && { collar: { $in: collars } }),
        ...(sleeves && sleeves.length > 0 && { sleeve: { $in: sleeves } }),
        ...(necks && necks.length > 0 && { neck: { $in: necks } }),
        ...(pockets && pockets.length > 0 && { pocket: { $in: pockets } }),
        ...(lengths && lengths.length > 0 && { length: { $in: lengths } }),
        ...(patternTypes && patternTypes.length > 0 && { patternType: { $in: patternTypes } }),
        // Custom (dynamic) attribute filters
        ...(customFilters && Object.fromEntries(
            Object.entries(customFilters)
                .filter(([, values]) => values && values.length > 0)
                .map(([key, values]) => [`customAttributes.${key}`, { $in: values }])
        )),
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

    let sortOptions: Record<string, 1 | -1> = { createdAt: -1 };
    switch (sort) {
        case 'Price: Low to High': sortOptions = { price: 1 }; break;
        case 'Price: High to Low': sortOptions = { price: -1 }; break;
        case 'A - Z': sortOptions = { name: 1 }; break;
        case 'Trending': sortOptions = { isTrending: -1, createdAt: -1 }; break;
        case 'Relevance':
        case 'Newest': 
        default: 
            sortOptions = { createdAt: -1 }; 
            break;
    }

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
            { $sort: sortOptions },
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
            { $sort: sortOptions },
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
        const obj = p.toObject({ flattenMaps: true });
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

    const obj = product.toObject({ flattenMaps: true });
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

    const obj = product.toObject({ flattenMaps: true });
    return { ...obj, id: product._id.toString() };
};

export const updateProductService = async (id: string | number, data: any) => {
    const idStr = String(id);
    const filter: any = mongoose.Types.ObjectId.isValid(idStr) ? { _id: idStr } : { id: id };
    const product = await Product.findOne(filter);
    if (!product) throw new Error('Product not found.');

    // Strip internal / immutable fields that should never be overwritten
    const { _id, __v, id: _id2, createdAt, updatedAt, ...safeData } = data;

    // Apply each field explicitly so Mongoose document change-tracking works
    Object.keys(safeData).forEach(key => {
        if (key === 'customAttributes') {
            // customAttributes is a Mongoose Map — must be set key-by-key
            // so that .markModified fires correctly
            const incoming: Record<string, string> = safeData.customAttributes || {};
            // Ensure the map exists (may be undefined on very old documents)
            if (!product.customAttributes) {
                product.customAttributes = new Map<string, string>();
            }
            // Clear existing map entries, then set new ones
            product.customAttributes.clear();
            Object.entries(incoming).forEach(([k, v]) => {
                if (v !== undefined && v !== null && String(v).trim() !== '') {
                    product.customAttributes.set(k, String(v));
                }
            });
            product.markModified('customAttributes');
        } else {
            (product as any)[key] = safeData[key];
        }
    });

    await product.save();

    syncFiltersFromProducts(product).catch(err => console.error("Filter sync error:", err));

    const obj = product.toObject({ flattenMaps: true });
    return { ...obj, id: product._id.toString() };
};

export const deleteProductService = async (id: string | number) => {
    const idStr = String(id);
    const filter: any = mongoose.Types.ObjectId.isValid(idStr) ? { _id: idStr } : { id: id };
    const product = await Product.findOneAndDelete(filter);
    if (!product) throw new Error('Product not found.');

    // Rebuild filter suggestions to remove values that no longer exist (fire-and-forget)
    rebuildFiltersFromAllProducts().catch(err => console.error("Filter rebuild error:", err));

    return product;
};
