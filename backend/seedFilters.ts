import mongoose from 'mongoose';
import { env } from './src/config/env';
import { Product } from './src/models/Product';
import { syncFiltersFromProducts } from './src/modules/filters/filters.service';

const seedFilters = async () => {
    try {
        await mongoose.connect(env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const products = await Product.find({});
        console.log(`📦 Found ${products.length} products to process.`);

        await syncFiltersFromProducts(products);
        console.log('🎯 Filters seeded successfully.');

        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
};

seedFilters();
