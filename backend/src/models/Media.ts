import mongoose, { Schema, Document } from 'mongoose';

export interface IMedia extends Document {
    url: string;
    fileId: string;
    name: string;
    size?: number;
    mimeType?: string;
    folder?: string;
    status: 'ACTIVE' | 'INACTIVE';
}

const MediaSchema = new Schema<IMedia>(
    {
        url: { type: String, required: true },
        fileId: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        size: { type: Number },
        mimeType: { type: String },
        folder: { type: String, default: '/v2-uploads' },
        status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    },
    { timestamps: true }
);

export const Media = mongoose.model<IMedia>('Media', MediaSchema);
