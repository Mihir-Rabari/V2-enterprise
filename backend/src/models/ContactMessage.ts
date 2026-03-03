import mongoose, { Schema, Document } from 'mongoose';

export interface IContactMessage extends Document {
    name: string;
    email: string;
    message: string;
    status: 'UNREAD' | 'READ';
    date: Date;
}

const ContactMessageSchema = new Schema<IContactMessage>(
    {
        name: { type: String, required: true },
        email: { type: String, required: true },
        message: { type: String, required: true },
        status: { type: String, enum: ['UNREAD', 'READ'], default: 'UNREAD' },
        date: { type: Date, default: Date.now },
    },
    { timestamps: { createdAt: 'date', updatedAt: false } }
);

export const ContactMessage = mongoose.model<IContactMessage>('ContactMessage', ContactMessageSchema);
