"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Slider = void 0;
var mongoose_1 = require("mongoose");
var SliderSchema = new mongoose_1.Schema({
    type: { type: String, enum: ['PROMOTIONAL', 'CATEGORY', 'BEST_CATEGORY', 'NEW_ARRIVAL'], default: 'PROMOTIONAL' },
    image: { type: String },
    title: { type: String },
    subtitle: { type: String },
    buttonText: { type: String },
    text: { type: String },
    link: { type: String, default: '/shop' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
});
exports.Slider = mongoose_1.default.model('Slider', SliderSchema);
