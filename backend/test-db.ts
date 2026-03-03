import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/v2_enterprise";

const test = async () => {
    try {
        console.log('Connecting to:', MONGODB_URI);
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connection successful!');
        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Connection failed:', error);
    }
};

test();
