import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
    name: string;
    slug: string;
    image?: string;
    description?: string;
    status: 'ACTIVE' | 'INACTIVE';
    parentId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
    {
        name: { type: String, required: true },
        slug: { type: String, required: true, unique: true, index: true },
        image: { type: String },
        description: { type: String },
        status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
        parentId: { type: Schema.Types.ObjectId, ref: 'Category' },
    },
    { timestamps: true }
);

export const Category = mongoose.model<ICategory>('Category', CategorySchema);
