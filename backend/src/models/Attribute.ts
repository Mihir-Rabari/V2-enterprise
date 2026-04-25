import mongoose, { Schema, Document } from 'mongoose';

export interface IAttribute extends Document {
    name: string;
    key: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const AttributeSchema = new Schema<IAttribute>(
    {
        name: { type: String, required: true },
        key: { type: String, required: true, unique: true, lowercase: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const Attribute = mongoose.model<IAttribute>('Attribute', AttributeSchema);
