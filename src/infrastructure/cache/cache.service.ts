import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { CACHE_TTL, TCacheTTLKey } from './cache.constants';
import { TOKENS } from '@/container';
import { RedisService } from '@/config/services';
import { CacheKeyBuilder } from './cache-key.builder';

interface ICacheOptions {
  ttl?: number;
  ttlKey?: TCacheTTLKey;
}

interface ICacheGetOptions {
  parse?: boolean;
}

@singleton()
class CacheService extends BaseModule {
  constructor(
    @inject(TOKENS.RedisService)
    private readonly redisService: RedisService
  ) {
    super();
  }

  // ═══════════════════════════════════════════
  // Core Cache Operations
  // ═══════════════════════════════════════════

  /**
   * Get a value from cache
   */
  async get<T>(key: string, options: ICacheGetOptions = { parse: true }): Promise<T | null> {
    try {
      const value = await this.redisService.get(key);

      if (!value) return null;

      return options.parse ? JSON.parse(value) : (value as T);
    } catch (error) {
      this.logger.error('Error getting from cache:', error);
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, options: ICacheOptions): Promise<void> {
    try {
      const ttl = options.ttl || (options.ttlKey ? CACHE_TTL[options.ttlKey] : undefined);

      const serialized = typeof value === 'string' ? value : JSON.stringify(value);

      await this.redisService.set(key, serialized, ttl);
    } catch (error) {
      this.logger.error('Error setting in cache:', error);
    }
  }

  /**
   * Delete a specific key
   */
  async del(key: string): Promise<void> {
    try {
      await this.redisService.del(key);
    } catch (error) {
      this.logger.error('Error deleting from cache:', error);
    }
  }

  /**
   * Delete multiple keys
   */
  async delMany(keys: string[]): Promise<void> {
    try {
      const client = this.redisService.getClient();
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch (error) {
      this.logger.error('Error deleting from cache:', error);
    }
  }

  /**
   * Delete keys matching a pattern (use sparingly!)
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const client = this.redisService.getClient();
      const keys = await client.keys(pattern);

      if (keys.length > 0) {
        await client.del(...keys);
        this.logInfo(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      this.logError(`Cache pattern delete failed for: ${pattern}`, error);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    return this.redisService.exists(key);
  }

  // ═══════════════════════════════════════════
  // Cache-Aside Pattern Helpers
  // ═══════════════════════════════════════════

  /**
   * Get or set pattern - fetches from cache, or calls factory and caches result
   * @example
   * const story = await cacheService.getOrSet(
   *   CacheKeyBuilder.storyDetail(slug),
   *   () => this.storyRepo.findBySlug(slug),
   *   { ttlKey: 'STORY_DETAIL' }
   * );
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: ICacheOptions = {}
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      this.logInfo(`Cache hit for key: ${key}`);
      return cached;
    }

    // Call factory
    const value = await factory();
    this.logInfo(`Cache miss for key: ${key}`);

    // Cache if value exists
    if (value !== null && value !== undefined) {
      await this.set(key, value, options);
    }

    return value;
  }

  /**
   * Wrap an async function with caching
   */
  wrap<TArgs extends unknown[], TResult>(
    keyFactory: (...args: TArgs) => string,
    fn: (...args: TArgs) => Promise<TResult>,
    options: ICacheOptions = {}
  ): (...args: TArgs) => Promise<TResult> {
    return async (...args: TArgs): Promise<TResult> => {
      const key = keyFactory(...args);
      return this.getOrSet(key, () => fn(...args), options);
    };
  }

  // ═══════════════════════════════════════════
  // Invalidation Helpers
  // ═══════════════════════════════════════════

  /**
   * Invalidate story-related caches
   */
  async invalidateStory(slug: string): Promise<void> {
    const keys = CacheKeyBuilder.invalidateStory(slug);
    await this.delMany(keys);
    await this.delPattern(CacheKeyBuilder.invalidateAllStoryLists());
  }

  /**
   * Invalidate user-related caches
   */
  async invalidateUser(userId: string): Promise<void> {
    const keys = CacheKeyBuilder.invalidateUserData(userId);
    await this.delMany(keys);
  }

  /**
   * Invalidate chapter-related caches
   */
  async invalidateChapter(storySlug: string, chapterSlug: string): Promise<void> {
    await this.del(CacheKeyBuilder.chapterDetail(storySlug, chapterSlug));
    await this.del(CacheKeyBuilder.storyTree(storySlug));
  }
}

export { CacheService };
