"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Product = void 0;
var mongoose_1 = require("mongoose");
var ProductSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    discount: { type: String },
    photo: { type: String, required: true },
    photos: [{ type: String }],
    videoUrl: { type: String },
    hoverImage: { type: String },
    mainCategory: { type: String, required: true, index: true },
    subCategory: { type: String, required: true, index: true },
    styleCode: { type: String, required: false, index: true },
    color: { type: String, required: true },
    colorHex: { type: String },
    description: { type: String, required: true },
    materialCare: { type: String, required: true },
    sizes: [{ type: String }],
    variants: [
        {
            size: { type: String, required: true },
            color: { type: String },
            quantity: { type: Number, required: true, default: 0 },
            _id: false
        }
    ],
    patternType: { type: String },
    fabric: { type: String },
    collar: { type: String },
    sleeve: { type: String },
    neck: { type: String },
    pocket: { type: String },
    length: { type: String },
    chest: { type: String },
    waist: { type: String },
    shoulder: { type: String },
    sleeveLength: { type: String },
    isNewArrival: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    tags: [{ type: String }],
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
}, { timestamps: true });
exports.Product = mongoose_1.default.model('Product', ProductSchema);
