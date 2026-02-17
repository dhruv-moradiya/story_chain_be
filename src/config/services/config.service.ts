import 'reflect-metadata';

import { registry, singleton } from 'tsyringe';
import { z } from 'zod';
import { TOKENS } from '@container/tokens';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),

  // Database
  MONGODB_URI: z.string(),

  // Redis
  // REDIS_URL: z.string(),

  REDIS_USERNAME: z.string(),
  REDIS_PASSWORD: z.string(),
  REDIS_HOST: z.string(),
  REDIS_PORT: z.string(),

  // CORS
  CORS_ORIGIN: z.string().default('*'),

  CLERK_PUBLISHABLE_KEY: z.string(),
  CLERK_SECRET_KEY: z.string(),
  CLERK_WEBHOOK_SECRET: z.string(),

  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),

  RAILWAY_URL: z.string().optional(),
});

type EnvConfig = z.infer<typeof envSchema>;

@singleton()
@registry([{ token: TOKENS.ConfigService, useClass: ConfigService }])
class ConfigService {
  private readonly config: EnvConfig;

  constructor() {
    this.config = envSchema.parse(process.env);
  }

  get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    return this.config[key];
  }

  get isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  get isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  get mongoUri(): string {
    return this.config.MONGODB_URI;
  }

  get redisConfigs() {
    return {
      username: this.config.REDIS_USERNAME,
      password: this.config.REDIS_PASSWORD,
      port: Number(this.config.REDIS_PORT),
      host: this.config.REDIS_HOST,
    };
  }
}

export { ConfigService };
