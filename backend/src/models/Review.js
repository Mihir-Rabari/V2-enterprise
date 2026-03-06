"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Review = void 0;
var mongoose_1 = require("mongoose");
var ReviewSchema = new mongoose_1.Schema({
    productId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    reviewText: { type: String, required: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'INACTIVE' },
    homepageVisible: { type: Boolean, default: false },
    date: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'date', updatedAt: false } });
exports.Review = mongoose_1.default.model('Review', ReviewSchema);
