import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/v2_enterprise";

async function main() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const collections = await mongoose.connection.db.listCollections().toArray();
        for (const col of collections) {
            console.log(`\n--- Collection: ${col.name} ---`);
            const indexes = await mongoose.connection.db.collection(col.name).indexes();
            console.log('Indexes:', JSON.stringify(indexes, null, 2));
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

main();
