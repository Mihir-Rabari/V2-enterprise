"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Coupon = void 0;
var mongoose_1 = require("mongoose");
var CouponSchema = new mongoose_1.Schema({
    code: { type: String, required: true, unique: true, index: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true },
    minOrderValue: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date },
}, { timestamps: { createdAt: true, updatedAt: false } });
exports.Coupon = mongoose_1.default.model('Coupon', CouponSchema);
