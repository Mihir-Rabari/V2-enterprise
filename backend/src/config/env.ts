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
    
    // Cloudflare R2 Credentials
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET_NAME: z.string().optional(),
    R2_PUBLIC_URL: z.string().optional(),
    // Verified legacy->canonical media mapping exported by `media-migrate export-mapping` (JSONL). Optional.
    MEDIA_MAPPING_FILE: z.string().optional(),

    // Shopping assistant (chat widget). The widget is disabled unless CHAT_ENABLED=true and the
    // selected provider's key is set.
    CHAT_ENABLED: z.string().default('false').transform(s => s === 'true'),
    // gemini: Gemini API via its OpenAI-compatible endpoint (default model gemini-3.8-flash).
    // bedrock-mantle: OpenAI-compatible Chat Completions on Amazon Bedrock (default model zai.glm-5).
    // anthropic: Claude API (default model claude-haiku-5-5).
    CHAT_PROVIDER: z.enum(['gemini', 'bedrock-mantle', 'anthropic']).default('bedrock-mantle'),
    // Optional override; when unset the provider's default model is used.
    CHAT_MODEL: z.string().optional(),
    // Google AI Studio API key.
    GEMINI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    // Amazon Bedrock API key. Supply through an untracked local env file or deployment secret.
    AWS_BEARER_TOKEN_BEDROCK: z.string().optional(),
    BEDROCK_REGION: z.string().default('ap-south-1'),
    // Hard ceiling on estimated model spend per UTC day, across all users. Chat returns 503 once reached.
    CHAT_DAILY_BUDGET_USD: z.coerce.number().positive().default(5),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsed.data;
