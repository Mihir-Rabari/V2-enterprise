import { Category } from '../../models/Category';
import mongoose from 'mongoose';

export const getCategoriesService = async () => {
    // Fetch main categories and their children
    // In Mongoose, we'll fetch all and build tree or use population if we set it up.
    // For now, let's just fetch all categories and the frontend can handle it, 
    // or we fetch roots and populate children.
    return Category.find({ parentId: null }).sort({ name: 1 }).lean();
};

export const createCategoryService = async (data: {
    name: string; slug: string; image?: string; description?: string; parentId?: string;
}) => {
    const existing = await Category.findOne({ slug: data.slug });
    if (existing) throw new Error('A category with this slug already exists.');

    const category = await Category.create(data);
    return { ...category.toObject(), id: category._id.toString() };
};

export const updateCategoryService = async (id: string, data: any) => {
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
    const cat = await Category.findOneAndUpdate(query, data, { new: true });
    if (!cat) throw new Error('Category not found.');
    return { ...cat.toObject(), id: cat._id.toString() };
};

export const deleteCategoryService = async (id: string) => {
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
    const cat = await Category.findOneAndDelete(query);
    if (!cat) throw new Error('Category not found.');
    return cat;
};
