import mongoose, { Schema, Document } from 'mongoose';

export interface IJournalPost extends Document {
    title: string;
    category: string;
    image: string;
    excerpt: string;
    date: Date;
    status: 'ACTIVE' | 'INACTIVE';
}

const JournalPostSchema = new Schema<IJournalPost>(
    {
        title: { type: String, required: true },
        category: { type: String, required: true },
        image: { type: String, required: true },
        excerpt: { type: String, required: true },
        date: { type: Date, default: Date.now },
        status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    },
    { timestamps: { createdAt: 'date', updatedAt: false } }
);

export const JournalPost = mongoose.model<IJournalPost>('JournalPost', JournalPostSchema);
