import mongoose, { Schema, Document } from 'mongoose';

/**
 * One shopping-assistant conversation. History is kept server-side so the client can never
 * forge earlier assistant turns (e.g. a fake "I promised you 50% off"). Only plain text turns
 * are stored; tool calls are replayed inside a single request and then discarded.
 */
export interface IChatTurn {
    role: 'user' | 'assistant';
    text: string;
}

export interface IChatSession extends Document {
    sessionId: string;
    clientKey: string;
    turns: IChatTurn[];
    userTurnCount: number;
    blockedCount: number;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ChatTurnSchema = new Schema<IChatTurn>(
    {
        role: { type: String, enum: ['user', 'assistant'], required: true },
        text: { type: String, required: true },
    },
    { _id: false }
);

const ChatSessionSchema = new Schema<IChatSession>(
    {
        sessionId: { type: String, required: true, unique: true, index: true },
        clientKey: { type: String, required: true },
        turns: { type: [ChatTurnSchema], default: [] },
        userTurnCount: { type: Number, default: 0 },
        blockedCount: { type: Number, default: 0 },
        // TTL index: MongoDB deletes the session once this time passes.
        expiresAt: { type: Date, required: true, index: { expires: 0 } },
    },
    { timestamps: true }
);

export const ChatSession = mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);
