Caching, Queue System & Scheduled Jobs Implementation Guide
Project: StoryChain Backend
Date: February 9, 2026
Status: Implementation Guide

📋 Table of Contents
Executive Summary
Current State Analysis
Complete Folder Structure
Cache Implementation
Queue System Implementation
Scheduler Implementation
Worker Configuration & Performance
API-Level Caching Strategy
Best Practices & Recommendations
🎯 Executive Summary
This guide provides a complete roadmap for implementing:

Component Purpose Technology
Redis Caching High-performance data caching with intelligent TTL ioredis
BullMQ Queues Robust async job processing BullMQ
Scheduled Jobs Cron-based recurring tasks BullMQ Scheduler
Key Decisions
✅ Use Cache-Aside Pattern for API caching
✅ Use BullMQ for job queues (already installed)
✅ Use Redis as single source for both cache and queue
✅ Implement tag-based invalidation for smart cache clearing
✅ Use tsyringe DI for all services (consistent with project)
🔍 Current State Analysis
What Already Exists
✅ Redis package installed (ioredis)
✅ BullMQ package installed
✅ Cache key builder implemented (src/infrastructure/cache/cache-key.builder.ts)
✅ Cache TTL constants defined (src/infrastructure/cache/cache.constants.ts)
✅ DI tokens exist for CacheService, QueueService
✅ Jobs folder structure (src/jobs/)
✅ Comprehensive architecture docs (docs/architecture/redis-cache-queue-architecture.md)
❌ CacheService not implemented
❌ QueueService not implemented
❌ SchedulerService not implemented
❌ Redis connection currently commented out
❌ Job processors not implemented
Your Current Infrastructure Folder
src/infrastructure/
├── cache/
│ ├── cache-key.builder.ts ✅ Implemented
│ ├── cache.constants.ts ✅ Implemented
│ └── index.ts ✅ Export barrel
├── queue/
│ └── index.ts ❌ Placeholder
├── scheduler/
│ └── index.ts ❌ Placeholder
├── errors/
│ └── ... ✅ Error handling
└── index.ts ✅ Export barrel
📁 Complete Folder Structure
Proposed Final Structure
src/infrastructure/
├── cache/
│ ├── index.ts # Export barrel
│ ├── cache.service.ts # 🆕 Main cache service class
│ ├── cache.constants.ts # ✅ TTL values (exists)
│ ├── cache-key.builder.ts # ✅ Key generation (exists)
│ └── decorators/
│ └── cacheable.decorator.ts # 🆕 Optional: Method caching decorator
│
├── queue/
│ ├── index.ts # Export barrel
│ ├── queue.service.ts # 🆕 Queue manager service
│ ├── queue.constants.ts # 🆕 Queue names, job options
│ ├── queue.types.ts # 🆕 Job payload interfaces
│ └── processors/ # 🆕 Job processors
│ ├── index.ts
│ ├── email.processor.ts
│ ├── notification.processor.ts
│ └── analytics.processor.ts
│
├── scheduler/
│ ├── index.ts # Export barrel
│ ├── scheduler.service.ts # 🆕 Scheduler manager
│ ├── scheduler.constants.ts # 🆕 Cron patterns, job configs
│ └── jobs/ # 🆕 Scheduled job definitions
│ ├── index.ts
│ ├── cleanup.job.ts # Old data cleanup
│ ├── trending.job.ts # Refresh trending stories
│ └── health-check.job.ts # System health checks
│
└── redis/
├── index.ts
└── redis.service.ts # 🆕 Enhanced Redis service (move from config)
Why This Structure?
Benefit Explanation
Separation of Concerns Cache, Queue, Scheduler are independent
Single Responsibility Each file has one purpose
Scalability Easy to add new processors/jobs
Testability Mock each service independently
Discoverability Clear folder names = easy navigation
🔴 Cache Implementation
Step 1: Create CacheService
// src/infrastructure/cache/cache.service.ts
import { inject, singleton } from 'tsyringe';
import Redis from 'ioredis';
import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { CacheKeyBuilder } from './cache-key.builder';
import { CACHE_TTL, CacheTTLKey } from './cache.constants';
interface CacheOptions {
ttl?: number;
ttlKey?: CacheTTLKey;
tags?: string[];
}
@singleton()
export class CacheService extends BaseModule {
private client: Redis | null = null;
private stats = { hits: 0, misses: 0 };
// ═══════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════
async initialize(redisUrl: string): Promise<void> {
this.client = new Redis(redisUrl, {
maxRetriesPerRequest: 3,
retryStrategy: (times) => Math.min(times \* 50, 2000),
lazyConnect: true,
});
this.client.on('connect', () => this.logInfo('✅ Redis cache connected'));
this.client.on('error', (err) => this.logError('Redis error', err));
await this.client.connect();
}
getClient(): Redis {
if (!this.client) throw new Error('Cache not initialized');
return this.client;
}
// ═══════════════════════════════════════════
// CORE OPERATIONS
// ═══════════════════════════════════════════
async get<T>(key: string): Promise<T | null> {
try {
const data = await this.getClient().get(key);
if (!data) {
this.stats.misses++;
return null;
}
this.stats.hits++;
return JSON.parse(data) as T;
} catch (error) {
this.logError(`Cache get failed: ${key}`, error);
return null;
}
}
async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
try {
const ttl = options.ttl ?? (options.ttlKey ? CACHE_TTL[options.ttlKey] : 600);
const serialized = JSON.stringify(value);
await this.getClient().setex(key, ttl, serialized);
// Add to tag sets for invalidation
if (options.tags?.length) {
await this.addToTags(key, options.tags, ttl);
}
} catch (error) {
this.logError(`Cache set failed: ${key}`, error);
}
}
/\*\*

- Cache-Aside Pattern: Get from cache or fetch and cache
  _/
  async getOrSet<T>(
  key: string,
  factory: () => Promise<T>,
  options: CacheOptions = {}
  ): Promise<T> {
  const cached = await this.get<T>(key);
  if (cached !== null) return cached;
  const fresh = await factory();
  if (fresh !== null && fresh !== undefined) {
  await this.set(key, fresh, options);
  }
  return fresh;
  }
  // ═══════════════════════════════════════════
  // INVALIDATION
  // ═══════════════════════════════════════════
  async del(key: string): Promise<void> {
  await this.getClient().del(key);
  }
  async delMany(keys: string[]): Promise<void> {
  if (keys.length > 0) {
  await this.getClient().del(...keys);
  }
  }
  async delPattern(pattern: string): Promise<number> {
  const client = this.getClient();
  let cursor = '0';
  let deletedCount = 0;
  do {
  const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
  cursor = nextCursor;
  if (keys.length > 0) {
  await client.del(...keys);
  deletedCount += keys.length;
  }
  } while (cursor !== '0');
  return deletedCount;
  }
  async invalidateByTags(tags: string[]): Promise<void> {
  const client = this.getClient();
  const keysToDelete = new Set<string>();
  for (const tag of tags) {
  const members = await client.smembers(`tag:${tag}`);
  members.forEach((k) => keysToDelete.add(k));
  await client.del(`tag:${tag}`);
  }
  if (keysToDelete.size > 0) {
  await client.del(...keysToDelete);
  }
  }
  // ═══════════════════════════════════════════
  // ENTITY INVALIDATION HELPERS
  // ═══════════════════════════════════════════
  async invalidateStory(slug: string): Promise<void> {
  const keys = CacheKeyBuilder.invalidateStory(slug);
  await this.delMany(keys);
  await this.delPattern(CacheKeyBuilder.invalidateAllStoryLists());
  }
  async invalidateUser(userId: string): Promise<void> {
  const keys = CacheKeyBuilder.invalidateUserData(userId);
  await this.delMany(keys);
  }
  async invalidateChapter(storySlug: string, chapterSlug: string): Promise<void> {
  const keys = CacheKeyBuilder.invalidateChapter(storySlug, chapterSlug);
  await this.delMany(keys);
  }
  // ═══════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════
  private async addToTags(key: string, tags: string[], ttl: number): Promise<void> {
  const client = this.getClient();
  const pipe = client.pipeline();
  for (const tag of tags) {
  pipe.sadd(`tag:${tag}`, key);
  pipe.expire(`tag:${tag}`, ttl + 60); // Tag expires slightly after keys
  }
  await pipe.exec();
  }
  getStats() {
  const total = this.stats.hits + this.stats.misses;
  return {
  ...this.stats,
  hitRate: total > 0 ? ((this.stats.hits / total) _ 100).toFixed(2) + '%' : '0%',
  };
  }
  async healthCheck(): Promise<boolean> {
  try {
  await this.getClient().ping();
  return true;
  } catch {
  return false;
  }
  }
  }
  Step 2: Using Cache in Services
  // Example: src/features/story/services/story-query.service.ts
  import { inject, singleton } from 'tsyringe';
  import { TOKENS } from '@container/tokens';
  import { CacheService } from '@infrastructure/cache/cache.service';
  import { CacheKeyBuilder } from '@infrastructure/cache/cache-key.builder';
  import { CACHE*TTL } from '@infrastructure/cache/cache.constants';
  @singleton()
  export class StoryQueryService extends BaseModule {
  constructor(
  @inject(TOKENS.StoryRepository) private readonly storyRepo: StoryRepository,
  @inject(TOKENS.CacheService) private readonly cache: CacheService
  ) {
  super();
  }
  async getBySlug(slug: string): Promise<IStory | null> {
  const cacheKey = CacheKeyBuilder.storyDetail(slug);
  return this.cache.getOrSet(
  cacheKey,
  () => this.storyRepo.findBySlug(slug),
  { ttl: CACHE_TTL.STORY_DETAIL, tags: [`story:${slug}`] }
  );
  }
  async getStoryOverview(slug: string): Promise<IStoryWithCreator | null> {
  const cacheKey = CacheKeyBuilder.storyOverview(slug);
  return this.cache.getOrSet(
  cacheKey,
  async () => {
  const pipeline = new StoryPipelineBuilder()
  .findBySlug(slug)
  .attachCollaborators()
  .build();
  const stories = await this.storyRepo.aggregate<IStoryWithCreator>(pipeline);
  return stories[0] || null;
  },
  { ttlKey: 'STORY_OVERVIEW', tags: [`story:${slug}`] }
  );
  }
  }
  🔵 Queue System Implementation
  Step 1: Queue Types & Constants
  // src/infrastructure/queue/queue.types.ts
  export const QUEUE_NAMES = {
  EMAIL: 'email',
  NOTIFICATION: 'notification',
  ANALYTICS: 'analytics',
  CLEANUP: 'cleanup',
  EXPORT: 'export',
  } as const;
  export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];
  // ═══════════════════════════════════════════
  // JOB PAYLOADS
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
  age: 24 * 60 _ 60, // 24 hours
  },
  removeOnFail: {
  count: 500,
  age: 7 _ 24 _ 60 _ 60, // 7 days
  },
  };
  // Queue-specific settings (used in worker configuration)
  export const QUEUE*SETTINGS = {
  email: {
  concurrency: 10,
  limiter: { max: 100, duration: 60000 }, // 100 emails/minute
  },
  notification: {
  concurrency: 20,
  },
  analytics: {
  concurrency: 50,
  },
  cleanup: {
  concurrency: 1, // Only one cleanup at a time
  },
  export: {
  concurrency: 3, // Limited due to resource usage
  },
  } as const;
  Step 2: QueueService
  // src/infrastructure/queue/queue.service.ts
  import { singleton } from 'tsyringe';
  import { Queue, Worker, Job, QueueEvents, JobsOptions } from 'bullmq';
  import { BaseModule } from '@utils/baseClass';
  import { QUEUE_NAMES, DEFAULT_JOB_OPTIONS, QUEUE_SETTINGS } from './queue.constants';
  import { JobPayload, JobResult, QueueName } from './queue.types';
  interface QueueConnection {
  host: string;
  port: number;
  password?: string;
  username?: string;
  }
  @singleton()
  export class QueueService extends BaseModule {
  private queues: Map<QueueName, Queue> = new Map();
  private workers: Map<QueueName, Worker> = new Map();
  private events: Map<QueueName, QueueEvents> = new Map();
  private connection: QueueConnection | null = null;
  // ═══════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════
  async initialize(redisUrl: string): Promise<void> {
  const url = new URL(redisUrl);
  this.connection = {
  host: url.hostname,
  port: parseInt(url.port) || 6379,
  password: url.password || undefined,
  username: url.username || undefined,
  };
  this.logInfo('Initializing queue service...');
  for (const queueName of Object.values(QUEUE_NAMES)) {
  const queue = new Queue(queueName, { connection: this.connection });
  this.queues.set(queueName as QueueName, queue);
  const events = new QueueEvents(queueName, { connection: this.connection });
  this.events.set(queueName as QueueName, events);
  this.logInfo(`Queue "${queueName}" initialized`);
  }
  }
  async shutdown(): Promise<void> {
  this.logInfo('Shutting down queue service...');
  for (const [name, worker] of this.workers) {
  await worker.close();
  this.logInfo(`Worker "${name}" closed`);
  }
  for (const [, events] of this.events) {
  await events.close();
  }
  for (const [name, queue] of this.queues) {
  await queue.close();
  this.logInfo(`Queue "${name}" closed`);
  }
  }
  // ═══════════════════════════════════════════
  // JOB OPERATIONS
  // ═══════════════════════════════════════════
  async addJob<T extends QueueName>(
  queueName: T,
  data: JobPayload[T],
  options?: JobsOptions
  ): Promise<Job<JobPayload[T]>> {
  const queue = this.queues.get(queueName);
  if (!queue) throw new Error(`Queue "${queueName}" not found`);
  const job = await queue.add(queueName, data, {
  ...DEFAULT_JOB_OPTIONS,
  ...options,
  });
  this.logInfo(`Job added to queue "${queueName}": ${job.id}`);
  return job;
  }
  async addBulkJobs<T extends QueueName>(
  queueName: T,
  jobs: Array<{ data: JobPayload[T]; options?: JobsOptions }>
  ): Promise<Job<JobPayload[T]>[]> {
  const queue = this.queues.get(queueName);
  if (!queue) throw new Error(`Queue "${queueName}" not found`);
  const bulkJobs = jobs.map((j) => ({
  name: queueName,
  data: j.data,
  opts: { ...DEFAULT_JOB_OPTIONS, ...j.options },
  }));
  return queue.addBulk(bulkJobs);
  }
  // ═══════════════════════════════════════════
  // WORKER MANAGEMENT
  // ═══════════════════════════════════════════
  registerProcessor<T extends QueueName>(
  queueName: T,
  processor: (job: Job<JobPayload[T]>) => Promise<JobResult[T]>,
  options?: { concurrency?: number }
  ): void {
  if (!this.connection) throw new Error('Queue service not initialized');
  if (this.workers.has(queueName)) {
  this.logInfo(`Worker for "${queueName}" already exists, replacing...`);
  this.workers.get(queueName)?.close();
  }
  const settings = QUEUE_SETTINGS[queueName as keyof typeof QUEUE_SETTINGS];
  const concurrency = options?.concurrency ?? settings?.concurrency ?? 5;
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
  connection: this.connection,
  concurrency,
  }
  );
  worker.on('failed', (job, err) => {
  this.logError(`Job ${job?.id} failed in queue "${queueName}"`, err);
  });
  worker.on('error', (err) => {
  this.logError(`Worker error in queue "${queueName}"`, err);
  });
  this.workers.set(queueName, worker);
  this.logInfo(`Worker registered for queue "${queueName}" with concurrency: ${concurrency}`);
  }
  // ═══════════════════════════════════════════
  // CONVENIENCE METHODS
  // ═══════════════════════════════════════════
  async sendEmail(payload: JobPayload['email']): Promise<Job> {
  return this.addJob('email', payload);
  }
  async sendNotification(payload: JobPayload['notification']): Promise<Job> {
  return this.addJob('notification', payload);
  }
  async trackAnalytics(payload: JobPayload['analytics']): Promise<Job> {
  return this.addJob('analytics', payload);
  }
  // ═══════════════════════════════════════════
  // MONITORING
  // ═══════════════════════════════════════════
  async getQueueStats(queueName: QueueName): Promise<object> {
  const queue = this.queues.get(queueName);
  if (!queue) throw new Error(`Queue "${queueName}" not found`);
  const [waiting, active, completed, failed, delayed] = await Promise.all([
  queue.getWaitingCount(),
  queue.getActiveCount(),
  queue.getCompletedCount(),
  queue.getFailedCount(),
  queue.getDelayedCount(),
  ]);
  return { queueName, waiting, active, completed, failed, delayed };
  }
  async getAllQueueStats(): Promise<object[]> {
  const stats = [];
  for (const queueName of this.queues.keys()) {
  stats.push(await this.getQueueStats(queueName));
  }
  return stats;
  }
  }
  🟢 Scheduler Implementation
  Scheduler Service
  // src/infrastructure/scheduler/scheduler.service.ts
  import { singleton } from 'tsyringe';
  import { Queue, Worker } from 'bullmq';
  import { BaseModule } from '@utils/baseClass';
  import { SCHEDULED_JOBS, ScheduledJobConfig } from './scheduler.constants';
  @singleton()
  export class SchedulerService extends BaseModule {
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private processors: Map<string, (data: any) => Promise<void>> = new Map();
  async initialize(redisUrl: string): Promise<void> {
  const url = new URL(redisUrl);
  const connection = {
  host: url.hostname,
  port: parseInt(url.port) || 6379,
  password: url.password || undefined,
  };
  this.queue = new Queue('scheduled-jobs', { connection });
  // Register all scheduled jobs
  for (const job of SCHEDULED_JOBS) {
  await this.queue.upsertJobScheduler(
  job.name,
  { pattern: job.cron },
  { name: job.name, data: job.data || {} }
  );
  this.logInfo(`Scheduled job "${job.name}" registered: ${job.cron}`);
  }
  // Create worker to process scheduled jobs
  this.worker = new Worker(
  'scheduled-jobs',
  async (job) => {
  const processor = this.processors.get(job.name);
  if (processor) {
  this.logInfo(`Executing scheduled job: ${job.name}`);
  await processor(job.data);
  } else {
  this.logWarning(`No processor found for scheduled job: ${job.name}`);
  }
  },
  { connection, concurrency: 1 }
  );
  this.logInfo('Scheduler service initialized');
  }
  registerJobProcessor(jobName: string, processor: (data: any) => Promise<void>): void {
  this.processors.set(jobName, processor);
  this.logInfo(`Processor registered for job: ${jobName}`);
  }
  async shutdown(): Promise<void> {
  await this.worker?.close();
  await this.queue?.close();
  this.logInfo('Scheduler service shut down');
  }
  }
  Scheduler Constants
  // src/infrastructure/scheduler/scheduler.constants.ts
  export interface ScheduledJobConfig {
  name: string;
  cron: string;
  data?: Record<string, unknown>;
  description: string;
  }
  export const SCHEDULED_JOBS: ScheduledJobConfig[] = [
  {
  name: 'cleanup-old-autosaves',
  cron: '0 3 * \* _', // Daily at 3 AM
  data: { type: 'autosave', daysOld: 30 },
  description: 'Remove autosaves older than 30 days',
  },
  {
  name: 'cleanup-expired-sessions',
  cron: '0 4 _ \* _', // Daily at 4 AM
  data: { type: 'sessions' },
  description: 'Remove expired user sessions',
  },
  {
  name: 'cleanup-old-notifications',
  cron: '0 5 _ _ 0', // Every Sunday at 5 AM
  data: { type: 'notifications', daysOld: 90 },
  description: 'Remove read notifications older than 90 days',
  },
  {
  name: 'refresh-trending-stories',
  cron: '_/30 \* \* \* _', // Every 30 minutes
  data: {},
  description: 'Recalculate trending stories cache',
  },
  {
  name: 'aggregate-daily-stats',
  cron: '0 0 _ \* _', // Daily at midnight
  data: { type: 'daily' },
  description: 'Aggregate daily statistics',
  },
  ];
  export const CRON_PATTERNS = {
  EVERY_MINUTE: '_ \* \* \* _',
  EVERY_5_MINUTES: '_/5 \* \* \* _',
  EVERY_15_MINUTES: '_/15 \* \* \* _',
  EVERY_30_MINUTES: '_/30 \* \* \* _',
  EVERY_HOUR: '0 _ \* \* _',
  EVERY_DAY_MIDNIGHT: '0 0 _ \* _',
  EVERY_DAY_3AM: '0 3 _ \* _',
  EVERY_SUNDAY: '0 0 _ \* 0',
  } as const;
  ⚙️ Worker Configuration & Performance
  🎯 How Many Workers Should You Use?
  This is one of the most critical decisions for queue performance. Here's a complete guide:

Understanding Workers vs Concurrency
┌─────────────────────────────────────────────────────────────────────────┐
│ WORKERS vs CONCURRENCY │
├─────────────────────────────────────────────────────────────────────────┤
│ │
│ WORKER = A process/thread that processes jobs │
│ CONCURRENCY = How many jobs a single worker processes simultaneously │
│ │
│ Example: 2 Workers × 5 Concurrency = 10 jobs processing at once │
│ │
└─────────────────────────────────────────────────────────────────────────┘
Worker Configuration Guidelines
Queue Type Concurrency Explanation
Email 5-10 Rate limited by email provider (SendGrid: 100/sec, Mailgun: 300/sec)
Notification 10-20 Fast in-app DB writes, can handle more
Analytics 20-50 Simple event tracking, lightweight
Cleanup 1 Heavy DB operations, run serially to avoid locks
Export 2-3 Resource-intensive (PDF/EPUB generation)
Impact of Worker Count
┌───────────────────────────────────────────────────────────────────────────┐
│ TOO FEW WORKERS │
├───────────────────────────────────────────────────────────────────────────┤
│ ❌ Jobs queue up faster than processing │
│ ❌ Delayed delivery of emails/notifications │
│ ❌ User experience degradation (waiting for exports) │
│ ❌ Memory buildup as jobs accumulate │
│ │
│ Symptoms: │
│ - Growing "waiting" count in queue stats │
│ - Delayed notifications reaching users │
│ - Timeout errors for long-running jobs │
└───────────────────────────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────────────────────────┐
│ TOO MANY WORKERS │
├───────────────────────────────────────────────────────────────────────────┤
│ ❌ High CPU usage (context switching overhead) │
│ ❌ Memory exhaustion (each worker uses RAM) │
│ ❌ Redis connection limits exceeded │
│ ❌ Database connection pool exhaustion │
│ ❌ External API rate limits exceeded │
│ ❌ Diminishing returns after optimal point │
│ │
│ Symptoms: │
│ - High CPU with low throughput │
│ - "Too many connections" errors │
│ - Rate limit errors from external services │
│ - Memory pressure / OOM kills │
└───────────────────────────────────────────────────────────────────────────┘
Recommended Configuration for StoryChain
// src/infrastructure/queue/worker.config.ts
/\*\*

- Worker configuration based on deployment size
  \*/
  export const WORKER_CONFIG = {
  // ═══════════════════════════════════════════
  // DEVELOPMENT (Single server, limited resources)
  // ═══════════════════════════════════════════
  development: {
  email: { concurrency: 2 },
  notification: { concurrency: 5 },
  analytics: { concurrency: 10 },
  cleanup: { concurrency: 1 },
  export: { concurrency: 1 },
  },
  // ═══════════════════════════════════════════
  // PRODUCTION - SMALL (1-2 vCPU, 1GB RAM)
  // ═══════════════════════════════════════════
  'production-small': {
  email: { concurrency: 5 },
  notification: { concurrency: 10 },
  analytics: { concurrency: 20 },
  cleanup: { concurrency: 1 },
  export: { concurrency: 2 },
  },
  // ═══════════════════════════════════════════
  // PRODUCTION - MEDIUM (2-4 vCPU, 4GB RAM)
  // ═══════════════════════════════════════════
  'production-medium': {
  email: { concurrency: 10 },
  notification: { concurrency: 20 },
  analytics: { concurrency: 50 },
  cleanup: { concurrency: 1 },
  export: { concurrency: 3 },
  },
  // ═══════════════════════════════════════════
  // PRODUCTION - LARGE (4+ vCPU, 8GB+ RAM)
  // ═══════════════════════════════════════════
  'production-large': {
  email: { concurrency: 20 },
  notification: { concurrency: 50 },
  analytics: { concurrency: 100 },
  cleanup: { concurrency: 2 },
  export: { concurrency: 5 },
  },
  } as const;
  Calculating Optimal Workers
  Formula: Optimal Concurrency = (Available RAM - Base App Usage) / (Memory per Job)
  Example for 1GB RAM server:

* Base App: ~200MB
* Memory per Job: ~10MB average
* Available for workers: 800MB
* Optimal total concurrency: 800/10 = 80 jobs max
  Distribute across queues based on priority:
* Email: 10 (critical, moderate memory)
* Notification: 20 (fast, low memory)
* Analytics: 40 (simple, lowest memory)
* Cleanup: 1 (heavy, high memory)
* Export: 5 (very heavy, high memory)
  Monitoring Worker Health
  // Add to QueueService
  async getWorkerHealth(): Promise<object> {
  const health = [];
  for (const [name, worker] of this.workers) {
  health.push({
  queue: name,
  running: worker.isRunning(),
  paused: worker.isPaused(),
  });
  }
  return {
  workers: health,
  timestamp: new Date().toISOString(),
  };
  }
  🌐 API-Level Caching Strategy
  Cache Every API Call Strategy
  Here's how to implement systematic caching for all your API endpoints:

1. Define Cacheable vs Non-Cacheable
   ┌─────────────────────────────────────────────────────────────────────────┐
   │ CACHEABLE (GET requests) │
   ├─────────────────────────────────────────────────────────────────────────┤
   │ ✅ GET /stories → Cache list for 5 min │
   │ ✅ GET /stories/:slug → Cache detail for 1 hour │
   │ ✅ GET /stories/:slug/chapters → Cache tree for 15 min │
   │ ✅ GET /users/:id/profile → Cache profile for 1 hour │
   │ ✅ GET /notifications → Cache for 2 min │
   │ ✅ GET /search?q=... → Cache results for 3 min │
   └─────────────────────────────────────────────────────────────────────────┘
   ┌─────────────────────────────────────────────────────────────────────────┐
   │ NON-CACHEABLE (Mutations) │
   ├─────────────────────────────────────────────────────────────────────────┤
   │ ❌ POST /stories → Creates data, invalidate lists │
   │ ❌ PUT /stories/:slug → Updates data, invalidate story cache │
   │ ❌ DELETE /chapters/:id → Deletes data, invalidate tree │
   │ ❌ POST /collaborators → Creates relation, invalidate story │
   └─────────────────────────────────────────────────────────────────────────┘
2. Cache Key Mapping by Feature
   // src/infrastructure/cache/api-cache.map.ts
   export const API_CACHE_MAP = {
   // ═══════════════════════════════════════════
   // STORY ENDPOINTS
   // ═══════════════════════════════════════════
   'GET /stories': {
   keyBuilder: (params: { page: number; limit: number; status?: string }) =>
   CacheKeyBuilder.storyList(params.status as any || 'published'),
   ttl: CACHE_TTL.STORY_LIST_PUBLISHED,
   },
   'GET /stories/:slug': {
   keyBuilder: (params: { slug: string }) => CacheKeyBuilder.storyDetail(params.slug),
   ttl: CACHE_TTL.STORY_DETAIL,
   },
   'GET /stories/:slug/overview': {
   keyBuilder: (params: { slug: string }) => CacheKeyBuilder.storyOverview(params.slug),
   ttl: CACHE_TTL.STORY_OVERVIEW,
   },
   'GET /stories/:slug/tree': {
   keyBuilder: (params: { slug: string }) => CacheKeyBuilder.storyTree(params.slug),
   ttl: CACHE_TTL.STORY_TREE,
   },
   // ═══════════════════════════════════════════
   // CHAPTER ENDPOINTS
   // ═══════════════════════════════════════════
   'GET /stories/:storySlug/chapters/:chapterSlug': {
   keyBuilder: (p: { storySlug: string; chapterSlug: string }) =>
   CacheKeyBuilder.chapterDetail(p.storySlug, p.chapterSlug),
   ttl: CACHE_TTL.CHAPTER_DETAIL,
   },
   // ═══════════════════════════════════════════
   // USER ENDPOINTS
   // ═══════════════════════════════════════════
   'GET /users/:clerkId/profile': {
   keyBuilder: (params: { clerkId: string }) => CacheKeyBuilder.userProfile(params.clerkId),
   ttl: CACHE_TTL.USER_PROFILE,
   },
   'GET /users/:userId/stories': {
   keyBuilder: (params: { userId: string }) => CacheKeyBuilder.userStories(params.userId),
   ttl: CACHE_TTL.USER_STORIES,
   },
   // ═══════════════════════════════════════════
   // NOTIFICATION ENDPOINTS
   // ═══════════════════════════════════════════
   'GET /notifications': {
   keyBuilder: (params: { userId: string }) => CacheKeyBuilder.notificationList(params.userId),
   ttl: CACHE_TTL.NOTIFICATION_LIST,
   },
   'GET /notifications/count': {
   keyBuilder: (params: { userId: string }) => CacheKeyBuilder.notificationCount(params.userId),
   ttl: CACHE_TTL.NOTIFICATION_COUNT,
   },
   } as const;
3. Create Caching Middleware (Optional)
   // src/middlewares/cache.middleware.ts
   import { FastifyRequest, FastifyReply } from 'fastify';
   import { CacheService } from '@infrastructure/cache/cache.service';
   import { container } from 'tsyringe';
   import { TOKENS } from '@container/tokens';
   export async function cacheMiddleware(
   request: FastifyRequest,
   reply: FastifyReply
   ): Promise<void> {
   // Only cache GET requests
   if (request.method !== 'GET') return;
   const cache = container.resolve<CacheService>(TOKENS.CacheService);
   const cacheKey = `api:${request.url}`;
   const cached = await cache.get<object>(cacheKey);
   if (cached) {
   reply.header('X-Cache', 'HIT');
   return reply.send(cached);
   }
   reply.header('X-Cache', 'MISS');
   }
4. Invalidation Strategy
   // src/infrastructure/cache/invalidation.strategy.ts
   /\*\*

- Defines what to invalidate when data changes
  \*/
  export const INVALIDATION_RULES = {
  // ═══════════════════════════════════════════
  // STORY CHANGES
  // ═══════════════════════════════════════════
  storyCreated: async (cache: CacheService, data: { creatorId: string }) => {
  await cache.delPattern(CacheKeyBuilder.invalidateAllStoryLists());
  await cache.del(CacheKeyBuilder.userStories(data.creatorId));
  await cache.del(CacheKeyBuilder.userDrafts(data.creatorId));
  },
  storyUpdated: async (cache: CacheService, data: { slug: string }) => {
  await cache.invalidateStory(data.slug);
  },
  storyPublished: async (cache: CacheService, data: { slug: string; creatorId: string }) => {
  await cache.invalidateStory(data.slug);
  await cache.del(CacheKeyBuilder.userDrafts(data.creatorId));
  await cache.delPattern(CacheKeyBuilder.invalidateAllStoryLists());
  },
  storyDeleted: async (cache: CacheService, data: { slug: string; creatorId: string }) => {
  await cache.invalidateStory(data.slug);
  await cache.del(CacheKeyBuilder.userStories(data.creatorId));
  await cache.delPattern(CacheKeyBuilder.invalidateAllStoryLists());
  },
  // ═══════════════════════════════════════════
  // CHAPTER CHANGES
  // ═══════════════════════════════════════════
  chapterCreated: async (cache: CacheService, data: { storySlug: string }) => {
  await cache.del(CacheKeyBuilder.storyTree(data.storySlug));
  await cache.del(CacheKeyBuilder.chapterList(data.storySlug));
  },
  chapterUpdated: async (
  cache: CacheService,
  data: { storySlug: string; chapterSlug: string }
  ) => {
  await cache.invalidateChapter(data.storySlug, data.chapterSlug);
  },
  // ═══════════════════════════════════════════
  // USER CHANGES
  // ═══════════════════════════════════════════
  userUpdated: async (cache: CacheService, data: { userId: string }) => {
  await cache.invalidateUser(data.userId);
  },
  // ═══════════════════════════════════════════
  // NOTIFICATION CHANGES
  // ═══════════════════════════════════════════
  notificationCreated: async (cache: CacheService, data: { userId: string }) => {
  await cache.del(CacheKeyBuilder.notificationCount(data.userId));
  await cache.del(CacheKeyBuilder.notificationList(data.userId));
  },
  notificationRead: async (cache: CacheService, data: { userId: string }) => {
  await cache.del(CacheKeyBuilder.notificationCount(data.userId));
  },
  };
  ✅ Best Practices & Recommendations
  Cache Best Practices
  Practice Why
  Always use CacheKeyBuilder Prevents typos, ensures consistency
  Set appropriate TTLs Balance freshness vs. performance
  Invalidate on writes Prevents stale data
  Handle failures gracefully Cache miss is better than app crash
  Use patterns sparingly SCAN is expensive on large datasets
  Add cache headers X-Cache: HIT/MISS for debugging
  Monitor hit rates Track via getStats()
  Queue Best Practices
  Practice Why
  Keep payloads small Store IDs, not full objects
  Design idempotent jobs Same job may run multiple times
  Set reasonable retries 3 attempts with exponential backoff
  Use dead letter queues Don't lose failing jobs
  Monitor queue depths Alert on growing backlogs
  Rate limit external APIs Prevent getting blocked
  Scheduler Best Practices
  Practice Why
  Stagger job times Don't run everything at midnight
  Use distributed locks Prevent duplicate execution
  Log job execution Track success/failure
  Keep jobs idempotent Safe to retry on failure
  Monitor job duration Alert on slow jobs
  Performance Monitoring
  // Health check endpoint data
  {
  cache: {
  connected: true,
  hits: 15234,
  misses: 1023,
  hitRate: "93.7%"
  },
  queues: [
  { name: "email", waiting: 5, active: 2, completed: 1240, failed: 3 },
  { name: "notification", waiting: 12, active: 5, completed: 8453, failed: 12 }
  ],
  scheduler: {
  registeredJobs: 5,
  nextRun: "2026-02-09T15:30:00Z"
  }
  }
  📊 Summary
  Component File Location Responsibility
  CacheService src/infrastructure/cache/cache.service.ts Redis caching with cache-aside pattern
  CacheKeyBuilder
  src/infrastructure/cache/cache-key.builder.ts
  Consistent cache key generation (exists)
  CACHE_TTL
  src/infrastructure/cache/cache.constants.ts
  TTL values (exists)
  QueueService src/infrastructure/queue/queue.service.ts BullMQ job queue management
  SchedulerService src/infrastructure/scheduler/scheduler.service.ts Cron-based scheduled jobs
  Processors src/infrastructure/queue/processors/ Job processing logic
  Next Steps
  ✅ Enable Redis connection in
  src/config/redis.ts
  ✅ Create CacheService implementation
  ✅ Create QueueService implementation
  ✅ Create SchedulerService implementation
  ✅ Update DI container to register services
  ✅ Integrate cache into existing query services
  ✅ Add job processors for email/notifications
  ✅ Add health check endpoints
  This architecture provides a solid foundation for high-performance caching, reliable async job processing, and scheduled maintenance tasks while following your existing patterns.
