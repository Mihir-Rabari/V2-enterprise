"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JournalPost = void 0;
var mongoose_1 = require("mongoose");
var JournalPostSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true },
    image: { type: String, required: true },
    excerpt: { type: String, required: true },
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
}, { timestamps: { createdAt: 'date', updatedAt: false } });
exports.JournalPost = mongoose_1.default.model('JournalPost', JournalPostSchema);
