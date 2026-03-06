"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Order = void 0;
var mongoose_1 = require("mongoose");
var OrderItemSchema = new mongoose_1.Schema({
    productId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    productPhoto: { type: String, required: true },
    quantity: { type: Number, required: true },
    size: { type: String },
    color: { type: String },
    priceAtTime: { type: Number, required: true },
});
var OrderSchema = new mongoose_1.Schema({
    orderId: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [OrderItemSchema],
    total: { type: Number, required: true },
    method: { type: String, required: true },
    status: {
        type: String,
        enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'],
        default: 'PENDING'
    },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    awbNumber: { type: String },
    trackingLink: { type: String },
    waybill: { type: String },
    couponCode: { type: String },
    discount: { type: Number, default: 0 },
    razorpayPaymentId: { type: String },
    razorpayOrderId: { type: String },
    razorpaySignature: { type: String },
    paymentStatus: {
        type: String,
        enum: ['PENDING', 'PAID', 'FAILED'],
        default: 'PENDING'
    },
    failureReason: { type: String },
}, { timestamps: true });
exports.Order = mongoose_1.default.model('Order', OrderSchema);
