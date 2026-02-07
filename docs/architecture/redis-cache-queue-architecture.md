# Redis Caching, Queue System & Scheduled Jobs Architecture

> **Project:** StoryChain Backend  
> **Date:** February 7, 2026  
> **Status:** Architecture Proposal

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Project Analysis](#current-project-analysis)
3. [Proposed Folder Structure](#proposed-folder-structure)
4. [Cache Key Strategy](#cache-key-strategy)
5. [Class Architecture](#class-architecture)
6. [Implementation Details](#implementation-details)
7. [Integration Guide](#integration-guide)
8. [Best Practices](#best-practices)

---

## 🎯 Executive Summary

This document outlines the architecture for implementing:

- **Redis Caching** - High-performance data caching with intelligent key management
- **BullMQ Queue System** - Robust job processing for async operations
- **Scheduled Jobs** - Cron-based recurring tasks

The architecture follows your existing patterns:

- **tsyringe** for dependency injection
- **Singleton pattern** for services
- **BaseModule** inheritance for shared functionality
- **Token-based DI registration**

---

## 🔍 Current Project Analysis

### Existing Structure

```
src/
├── config/
│   └── services/
│       ├── config.service.ts      ✅ Configuration management
│       ├── database.service.ts    ✅ MongoDB connection
│       └── redis.service.ts       ✅ Basic Redis connection (exists)
├── container/
│   ├── tokens.ts                  ✅ DI tokens defined (CacheService, QueueService)
│   └── registry.ts                ✅ Service registration
├── shared/
│   └── services/
│       ├── cache.service.ts       ⚠️ Empty file (to implement)
│       ├── queue.service.ts       ⚠️ Empty file (to implement)
│       └── email.service.ts       ⚠️ Empty file (to implement)
├── jobs/
│   ├── email.job.ts               ⚠️ Empty file (to implement)
│   └── scheduled.job.ts           ⚠️ Empty file (to implement)
├── constants/
│   └── queues.ts                  ⚠️ Empty file (to implement)
└── utils/
    └── redis.helper.ts            ⚠️ Empty file (to implement)
```

### What Already Exists

1. ✅ Redis connection service (`RedisService`)
2. ✅ DI tokens for `CacheService` and `QueueService`
3. ✅ BullMQ and ioredis packages installed
4. ✅ Jobs folder structure
5. ✅ BaseModule for service inheritance

---

## 📁 Proposed Folder Structure

### Complete Infrastructure Structure

```
src/
├── config/
│   └── services/
│       ├── config.service.ts
│       ├── database.service.ts
│       └── redis.service.ts           # Keep as-is (low-level Redis)
│
├── infrastructure/                     # 🆕 NEW - Infrastructure layer
│   ├── cache/
│   │   ├── index.ts                   # Export barrel
│   │   ├── cache.service.ts           # Main cache service class
│   │   ├── cache.constants.ts         # TTL values, prefixes
│   │   ├── cache-key.builder.ts       # Key generation utility
│   │   └── decorators/
│   │       └── cacheable.decorator.ts # Method caching decorator (optional)
│   │
│   ├── queue/
│   │   ├── index.ts
│   │   ├── queue.service.ts           # Queue manager service
│   │   ├── queue.constants.ts         # Queue names, job options
│   │   ├── queue.types.ts             # Job payload interfaces
│   │   └── processors/                # Job processors
│   │       ├── index.ts
│   │       ├── email.processor.ts
│   │       ├── notification.processor.ts
│   │       └── analytics.processor.ts
│   │
│   └── scheduler/
│       ├── index.ts
│       ├── scheduler.service.ts       # Scheduler manager
│       ├── scheduler.constants.ts     # Cron patterns, job names
│       └── jobs/                      # Scheduled job definitions
│           ├── index.ts
│           ├── cleanup.job.ts         # Old data cleanup
│           ├── analytics.job.ts       # Stats aggregation
│           └── health-check.job.ts    # System health checks
│
├── container/
│   ├── tokens.ts                      # Add new infrastructure tokens
│   └── registry.ts                    # Register new services
│
├── constants/
│   └── cache-keys.ts                  # 🆕 Cache key enums/constants
│
└── shared/
    └── services/
        └── (move to infrastructure/)  # Deprecated - use infrastructure/
```

### Why This Structure?

1. **Separation of Concerns**: Infrastructure code is isolated from business logic
2. **Scalability**: Easy to add new processors and jobs
3. **Testability**: Each component can be tested independently
4. **Consistency**: Follows your existing patterns (services, types, constants)

---

## 🔑 Cache Key Strategy

### Key Naming Convention

```
{service}:{entity}:{identifier}:{variant?}
```

### Examples

| Key Pattern                    | Example                        | Description               |
| ------------------------------ | ------------------------------ | ------------------------- |
| `story:detail:{slug}`          | `story:detail:my-adventure`    | Single story by slug      |
| `story:list:published`         | `story:list:published`         | List of published stories |
| `story:list:user:{userId}`     | `story:list:user:user_123`     | User's stories            |
| `chapter:tree:{storySlug}`     | `chapter:tree:my-adventure`    | Story's chapter tree      |
| `user:profile:{clerkId}`       | `user:profile:clerk_abc`       | User profile data         |
| `notification:unread:{userId}` | `notification:unread:user_123` | Unread count              |

### Cache Key Builder Class

```typescript
// src/infrastructure/cache/cache-key.builder.ts

export type CacheEntity =
  | 'story'
  | 'chapter'
  | 'user'
  | 'notification'
  | 'collaborator'
  | 'reading-history'
  | 'autosave';

export type CacheOperation =
  | 'detail'
  | 'list'
  | 'tree'
  | 'count'
  | 'search'
  | 'overview'
  | 'settings';

interface KeyBuilderOptions {
  entity: CacheEntity;
  operation: CacheOperation;
  identifiers?: Record<string, string | number>;
  variant?: string;
}

export class CacheKeyBuilder {
  private static readonly SEPARATOR = ':';
  private static readonly APP_PREFIX = 'sc'; // StoryChain

  /**
   * Build a cache key with consistent format
   * @example CacheKeyBuilder.build({ entity: 'story', operation: 'detail', identifiers: { slug: 'my-story' } })
   * // Returns: "sc:story:detail:slug=my-story"
   */
  static build(options: KeyBuilderOptions): string {
    const { entity, operation, identifiers, variant } = options;

    const parts: string[] = [this.APP_PREFIX, entity, operation];

    // Add sorted identifiers for consistency
    if (identifiers) {
      const sortedKeys = Object.keys(identifiers).sort();
      for (const key of sortedKeys) {
        parts.push(`${key}=${identifiers[key]}`);
      }
    }

    // Add variant if present
    if (variant) {
      parts.push(variant);
    }

    return parts.join(this.SEPARATOR);
  }

  /**
   * Build pattern for cache invalidation (wildcards)
   * @example CacheKeyBuilder.pattern({ entity: 'story' })
   * // Returns: "sc:story:*"
   */
  static pattern(options: Partial<KeyBuilderOptions>): string {
    const { entity, operation } = options;

    const parts: string[] = [this.APP_PREFIX];

    if (entity) {
      parts.push(entity);
      if (operation) {
        parts.push(operation);
      }
    }

    parts.push('*');
    return parts.join(this.SEPARATOR);
  }

  // ═══════════════════════════════════════════
  // Convenience methods for common keys
  // ═══════════════════════════════════════════

  static storyDetail(slug: string): string {
    return this.build({ entity: 'story', operation: 'detail', identifiers: { slug } });
  }

  static storyTree(slug: string): string {
    return this.build({ entity: 'story', operation: 'tree', identifiers: { slug } });
  }

  static storyOverview(slug: string): string {
    return this.build({ entity: 'story', operation: 'overview', identifiers: { slug } });
  }

  static storyList(variant: 'published' | 'new' | 'featured'): string {
    return this.build({ entity: 'story', operation: 'list', variant });
  }

  static userStories(userId: string): string {
    return this.build({ entity: 'story', operation: 'list', identifiers: { userId } });
  }

  static chapterDetail(storySlug: string, chapterSlug: string): string {
    return this.build({
      entity: 'chapter',
      operation: 'detail',
      identifiers: { storySlug, chapterSlug },
    });
  }

  static userProfile(clerkId: string): string {
    return this.build({ entity: 'user', operation: 'detail', identifiers: { clerkId } });
  }

  static notificationCount(userId: string): string {
    return this.build({ entity: 'notification', operation: 'count', identifiers: { userId } });
  }

  static readingHistory(userId: string, storySlug: string): string {
    return this.build({
      entity: 'reading-history',
      operation: 'detail',
      identifiers: { userId, storySlug },
    });
  }

  // ═══════════════════════════════════════════
  // Invalidation patterns
  // ═══════════════════════════════════════════

  static invalidateStory(slug: string): string[] {
    return [
      this.storyDetail(slug),
      this.storyTree(slug),
      this.storyOverview(slug),
      this.pattern({ entity: 'chapter', operation: 'detail' }), // All chapters of story
    ];
  }

  static invalidateAllStoryLists(): string {
    return this.pattern({ entity: 'story', operation: 'list' });
  }

  static invalidateUserData(userId: string): string[] {
    return [this.userProfile(userId), this.userStories(userId), this.notificationCount(userId)];
  }
}
```

### Cache TTL Constants

```typescript
// src/infrastructure/cache/cache.constants.ts

export const CACHE_TTL = {
  // Frequently accessed, rarely changes
  STORY_DETAIL: 60 * 60, // 1 hour
  STORY_OVERVIEW: 60 * 30, // 30 minutes
  USER_PROFILE: 60 * 60, // 1 hour

  // Lists that may change more often
  STORY_LIST_PUBLISHED: 60 * 10, // 10 minutes
  STORY_LIST_NEW: 60 * 5, // 5 minutes
  STORY_TREE: 60 * 15, // 15 minutes

  // User-specific data
  NOTIFICATION_COUNT: 60 * 2, // 2 minutes
  READING_HISTORY: 60 * 5, // 5 minutes

  // Short-lived
  SEARCH_RESULTS: 60 * 3, // 3 minutes
  RATE_LIMIT: 60, // 1 minute
} as const;

export type CacheTTLKey = keyof typeof CACHE_TTL;
```

---

## 🏗️ Class Architecture

### 1. Cache Service

```typescript
// src/infrastructure/cache/cache.service.ts

import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { RedisService } from '@config/services/redis.service';
import { BaseModule } from '@utils/baseClass';
import { CacheKeyBuilder } from './cache-key.builder';
import { CACHE_TTL, CacheTTLKey } from './cache.constants';
import { logger } from '@utils/logger';

interface CacheOptions {
  ttl?: number;
  ttlKey?: CacheTTLKey;
}

interface CacheGetOptions {
  parse?: boolean;
}

@singleton()
export class CacheService extends BaseModule {
  constructor(
    @inject(TOKENS.RedisService)
    private readonly redis: RedisService
  ) {
    super();
  }

  // ═══════════════════════════════════════════
  // Core Cache Operations
  // ═══════════════════════════════════════════

  /**
   * Get a value from cache
   */
  async get<T>(key: string, options: CacheGetOptions = { parse: true }): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;

      return options.parse ? JSON.parse(value) : (value as T);
    } catch (error) {
      this.logError(`Cache get failed for key: ${key}`, error);
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      const ttl = options.ttl || (options.ttlKey ? CACHE_TTL[options.ttlKey] : undefined);
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);

      await this.redis.set(key, serialized, ttl);
    } catch (error) {
      this.logError(`Cache set failed for key: ${key}`, error);
    }
  }

  /**
   * Delete a specific key
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logError(`Cache delete failed for key: ${key}`, error);
    }
  }

  /**
   * Delete multiple keys
   */
  async delMany(keys: string[]): Promise<void> {
    try {
      const client = this.redis.getClient();
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch (error) {
      this.logError(`Cache delete many failed`, error);
    }
  }

  /**
   * Delete keys matching a pattern (use sparingly!)
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const client = this.redis.getClient();
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
    return this.redis.exists(key);
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
    options: CacheOptions = {}
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Call factory
    const value = await factory();

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
    options: CacheOptions = {}
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
```

### 2. Queue Service

```typescript
// src/infrastructure/queue/queue.service.ts

import { inject, singleton } from 'tsyringe';
import { Queue, Worker, Job, QueueEvents, JobsOptions } from 'bullmq';
import { TOKENS } from '@container/tokens';
import { RedisService } from '@config/services/redis.service';
import { BaseModule } from '@utils/baseClass';
import { QUEUE_NAMES, DEFAULT_JOB_OPTIONS } from './queue.constants';
import { JobPayload, JobResult, QueueName } from './queue.types';
import { logger } from '@utils/logger';

@singleton()
export class QueueService extends BaseModule {
  private queues: Map<QueueName, Queue> = new Map();
  private workers: Map<QueueName, Worker> = new Map();
  private events: Map<QueueName, QueueEvents> = new Map();

  constructor(
    @inject(TOKENS.RedisService)
    private readonly redis: RedisService
  ) {
    super();
  }

  // ═══════════════════════════════════════════
  // Initialization
  // ═══════════════════════════════════════════

  async initialize(): Promise<void> {
    this.logInfo('Initializing queue service...');

    const connection = {
      host: this.redis.getClient().options.host,
      port: this.redis.getClient().options.port,
      password: this.redis.getClient().options.password,
      username: this.redis.getClient().options.username,
    };

    // Initialize all queues
    for (const queueName of Object.values(QUEUE_NAMES)) {
      const queue = new Queue(queueName, { connection });
      this.queues.set(queueName, queue);

      const events = new QueueEvents(queueName, { connection });
      this.events.set(queueName, events);

      this.logInfo(`Queue "${queueName}" initialized`);
    }
  }

  async destroy(): Promise<void> {
    this.logInfo('Shutting down queue service...');

    // Close all workers
    for (const [name, worker] of this.workers) {
      await worker.close();
      this.logInfo(`Worker "${name}" closed`);
    }

    // Close all events
    for (const [name, events] of this.events) {
      await events.close();
    }

    // Close all queues
    for (const [name, queue] of this.queues) {
      await queue.close();
      this.logInfo(`Queue "${name}" closed`);
    }
  }

  // ═══════════════════════════════════════════
  // Queue Operations
  // ═══════════════════════════════════════════

  /**
   * Add a job to a queue
   */
  async addJob<T extends QueueName>(
    queueName: T,
    data: JobPayload[T],
    options?: JobsOptions
  ): Promise<Job<JobPayload[T]>> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue "${queueName}" not found`);
    }

    const job = await queue.add(queueName, data, { ...DEFAULT_JOB_OPTIONS, ...options });

    this.logInfo(`Job added to queue "${queueName}": ${job.id}`);
    return job;
  }

  /**
   * Add multiple jobs in bulk
   */
  async addBulkJobs<T extends QueueName>(
    queueName: T,
    jobs: Array<{ data: JobPayload[T]; options?: JobsOptions }>
  ): Promise<Job<JobPayload[T]>[]> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue "${queueName}" not found`);
    }

    const bulkJobs = jobs.map((j) => ({
      name: queueName,
      data: j.data,
      opts: { ...DEFAULT_JOB_OPTIONS, ...j.options },
    }));

    return queue.addBulk(bulkJobs);
  }

  /**
   * Get a queue by name
   */
  getQueue(queueName: QueueName): Queue | undefined {
    return this.queues.get(queueName);
  }

  // ═══════════════════════════════════════════
  // Worker Management
  // ═══════════════════════════════════════════

  /**
   * Register a worker/processor for a queue
   */
  registerProcessor<T extends QueueName>(
    queueName: T,
    processor: (job: Job<JobPayload[T]>) => Promise<JobResult[T]>,
    options?: { concurrency?: number }
  ): void {
    if (this.workers.has(queueName)) {
      this.logInfo(`Worker for "${queueName}" already exists, replacing...`);
      this.workers.get(queueName)?.close();
    }

    const connection = {
      host: this.redis.getClient().options.host,
      port: this.redis.getClient().options.port,
      password: this.redis.getClient().options.password,
      username: this.redis.getClient().options.username,
    };

    const worker = new Worker(
      queueName,
      async (job) => {
        this.logInfo(`Processing job ${job.id} from queue "${queueName}"`);
        try {
          const result = await processor(job);
          this.logInfo(`Job ${job.id} completed successfully`);
          return result;
        } catch (error) {
          this.logError(`Job ${job.id} failed`, error);
          throw error;
        }
      },
      {
        connection,
        concurrency: options?.concurrency ?? 5,
      }
    );

    worker.on('failed', (job, err) => {
      this.logError(`Job ${job?.id} failed in queue "${queueName}"`, err);
    });

    worker.on('error', (err) => {
      this.logError(`Worker error in queue "${queueName}"`, err);
    });

    this.workers.set(queueName, worker);
    this.logInfo(`Worker registered for queue "${queueName}"`);
  }

  // ═══════════════════════════════════════════
  // Convenience Methods
  // ═══════════════════════════════════════════

  /**
   * Send an email job
   */
  async sendEmail(payload: JobPayload['email']): Promise<Job> {
    return this.addJob('email', payload);
  }

  /**
   * Send a notification job
   */
  async sendNotification(payload: JobPayload['notification']): Promise<Job> {
    return this.addJob('notification', payload);
  }

  /**
   * Queue analytics event
   */
  async trackAnalytics(payload: JobPayload['analytics']): Promise<Job> {
    return this.addJob('analytics', payload);
  }
}
```

### 3. Queue Types & Constants

```typescript
// src/infrastructure/queue/queue.types.ts

export const QUEUE_NAMES = {
  EMAIL: 'email',
  NOTIFICATION: 'notification',
  ANALYTICS: 'analytics',
  CLEANUP: 'cleanup',
  EXPORT: 'export',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ═══════════════════════════════════════════
// Job Payloads
// ═══════════════════════════════════════════

export interface EmailJobPayload {
  to: string;
  subject: string;
  template: 'welcome' | 'password-reset' | 'collaboration-invite' | 'notification-digest';
  context: Record<string, unknown>;
}

export interface NotificationJobPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsJobPayload {
  event: string;
  userId?: string;
  properties: Record<string, unknown>;
  timestamp: Date;
}

export interface CleanupJobPayload {
  type: 'autosave' | 'sessions' | 'notifications' | 'logs';
  olderThan: Date;
  dryRun?: boolean;
}

export interface ExportJobPayload {
  userId: string;
  storyId: string;
  format: 'pdf' | 'epub' | 'markdown';
}

// ═══════════════════════════════════════════
// Type mappings
// ═══════════════════════════════════════════

export interface JobPayload {
  email: EmailJobPayload;
  notification: NotificationJobPayload;
  analytics: AnalyticsJobPayload;
  cleanup: CleanupJobPayload;
  export: ExportJobPayload;
}

export interface JobResult {
  email: { sent: boolean; messageId?: string };
  notification: { delivered: boolean; notificationId: string };
  analytics: { recorded: boolean };
  cleanup: { deletedCount: number };
  export: { fileUrl: string; expiresAt: Date };
}
```

```typescript
// src/infrastructure/queue/queue.constants.ts

import { JobsOptions } from 'bullmq';

export { QUEUE_NAMES } from './queue.types';

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
  removeOnComplete: {
    count: 100,
    age: 24 * 60 * 60, // 24 hours
  },
  removeOnFail: {
    count: 500,
    age: 7 * 24 * 60 * 60, // 7 days
  },
};

export const QUEUE_SETTINGS = {
  email: {
    concurrency: 10,
    limiter: {
      max: 100,
      duration: 60000, // 100 emails per minute
    },
  },
  notification: {
    concurrency: 20,
  },
  analytics: {
    concurrency: 50,
  },
  cleanup: {
    concurrency: 1,
  },
  export: {
    concurrency: 3,
  },
} as const;
```

### 4. Scheduler Service

```typescript
// src/infrastructure/scheduler/scheduler.service.ts

import { inject, singleton } from 'tsyringe';
import { Queue, QueueScheduler } from 'bullmq';
import { TOKENS } from '@container/tokens';
import { RedisService } from '@config/services/redis.service';
import { BaseModule } from '@utils/baseClass';
import { SCHEDULED_JOBS } from './scheduler.constants';

@singleton()
export class SchedulerService extends BaseModule {
  private schedulerQueue: Queue | null = null;

  constructor(
    @inject(TOKENS.RedisService)
    private readonly redis: RedisService
  ) {
    super();
  }

  async initialize(): Promise<void> {
    this.logInfo('Initializing scheduler service...');

    const connection = {
      host: this.redis.getClient().options.host,
      port: this.redis.getClient().options.port,
      password: this.redis.getClient().options.password,
      username: this.redis.getClient().options.username,
    };

    this.schedulerQueue = new Queue('scheduled-jobs', { connection });

    // Register all scheduled jobs
    for (const job of SCHEDULED_JOBS) {
      await this.schedulerQueue.upsertJobScheduler(
        job.name,
        { pattern: job.cron },
        {
          name: job.name,
          data: job.data || {},
          opts: job.options,
        }
      );
      this.logInfo(`Scheduled job "${job.name}" registered with cron: ${job.cron}`);
    }
  }

  async destroy(): Promise<void> {
    if (this.schedulerQueue) {
      await this.schedulerQueue.close();
    }
  }

  /**
   * Add or update a scheduled job dynamically
   */
  async upsertScheduledJob(
    name: string,
    cron: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    if (!this.schedulerQueue) {
      throw new Error('Scheduler not initialized');
    }

    await this.schedulerQueue.upsertJobScheduler(
      name,
      { pattern: cron },
      { name, data: data || {} }
    );

    this.logInfo(`Scheduled job "${name}" upserted with cron: ${cron}`);
  }

  /**
   * Remove a scheduled job
   */
  async removeScheduledJob(name: string): Promise<void> {
    if (!this.schedulerQueue) {
      throw new Error('Scheduler not initialized');
    }

    await this.schedulerQueue.removeJobScheduler(name);
    this.logInfo(`Scheduled job "${name}" removed`);
  }
}
```

```typescript
// src/infrastructure/scheduler/scheduler.constants.ts

import { JobsOptions } from 'bullmq';

interface ScheduledJobConfig {
  name: string;
  cron: string;
  data?: Record<string, unknown>;
  options?: JobsOptions;
  description: string;
}

export const SCHEDULED_JOBS: ScheduledJobConfig[] = [
  {
    name: 'cleanup-old-autosaves',
    cron: '0 3 * * *', // Every day at 3 AM
    data: { type: 'autosave', daysOld: 30 },
    description: 'Remove autosaves older than 30 days',
  },
  {
    name: 'cleanup-expired-sessions',
    cron: '0 4 * * *', // Every day at 4 AM
    data: { type: 'sessions' },
    description: 'Remove expired user sessions',
  },
  {
    name: 'aggregate-daily-stats',
    cron: '0 0 * * *', // Every day at midnight
    data: { type: 'daily' },
    description: 'Aggregate daily statistics',
  },
  {
    name: 'cleanup-old-notifications',
    cron: '0 5 * * 0', // Every Sunday at 5 AM
    data: { type: 'notifications', daysOld: 90 },
    description: 'Remove read notifications older than 90 days',
  },
  {
    name: 'refresh-trending-stories',
    cron: '*/30 * * * *', // Every 30 minutes
    data: {},
    description: 'Recalculate trending stories cache',
  },
  {
    name: 'health-check',
    cron: '*/5 * * * *', // Every 5 minutes
    data: {},
    description: 'System health check',
  },
];

export const CRON_PATTERNS = {
  EVERY_MINUTE: '* * * * *',
  EVERY_5_MINUTES: '*/5 * * * *',
  EVERY_15_MINUTES: '*/15 * * * *',
  EVERY_30_MINUTES: '*/30 * * * *',
  EVERY_HOUR: '0 * * * *',
  EVERY_DAY_MIDNIGHT: '0 0 * * *',
  EVERY_DAY_3AM: '0 3 * * *',
  EVERY_SUNDAY: '0 0 * * 0',
  EVERY_MONDAY: '0 9 * * 1',
} as const;
```

### 5. Job Processor Example

```typescript
// src/infrastructure/queue/processors/email.processor.ts

import { Job } from 'bullmq';
import { BaseModule } from '@utils/baseClass';
import { EmailJobPayload, JobResult } from '../queue.types';

export class EmailProcessor extends BaseModule {
  async process(job: Job<EmailJobPayload>): Promise<JobResult['email']> {
    const { to, subject, template, context } = job.data;

    this.logInfo(`Processing email job: ${job.id}`, { to, subject, template });

    try {
      // TODO: Integrate with your email service (nodemailer, etc.)
      // const result = await this.emailService.send({ to, subject, template, context });

      // Simulated success for now
      await new Promise((resolve) => setTimeout(resolve, 100));

      return {
        sent: true,
        messageId: `msg_${Date.now()}`,
      };
    } catch (error) {
      this.logError(`Failed to send email to ${to}`, error);
      throw error;
    }
  }
}
```

---

## 🔌 Integration Guide

### 1. Update Container Tokens

```typescript
// src/container/tokens.ts - Add these new tokens

export const TOKENS = {
  // ... existing tokens ...

  // ═══════════════════════════════════════════
  // INFRASTRUCTURE SERVICES
  // ═══════════════════════════════════════════
  CacheService: Symbol.for('CacheService'),
  QueueService: Symbol.for('QueueService'),
  SchedulerService: Symbol.for('SchedulerService'),
} as const;
```

### 2. Update Registry

```typescript
// src/container/registry.ts - Add registrations

import { CacheService } from '@infrastructure/cache/cache.service';
import { QueueService } from '@infrastructure/queue/queue.service';
import { SchedulerService } from '@infrastructure/scheduler/scheduler.service';

export function registerServices(): void {
  // ... existing registrations ...

  // ═══════════════════════════════════════════
  // INFRASTRUCTURE SERVICES
  // ═══════════════════════════════════════════
  container.register(TOKENS.CacheService, { useClass: CacheService });
  container.register(TOKENS.QueueService, { useClass: QueueService });
  container.register(TOKENS.SchedulerService, { useClass: SchedulerService });
}
```

### 3. Update Server Startup

```typescript
// src/server.ts

import type { QueueService } from '@infrastructure/queue/queue.service';
import type { SchedulerService } from '@infrastructure/scheduler/scheduler.service';

const start = async () => {
  try {
    // Connect to databases
    const databaseService = container.resolve<DatabaseService>(TOKENS.DatabaseService);
    await databaseService.connect();

    const redisService = container.resolve<RedisService>(TOKENS.RedisService);
    await redisService.connect();

    // 🆕 Initialize queue service
    const queueService = container.resolve<QueueService>(TOKENS.QueueService);
    await queueService.initialize();

    // 🆕 Initialize scheduler service
    const schedulerService = container.resolve<SchedulerService>(TOKENS.SchedulerService);
    await schedulerService.initialize();

    // 🆕 Register job processors
    await registerJobProcessors(queueService);

    // Create and start app
    const app = await createApp();
    await app.listen({ port: env.PORT, host: env.HOST });

    logger.info(`🚀 Server running on http://localhost:${env.PORT}`);
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};
```

### 4. Using Cache in Services

```typescript
// Example: src/features/story/services/story-query.service.ts

import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { CacheService } from '@infrastructure/cache/cache.service';
import { CacheKeyBuilder } from '@infrastructure/cache/cache-key.builder';
import { CACHE_TTL } from '@infrastructure/cache/cache.constants';

@singleton()
class StoryQueryService extends BaseModule {
  constructor(
    @inject(TOKENS.StoryRepository)
    private readonly storyRepo: StoryRepository,
    @inject(TOKENS.CacheService)
    private readonly cache: CacheService
  ) {
    super();
  }

  async getBySlug(slug: string): Promise<IStory> {
    const cacheKey = CacheKeyBuilder.storyDetail(slug);

    // Use cache-aside pattern
    const story = await this.cache.getOrSet(cacheKey, () => this.storyRepo.findBySlug(slug), {
      ttl: CACHE_TTL.STORY_DETAIL,
    });

    if (!story) {
      this.throwNotFoundError('Story not found');
    }

    return story;
  }

  async getStoryOverviewBySlug(slug: string): Promise<IStoryWithCreator> {
    const cacheKey = CacheKeyBuilder.storyOverview(slug);

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const pipeline = new StoryPipelineBuilder().findBySlug(slug).attachCollaborators().build();

        const stories = await this.storyRepo.aggregateStories<IStoryWithCreator>(pipeline);
        return stories[0] || null;
      },
      { ttl: CACHE_TTL.STORY_OVERVIEW }
    );
  }
}
```

### 5. Using Queues in Services

```typescript
// Example: src/features/notification/services/notification.service.ts

import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { QueueService } from '@infrastructure/queue/queue.service';

@singleton()
class NotificationService extends BaseModule {
  constructor(
    @inject(TOKENS.NotificationRepository)
    private readonly notificationRepo: NotificationRepository,
    @inject(TOKENS.QueueService)
    private readonly queueService: QueueService
  ) {
    super();
  }

  async createNotification(data: CreateNotificationDto): Promise<INotification> {
    // Create notification in database
    const notification = await this.notificationRepo.create(data);

    // Queue delivery (push notification, email digest, etc.)
    await this.queueService.sendNotification({
      userId: data.recipientId,
      type: data.type,
      title: data.title,
      message: data.message,
      actionUrl: data.actionUrl,
      metadata: { notificationId: notification._id.toString() },
    });

    return notification;
  }
}
```

---

## ✅ Best Practices

### Cache Best Practices

1. **Always use the key builder** - Never hardcode cache keys
2. **Set appropriate TTLs** - Balance freshness vs. performance
3. **Invalidate on writes** - Always invalidate after create/update/delete
4. **Handle cache failures gracefully** - Don't let cache errors break the app
5. **Use patterns sparingly** - `keys()` and pattern deletion are expensive

### Queue Best Practices

1. **Keep payloads small** - Don't store large objects in job data
2. **Idempotent processors** - Jobs may be retried; design for it
3. **Set reasonable retries** - Don't retry forever
4. **Monitor queue health** - Set up alerts for failed jobs
5. **Use dead letter queues** - Don't lose failed jobs

### Scheduler Best Practices

1. **Stagger jobs** - Don't schedule everything at midnight
2. **Use appropriate intervals** - Don't schedule heavy jobs too frequently
3. **Lock concurrent runs** - Prevent duplicate job execution
4. **Log job execution** - Track when jobs run and results

---

## 📊 Summary

| Component          | Location                               | Purpose                                |
| ------------------ | -------------------------------------- | -------------------------------------- |
| `CacheService`     | `src/infrastructure/cache/`            | Redis caching with cache-aside pattern |
| `CacheKeyBuilder`  | `src/infrastructure/cache/`            | Consistent cache key generation        |
| `QueueService`     | `src/infrastructure/queue/`            | BullMQ job queue management            |
| `SchedulerService` | `src/infrastructure/scheduler/`        | Cron-based scheduled jobs              |
| Processors         | `src/infrastructure/queue/processors/` | Job processing logic                   |
| Constants          | Various                                | TTLs, queue names, cron patterns       |

This architecture provides a solid foundation for:

- ⚡ High-performance caching
- 🔄 Reliable async job processing
- ⏰ Scheduled maintenance tasks
- 🧹 Clean, maintainable code

The design follows your existing patterns and integrates seamlessly with your tsyringe-based dependency injection system.
