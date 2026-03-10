import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product } from './src/models/Product';

dotenv.config();

async function checkProducts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        const products = await Product.find({}).limit(5);
        // console.log('Sample Products Statuses:');
        products.forEach(p => {
            // console.log(`- ID: ${p._id}, Name: ${p.name}, Status: ${p.status}`);
        });

        const activeCount = await Product.countDocuments({ status: 'ACTIVE' });
        const inactiveCount = await Product.countDocuments({ status: 'INACTIVE' });
        const otherCount = await Product.countDocuments({ status: { $nin: ['ACTIVE', 'INACTIVE'] } });

        // console.log('\nSummary:');
        // console.log(`ACTIVE: ${activeCount}`);
        // console.log(`INACTIVE: ${inactiveCount}`);
        // console.log(`Other: ${otherCount}`);

        if (otherCount > 0) {
            const others = await Product.find({ status: { $nin: ['ACTIVE', 'INACTIVE'] } });
            // console.log('Sample "Other" Statuses:', others.map(o => o.status));
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkProducts();
