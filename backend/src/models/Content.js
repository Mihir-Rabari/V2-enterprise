"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Content = void 0;
var mongoose_1 = require("mongoose");
var ContentSchema = new mongoose_1.Schema({
    type: { type: String, enum: ['TAGLINE', 'SOCIAL_POST', 'LOOKBOOK_ITEM', 'FEATURE_ITEM', 'PAGE', 'LOGO', 'BESTSELLER_HEADING', 'MARQUEE'], required: true },
    text: { type: String },
    image: { type: String },
    category: { type: String },
    likes: { type: String },
    caption: { type: String },
    colSpan: { type: Number },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
}, { timestamps: true });
exports.Content = mongoose_1.default.model('Content', ContentSchema);
