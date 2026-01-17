import { inject, singleton } from 'tsyringe';
import Redis from 'ioredis';
import { TOKENS } from '@container/tokens';
import { ConfigService } from './config.service';
import { logger } from '@utils/logger';

@singleton()
class RedisService {
  private client: Redis | null = null;

  constructor(@inject(TOKENS.ConfigService) private readonly config: ConfigService) {}

  async connect(): Promise<void> {
    if (this.client) {
      logger.warn('Redis already connected');
      return;
    }

    this.client = new Redis({
      username: this.config.redisConfigs.username,
      password: this.config.redisConfigs.password,
      host: this.config.redisConfigs.host,
      port: this.config.redisConfigs.port,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      logger.info('Redis connected');
    });

    this.client.on('error', (error) => {
      logger.error('Redis error:', error);
    });
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      logger.info('Redis disconnected');
    }
  }

  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.getClient().get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.getClient().set(key, value, 'EX', ttlSeconds);
    } else {
      await this.getClient().set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.getClient().del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.getClient().exists(key);
    return result === 1;
  }
}

export { RedisService };
