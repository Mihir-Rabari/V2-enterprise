"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeroSlide = void 0;
var mongoose_1 = require("mongoose");
var HeroSlideSchema = new mongoose_1.Schema({
    type: { type: String, enum: ['image', 'video'], default: 'image' },
    url: { type: String, required: true },
    tagline: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    ctaText: { type: String, required: true },
    ctaLink: { type: String, default: '/shop' },
    duration: { type: Number, default: 5000 },
    order: { type: Number, default: 0 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
});
exports.HeroSlide = mongoose_1.default.model('HeroSlide', HeroSlideSchema);
