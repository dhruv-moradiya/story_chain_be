import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),

  // Database
  MONGODB_URI: z.string(),

  // Redis
  // REDIS_URL: z.string(),

  // CORS
  CORS_ORIGIN: z.string().default('*'),

  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),

  RAILWAY_URL: z.string(),
});

export const env = envSchema.parse(process.env);
