import mongoose, { Schema, Document } from 'mongoose';

/** Per-UTC-day model spend and assistant activity, shared across all server instances. */
export interface IChatUsage extends Document {
    day: string; // YYYY-MM-DD (UTC)
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    costUsd: number;
    /** Model API calls (classifier + every assistant round). */
    requests: number;
    /** Shopper messages that reached the model or the pending-add fast path. */
    messages: number;
    /** Tool calls the assistant made. toolCalls / messages = tools per message. */
    toolCalls: number;
    /** Assistant model rounds. modelRounds / messages = rounds per message. */
    modelRounds: number;
    searches: number;
    /** Searches that found nothing. emptySearches / searches = empty search rate. */
    emptySearches: number;
    /** Messages blocked by the heuristic, classifier or output validation. */
    blockedMessages: number;
    /** Confirmations served from a pending offer without any model call. */
    fastConfirms: number;
}

const counter = { type: Number, default: 0 };

const ChatUsageSchema = new Schema<IChatUsage>({
    day: { type: String, required: true, unique: true, index: true },
    inputTokens: counter,
    outputTokens: counter,
    cacheReadTokens: counter,
    cacheWriteTokens: counter,
    costUsd: counter,
    requests: counter,
    messages: counter,
    toolCalls: counter,
    modelRounds: counter,
    searches: counter,
    emptySearches: counter,
    blockedMessages: counter,
    fastConfirms: counter,
});

export const ChatUsage = mongoose.model<IChatUsage>('ChatUsage', ChatUsageSchema);
