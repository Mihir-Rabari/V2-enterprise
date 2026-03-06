"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
var mongoose_1 = require("mongoose");
var AddressSchema = new mongoose_1.Schema({
    label: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
});
var UserSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    phone: { type: String },
    role: { type: String, enum: ['CUSTOMER', 'ADMIN'], default: 'CUSTOMER' },
    addresses: [AddressSchema],
    wishlist: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' }],
}, { timestamps: true });
exports.User = mongoose_1.default.model('User', UserSchema);
