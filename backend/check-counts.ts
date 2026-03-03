import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product } from './src/models/Product';
import { Category } from './src/models/Category';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/v2_enterprise";

async function main() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const productCount = await Product.countDocuments();
        const categoryCount = await Category.countDocuments();
        console.log('Product Count:', productCount);
        console.log('Category Count:', categoryCount);

        const products = await Product.find();
        console.log('Products:', JSON.stringify(products, null, 2));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

main();
