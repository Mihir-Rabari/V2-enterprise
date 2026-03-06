"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactMessage = void 0;
var mongoose_1 = require("mongoose");
var ContactMessageSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['UNREAD', 'READ'], default: 'UNREAD' },
    date: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'date', updatedAt: false } });
exports.ContactMessage = mongoose_1.default.model('ContactMessage', ContactMessageSchema);
