import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    PORT: z.string().default('5000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    IMAGEKIT_PRIVATE_KEY: z.string().optional(),
    IMAGEKIT_PUBLIC_KEY: z.string().default('public_hSjP1AL0VjIG4B3MLK9KyOt0Y='),
    ADMIN_SECRET_CODE: z.string().min(6, 'ADMIN_SECRET_CODE is required'),
    FRONTEND_URL: z.string().default('https://v2enterprise.in').transform(s => s.split(',')),
    RAZORPAY_KEY_ID: z.string().min(1, 'RAZORPAY_KEY_ID is required'),
    RAZORPAY_KEY_SECRET: z.string().min(1, 'RAZORPAY_KEY_SECRET is required'),
    BACKEND_URL: z.string().default('https://v2enterprise.in'),
    UPLOAD_DIR: z.string().default('public/videos'),
    SMTP_EMAIL: z.string().email().optional(),
    SMTP_APP_PASSWORD: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsed.data;
