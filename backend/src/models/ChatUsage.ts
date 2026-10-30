import mongoose, { Schema, Document } from 'mongoose';

/** Per-UTC-day model spend for the shopping assistant, shared across all server instances. */
export interface IChatUsage extends Document {
    day: string; // YYYY-MM-DD (UTC)
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    costUsd: number;
    requests: number;
}

const ChatUsageSchema = new Schema<IChatUsage>({
    day: { type: String, required: true, unique: true, index: true },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    cacheReadTokens: { type: Number, default: 0 },
    cacheWriteTokens: { type: Number, default: 0 },
    costUsd: { type: Number, default: 0 },
    requests: { type: Number, default: 0 },
});

export const ChatUsage = mongoose.model<IChatUsage>('ChatUsage', ChatUsageSchema);
