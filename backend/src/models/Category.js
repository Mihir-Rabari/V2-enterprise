"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Category = void 0;
var mongoose_1 = require("mongoose");
var CategorySchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    image: { type: String },
    description: { type: String },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    parentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Category' },
}, { timestamps: true });
exports.Category = mongoose_1.default.model('Category', CategorySchema);
