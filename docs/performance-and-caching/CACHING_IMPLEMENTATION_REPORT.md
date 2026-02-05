# Caching Implementation Report

## Executive Summary

This report provides a comprehensive guide for implementing a robust caching layer in the StoryChain backend application. The caching system is designed to handle the current 20 models and scale efficiently for future complex queries.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Proposed Architecture](#2-proposed-architecture)
3. [Cache Key Management System](#3-cache-key-management-system)
4. [Implementation Strategy](#4-implementation-strategy)
5. [Cache Invalidation Patterns](#5-cache-invalidation-patterns)
6. [Service Integration Guide](#6-service-integration-guide)
7. [Best Practices & Recommendations](#7-best-practices--recommendations)

---

## 1. Current State Analysis

### 1.1 Existing Infrastructure

| Component | Status | Details |
|-----------|--------|---------|
| Redis Service | ✅ Configured | `src/config/services/redis.service.ts` with ioredis |
| Cache Token | ✅ Registered | `TOKENS.CacheService` exists in DI container |
| Cache Implementation | ❌ Missing | No actual CacheService implementation |
| Repository Caching | ❌ None | Direct DB queries without cache layer |

### 1.2 Current Models (20 Total)

```
├── User              ├── Story              ├── Chapter
├── ChapterVersion    ├── ChapterAutoSave    ├── StoryCollaborator
├── PullRequest       ├── PRComment          ├── PRReview
├── PRVote            ├── Comment            ├── Vote
├── Notification      ├── PlatformRole       ├── Bookmark
├── Follow            ├── ReadingHistory     ├── Session
├── Report            └── Appeal
```

### 1.3 Query Patterns Identified

| Pattern | Frequency | Cache Priority |
|---------|-----------|----------------|
| `findById` / `findBySlug` | Very High | 🔴 Critical |
| User by ClerkId | Very High | 🔴 Critical |
| Story with collaborators | High | 🟠 High |
| Chapter tree aggregation | High | 🟠 High |
| List queries (paginated) | Medium | 🟡 Medium |
| Count queries | Medium | 🟡 Medium |
| Complex aggregations | Low-Medium | 🟢 Low |

---

## 2. Proposed Architecture

### 2.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Service Layer                                │
│   (StoryService, UserService, ChapterService, etc.)                 │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         CacheService                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  CacheKeyBuilder (Centralized Key Management)                │   │
│  │  ├── Entity Keys:     story:{id}, user:{clerkId}            │   │
│  │  ├── Collection Keys: stories:list:{page}:{limit}           │   │
│  │  ├── Query Keys:      story:bySlug:{slug}                   │   │
│  │  └── Tag Keys:        tag:story:{id}:*, tag:user:{id}:*     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Cache Operations                                            │   │
│  │  ├── get<T>(key) → T | null                                 │   │
│  │  ├── set<T>(key, value, ttl?) → void                        │   │
│  │  ├── getOrSet<T>(key, fetcher, ttl?) → T                    │   │
│  │  ├── invalidate(key | pattern) → void                       │   │
│  │  └── invalidateByTags(tags[]) → void                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         RedisService                                 │
│  (Low-level Redis operations: get, set, del, scan, pipeline)       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Redis Server                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Key Components

| Component | Responsibility |
|-----------|----------------|
| `CacheService` | High-level caching operations with serialization |
| `CacheKeyBuilder` | Centralized, type-safe key generation |
| `CacheInvalidator` | Tag-based and pattern-based invalidation |
| `RedisService` | Low-level Redis client wrapper (existing) |

---

## 3. Cache Key Management System

### 3.1 Key Naming Convention

```
<prefix>:<entity>:<identifier>:<qualifier>
```

| Segment | Description | Examples |
|---------|-------------|----------|
| `prefix` | Application namespace | `sc` (storychain) |
| `entity` | Model/resource name | `story`, `user`, `chapter` |
| `identifier` | Primary key or unique field | `{id}`, `{slug}`, `{clerkId}` |
| `qualifier` | Optional sub-resource or query params | `tree`, `settings`, `list:1:20` |

### 3.2 CacheKeyBuilder Implementation

```typescript
// src/services/cache/cacheKey.builder.ts

export type CacheEntity =
  | 'user' | 'story' | 'chapter' | 'storyCollaborator'
  | 'notification' | 'platformRole' | 'pullRequest'
  | 'chapterVersion' | 'chapterAutoSave' | 'comment'
  | 'vote' | 'bookmark' | 'follow' | 'readingHistory'
  | 'session' | 'report' | 'prComment' | 'prReview' | 'prVote';

export class CacheKeyBuilder {
  private static readonly PREFIX = 'sc';
  private static readonly SEPARATOR = ':';
  private static readonly TAG_PREFIX = 'tag';

  // ═══════════════════════════════════════════════════════════════
  // ENTITY KEYS - Single record by ID
  // ═══════════════════════════════════════════════════════════════

  static entity(entity: CacheEntity, id: string): string {
    return this.build(entity, id);
  }

  // ═══════════════════════════════════════════════════════════════
  // USER KEYS
  // ═══════════════════════════════════════════════════════════════

  static user = {
    byId: (id: string) => CacheKeyBuilder.build('user', id),
    byClerkId: (clerkId: string) => CacheKeyBuilder.build('user', 'clerk', clerkId),
    byEmail: (email: string) => CacheKeyBuilder.build('user', 'email', email),
    byUsername: (username: string) => CacheKeyBuilder.build('user', 'username', username),
    profile: (clerkId: string) => CacheKeyBuilder.build('user', clerkId, 'profile'),
    stats: (clerkId: string) => CacheKeyBuilder.build('user', clerkId, 'stats'),
  };

  // ═══════════════════════════════════════════════════════════════
  // STORY KEYS
  // ═══════════════════════════════════════════════════════════════

  static story = {
    byId: (id: string) => CacheKeyBuilder.build('story', id),
    bySlug: (slug: string) => CacheKeyBuilder.build('story', 'slug', slug),
    overview: (slug: string) => CacheKeyBuilder.build('story', slug, 'overview'),
    settings: (slug: string) => CacheKeyBuilder.build('story', slug, 'settings'),
    tree: (storyId: string) => CacheKeyBuilder.build('story', storyId, 'tree'),
    collaborators: (slug: string) => CacheKeyBuilder.build('story', slug, 'collaborators'),
    list: (page: number, limit: number, filters?: string) => {
      const base = CacheKeyBuilder.build('story', 'list', `${page}`, `${limit}`);
      return filters ? `${base}:${filters}` : base;
    },
    byCreator: (creatorId: string) => CacheKeyBuilder.build('story', 'creator', creatorId),
    drafts: (creatorId: string) => CacheKeyBuilder.build('story', 'drafts', creatorId),
    newStories: () => CacheKeyBuilder.build('story', 'new', 'last7days'),
  };

  // ═══════════════════════════════════════════════════════════════
  // CHAPTER KEYS
  // ═══════════════════════════════════════════════════════════════

  static chapter = {
    byId: (id: string) => CacheKeyBuilder.build('chapter', id),
    byStory: (storyId: string) => CacheKeyBuilder.build('chapter', 'story', storyId),
    root: (storyId: string) => CacheKeyBuilder.build('chapter', storyId, 'root'),
    children: (parentId: string) => CacheKeyBuilder.build('chapter', parentId, 'children'),
    version: (chapterId: string, version: number) =>
      CacheKeyBuilder.build('chapter', chapterId, 'v', `${version}`),
    autoSave: (chapterId: string, userId: string) =>
      CacheKeyBuilder.build('chapter', 'autosave', chapterId, userId),
  };

  // ═══════════════════════════════════════════════════════════════
  // COLLABORATOR KEYS
  // ═══════════════════════════════════════════════════════════════

  static collaborator = {
    byStoryAndUser: (slug: string, userId: string) =>
      CacheKeyBuilder.build('collaborator', slug, userId),
    byStory: (slug: string) => CacheKeyBuilder.build('collaborator', 'story', slug),
    byUser: (userId: string) => CacheKeyBuilder.build('collaborator', 'user', userId),
    invitation: (token: string) => CacheKeyBuilder.build('collaborator', 'invite', token),
  };

  // ═══════════════════════════════════════════════════════════════
  // NOTIFICATION KEYS
  // ═══════════════════════════════════════════════════════════════

  static notification = {
    byId: (id: string) => CacheKeyBuilder.build('notification', id),
    byUser: (userId: string, page?: number) => {
      const base = CacheKeyBuilder.build('notification', 'user', userId);
      return page !== undefined ? `${base}:page:${page}` : base;
    },
    unreadCount: (userId: string) => CacheKeyBuilder.build('notification', userId, 'unread'),
  };

  // ═══════════════════════════════════════════════════════════════
  // PLATFORM ROLE KEYS
  // ═══════════════════════════════════════════════════════════════

  static platformRole = {
    byId: (id: string) => CacheKeyBuilder.build('platformRole', id),
    byUser: (userId: string) => CacheKeyBuilder.build('platformRole', 'user', userId),
    all: () => CacheKeyBuilder.build('platformRole', 'all'),
  };

  // ═══════════════════════════════════════════════════════════════
  // PULL REQUEST KEYS
  // ═══════════════════════════════════════════════════════════════

  static pullRequest = {
    byId: (id: string) => CacheKeyBuilder.build('pr', id),
    byChapter: (chapterId: string) => CacheKeyBuilder.build('pr', 'chapter', chapterId),
    byStory: (storyId: string, status?: string) => {
      const base = CacheKeyBuilder.build('pr', 'story', storyId);
      return status ? `${base}:${status}` : base;
    },
    byAuthor: (authorId: string) => CacheKeyBuilder.build('pr', 'author', authorId),
  };

  // ═══════════════════════════════════════════════════════════════
  // QUERY HASH KEYS (for complex queries/aggregations)
  // ═══════════════════════════════════════════════════════════════

  static query(entity: CacheEntity, queryHash: string): string {
    return this.build('query', entity, queryHash);
  }

  static aggregation(entity: CacheEntity, pipelineHash: string): string {
    return this.build('agg', entity, pipelineHash);
  }

  // ═══════════════════════════════════════════════════════════════
  // TAG KEYS (for grouped invalidation)
  // ═══════════════════════════════════════════════════════════════

  static tag = {
    entity: (entity: CacheEntity, id: string) =>
      CacheKeyBuilder.build(CacheKeyBuilder.TAG_PREFIX, entity, id),
    user: (userId: string) =>
      CacheKeyBuilder.build(CacheKeyBuilder.TAG_PREFIX, 'user', userId),
    story: (storyId: string) =>
      CacheKeyBuilder.build(CacheKeyBuilder.TAG_PREFIX, 'story', storyId),
    chapter: (chapterId: string) =>
      CacheKeyBuilder.build(CacheKeyBuilder.TAG_PREFIX, 'chapter', chapterId),
  };

  // ═══════════════════════════════════════════════════════════════
  // PATTERN KEYS (for bulk invalidation)
  // ═══════════════════════════════════════════════════════════════

  static pattern = {
    allOfEntity: (entity: CacheEntity) => CacheKeyBuilder.build(entity, '*'),
    allForStory: (storyId: string) => CacheKeyBuilder.build('*', '*', storyId, '*'),
    allForUser: (userId: string) => CacheKeyBuilder.build('*', '*', userId, '*'),
    allLists: (entity: CacheEntity) => CacheKeyBuilder.build(entity, 'list', '*'),
    allQueries: (entity: CacheEntity) => CacheKeyBuilder.build('query', entity, '*'),
  };

  // ═══════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════

  private static build(...segments: string[]): string {
    return [this.PREFIX, ...segments].join(this.SEPARATOR);
  }

  static parse(key: string): { prefix: string; entity: string; parts: string[] } {
    const segments = key.split(this.SEPARATOR);
    return {
      prefix: segments[0],
      entity: segments[1] as CacheEntity,
      parts: segments.slice(2),
    };
  }

  static hashQuery(query: object): string {
    const crypto = require('crypto');
    const str = JSON.stringify(query, Object.keys(query).sort());
    return crypto.createHash('md5').update(str).digest('hex').substring(0, 12);
  }
}
```

### 3.3 Key Examples

| Use Case | Generated Key |
|----------|---------------|
| User by ClerkId | `sc:user:clerk:user_abc123` |
| Story by Slug | `sc:story:slug:my-awesome-story` |
| Story Overview | `sc:story:my-awesome-story:overview` |
| Chapter Tree | `sc:story:507f1f77bcf86cd:tree` |
| Story List (page 1, 20 items) | `sc:story:list:1:20` |
| New Stories | `sc:story:new:last7days` |
| Story Collaborators | `sc:story:my-story:collaborators` |
| User's Notifications (page 2) | `sc:notification:user:user_abc:page:2` |
| Complex Query Hash | `sc:query:story:a1b2c3d4e5f6` |
| Tag for Story | `sc:tag:story:507f1f77bcf86cd` |

---

## 4. Implementation Strategy

### 4.1 CacheService Implementation

```typescript
// src/services/cache/cache.service.ts

import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { RedisService } from '@config/services/redis.service';
import { logger } from '@utils/logger';
import { CacheKeyBuilder } from './cacheKey.builder';

export interface CacheOptions {
  ttl?: number;           // Time-to-live in seconds
  tags?: string[];        // Tags for grouped invalidation
  skipCache?: boolean;    // Bypass cache (useful for transactions)
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
}

@singleton()
export class CacheService {
  private stats = { hits: 0, misses: 0 };

  // Default TTLs by entity type (in seconds)
  private readonly DEFAULT_TTL: Record<string, number> = {
    user: 3600,           // 1 hour
    story: 1800,          // 30 minutes
    chapter: 1800,        // 30 minutes
    storyCollaborator: 900, // 15 minutes
    notification: 300,    // 5 minutes
    platformRole: 7200,   // 2 hours (rarely changes)
    list: 300,            // 5 minutes for lists
    aggregation: 600,     // 10 minutes for aggregations
  };

  constructor(
    @inject(TOKENS.RedisService)
    private readonly redis: RedisService
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // CORE OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get a cached value
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);

      if (data === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a cached value
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      const ttl = options.ttl ?? this.getDefaultTTL(key);
      const serialized = JSON.stringify(value);

      await this.redis.set(key, serialized, ttl);

      // Store tags for invalidation
      if (options.tags?.length) {
        await this.addToTags(key, options.tags);
      }
    } catch (error) {
      logger.error(`Cache SET error for key ${key}:`, error);
    }
  }

  /**
   * Get or Set pattern - fetches from cache or executes fetcher
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    if (options.skipCache) {
      return fetcher();
    }

    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const fresh = await fetcher();
    await this.set(key, fresh, options);

    return fresh;
  }

  /**
   * Delete a specific key
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error(`Cache DELETE error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys
   */
  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    try {
      const client = this.redis.getClient();
      const pipeline = client.pipeline();

      keys.forEach(key => pipeline.del(key));
      await pipeline.exec();
    } catch (error) {
      logger.error('Cache DELETE_MANY error:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // INVALIDATION STRATEGIES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Invalidate by pattern (uses SCAN for safety)
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const client = this.redis.getClient();
      const keys: string[] = [];
      let cursor = '0';

      do {
        const [nextCursor, foundKeys] = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );
        cursor = nextCursor;
        keys.push(...foundKeys);
      } while (cursor !== '0');

      if (keys.length > 0) {
        await this.deleteMany(keys);
      }

      return keys.length;
    } catch (error) {
      logger.error(`Cache INVALIDATE_PATTERN error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate by tags - removes all keys associated with given tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      const client = this.redis.getClient();
      const keysToDelete: Set<string> = new Set();

      for (const tag of tags) {
        const members = await client.smembers(`${tag}:members`);
        members.forEach(key => keysToDelete.add(key));
      }

      if (keysToDelete.size > 0) {
        await this.deleteMany([...keysToDelete]);

        // Clean up tag sets
        const pipeline = client.pipeline();
        tags.forEach(tag => pipeline.del(`${tag}:members`));
        await pipeline.exec();
      }
    } catch (error) {
      logger.error('Cache INVALIDATE_BY_TAGS error:', error);
    }
  }

  /**
   * Invalidate all cache for a specific entity
   */
  async invalidateEntity(entity: string, id: string): Promise<void> {
    const tag = CacheKeyBuilder.tag.entity(entity as any, id);
    await this.invalidateByTags([tag]);
  }

  // ═══════════════════════════════════════════════════════════════
  // ENTITY-SPECIFIC INVALIDATION HELPERS
  // ═══════════════════════════════════════════════════════════════

  async invalidateStory(storyId: string, slug?: string): Promise<void> {
    const keys = [
      CacheKeyBuilder.story.byId(storyId),
      CacheKeyBuilder.story.tree(storyId),
    ];

    if (slug) {
      keys.push(
        CacheKeyBuilder.story.bySlug(slug),
        CacheKeyBuilder.story.overview(slug),
        CacheKeyBuilder.story.settings(slug),
        CacheKeyBuilder.story.collaborators(slug)
      );
    }

    await this.deleteMany(keys);
    await this.invalidatePattern(CacheKeyBuilder.pattern.allLists('story'));
  }

  async invalidateUser(userId: string, clerkId?: string): Promise<void> {
    const keys = [CacheKeyBuilder.user.byId(userId)];

    if (clerkId) {
      keys.push(
        CacheKeyBuilder.user.byClerkId(clerkId),
        CacheKeyBuilder.user.profile(clerkId),
        CacheKeyBuilder.user.stats(clerkId)
      );
    }

    await this.deleteMany(keys);
  }

  async invalidateChapter(chapterId: string, storyId?: string): Promise<void> {
    const keys = [CacheKeyBuilder.chapter.byId(chapterId)];

    if (storyId) {
      keys.push(
        CacheKeyBuilder.story.tree(storyId),
        CacheKeyBuilder.chapter.byStory(storyId)
      );
    }

    await this.deleteMany(keys);
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  private async addToTags(key: string, tags: string[]): Promise<void> {
    const client = this.redis.getClient();
    const pipeline = client.pipeline();

    tags.forEach(tag => {
      pipeline.sadd(`${tag}:members`, key);
    });

    await pipeline.exec();
  }

  private getDefaultTTL(key: string): number {
    const parsed = CacheKeyBuilder.parse(key);
    return this.DEFAULT_TTL[parsed.entity] ?? 600;
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
    };
  }

  resetStats(): void {
    this.stats = { hits: 0, misses: 0 };
  }
}
```

### 4.2 Enhanced RedisService

Add these methods to the existing `RedisService`:

```typescript
// Additional methods for src/config/services/redis.service.ts

async mget(keys: string[]): Promise<(string | null)[]> {
  if (keys.length === 0) return [];
  return this.getClient().mget(keys);
}

async mset(pairs: Record<string, string>, ttlSeconds?: number): Promise<void> {
  const client = this.getClient();
  const pipeline = client.pipeline();

  Object.entries(pairs).forEach(([key, value]) => {
    if (ttlSeconds) {
      pipeline.set(key, value, 'EX', ttlSeconds);
    } else {
      pipeline.set(key, value);
    }
  });

  await pipeline.exec();
}

async scan(pattern: string, count = 100): Promise<string[]> {
  const client = this.getClient();
  const keys: string[] = [];
  let cursor = '0';

  do {
    const [nextCursor, foundKeys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', count);
    cursor = nextCursor;
    keys.push(...foundKeys);
  } while (cursor !== '0');

  return keys;
}

async pipeline(): Promise<ReturnType<Redis['pipeline']>> {
  return this.getClient().pipeline();
}
```

---

## 5. Cache Invalidation Patterns

### 5.1 Invalidation Matrix

| Action | Keys to Invalidate |
|--------|-------------------|
| Story Created | `story:list:*`, `story:drafts:{creatorId}`, `story:creator:{creatorId}` |
| Story Updated | `story:{id}`, `story:slug:{slug}`, `story:{slug}:overview`, `story:{slug}:settings` |
| Story Published | All story keys + `story:new:last7days`, `story:list:*` |
| Story Deleted | All story keys + chapter keys + collaborator keys |
| Chapter Created | `story:{storyId}:tree`, `chapter:story:{storyId}`, parent chapter keys |
| Chapter Updated | `chapter:{id}`, `story:{storyId}:tree` |
| User Updated | `user:{id}`, `user:clerk:{clerkId}`, `user:{clerkId}:profile` |
| Collaborator Added | `story:{slug}:collaborators`, `collaborator:story:{slug}` |
| Notification Created | `notification:user:{userId}:*`, `notification:{userId}:unread` |

### 5.2 Write-Through Pattern Example

```typescript
// In StoryService

async updateStoryStatus(storyId: string, userId: string, status: TStoryStatus): Promise<IStory> {
  const story = await this.storyRepo.findById(storyId);

  // ... validation logic ...

  const updated = await this.storyRepo.findOneAndUpdate(
    { _id: storyId },
    { status },
    { new: true }
  );

  // Invalidate relevant caches
  await this.cacheService.invalidateStory(storyId, story.slug);

  return updated;
}
```

### 5.3 Transaction-Aware Caching

```typescript
async createStory(input: IStoryCreateDTO & { creatorId: string }): Promise<IStory> {
  return await withTransaction('Creating new story', async (session) => {
    // Skip cache during transaction
    const cacheOptions = { skipCache: true };

    const story = await this.storyRepo.create(
      { ...input, status: StoryStatus.DRAFT },
      { session }
    );

    // ... other operations ...

    return story;
  }).then(async (story) => {
    // Invalidate after successful commit
    await this.cacheService.invalidatePattern(CacheKeyBuilder.pattern.allLists('story'));
    await this.cacheService.invalidatePattern(
      CacheKeyBuilder.story.byCreator(story.creatorId)
    );
    return story;
  });
}
```

---

## 6. Service Integration Guide

### 6.1 Repository-Level Caching (Recommended Approach)

Create a `CachingRepository` wrapper:

```typescript
// src/utils/cachingRepository.ts

import { CacheService } from '@services/cache/cache.service';
import { CacheKeyBuilder, CacheEntity } from '@services/cache/cacheKey.builder';

export class CachingRepository<T> {
  constructor(
    private readonly cache: CacheService,
    private readonly entity: CacheEntity
  ) {}

  async findByIdCached(
    id: string,
    fetcher: () => Promise<T | null>,
    ttl?: number
  ): Promise<T | null> {
    const key = CacheKeyBuilder.entity(this.entity, id);
    return this.cache.getOrSet(key, fetcher, { ttl });
  }

  async findOneCached(
    qualifier: string,
    fetcher: () => Promise<T | null>,
    ttl?: number
  ): Promise<T | null> {
    const key = `${CacheKeyBuilder.entity(this.entity, qualifier)}`;
    return this.cache.getOrSet(key, fetcher, { ttl });
  }

  async findManyCached(
    qualifier: string,
    fetcher: () => Promise<T[]>,
    ttl?: number
  ): Promise<T[]> {
    const key = `${CacheKeyBuilder.entity(this.entity, 'list')}:${qualifier}`;
    return this.cache.getOrSet(key, fetcher, { ttl });
  }
}
```

### 6.2 Service Integration Example

```typescript
// Enhanced StoryService with caching

@singleton()
export class StoryService extends BaseModule {
  constructor(
    @inject(TOKENS.StoryRepository) private readonly storyRepo: StoryRepository,
    @inject(TOKENS.CacheService) private readonly cache: CacheService,
    @inject(TOKENS.StoryCollaboratorService) private readonly collabService: StoryCollaboratorService
  ) {
    super();
  }

  async getStoryBySlug(slug: string): Promise<IStory> {
    const key = CacheKeyBuilder.story.bySlug(slug);

    const story = await this.cache.getOrSet(
      key,
      () => this.storyRepo.findOne({ slug }),
      { ttl: 1800 } // 30 minutes
    );

    if (!story) {
      this.throwNotFoundError('Story not found');
    }

    return story;
  }

  async getStoryOverviewBySlug(slug: string): Promise<IStoryWithCreator> {
    const key = CacheKeyBuilder.story.overview(slug);

    return this.cache.getOrSet(
      key,
      async () => {
        const pipeline = new StoryPipelineBuilder()
          .storyBySlug(slug)
          .storySettings(['genre', 'contentRating'])
          .withStoryCollaborators()
          .build();

        const stories = await this.storyRepo.aggregateStories<IStoryWithCreator>(pipeline);

        if (!stories.length) {
          this.throwNotFoundError('Story not found');
        }

        return stories[0];
      },
      {
        ttl: 900, // 15 minutes for complex aggregations
        tags: [CacheKeyBuilder.tag.story(slug)]
      }
    );
  }

  async getStoryTree(storyId: string): Promise<{ storyId: string; chapters: IChapter[] }> {
    const key = CacheKeyBuilder.story.tree(storyId);

    return this.cache.getOrSet(
      key,
      async () => {
        const story = await this.getStoryById(storyId);

        const pipeline = new ChapterPipelineBuilder()
          .loadChaptersForStory(storyId)
          .getAuthorDetails()
          .buildChapterGraphNode()
          .build();

        const chapters = await this.chapterRepo.aggregateChapters(pipeline);
        const tree = buildChapterTree(chapters);

        return { storyId, chapters: tree };
      },
      { ttl: 600 } // 10 minutes - trees change with chapter additions
    );
  }

  async getNewStories(): Promise<IStory[]> {
    const key = CacheKeyBuilder.story.newStories();

    return this.cache.getOrSet(
      key,
      async () => {
        const pipeline = new StoryPipelineBuilder().lastSevenDaysStories().build();
        return this.storyRepo.aggregateStories(pipeline);
      },
      { ttl: 300 } // 5 minutes - refresh frequently
    );
  }
}
```

---

## 7. Best Practices & Recommendations

### 7.1 TTL Strategy

| Data Type | Recommended TTL | Rationale |
|-----------|-----------------|-----------|
| User profile | 1 hour | Changes infrequently |
| Platform roles | 2 hours | Rarely modified |
| Story metadata | 30 minutes | Moderate change frequency |
| Story tree | 10 minutes | Changes with chapter additions |
| Story lists | 5 minutes | New stories affect lists |
| Notifications | 5 minutes | Real-time requirement |
| Session data | Match session expiry | Security requirement |

### 7.2 Cache Warming

```typescript
// src/services/cache/cacheWarmer.service.ts

@singleton()
export class CacheWarmerService {
  constructor(
    @inject(TOKENS.CacheService) private cache: CacheService,
    @inject(TOKENS.StoryRepository) private storyRepo: StoryRepository,
    @inject(TOKENS.PlatformRoleRepository) private roleRepo: PlatformRoleRepository
  ) {}

  async warmOnStartup(): Promise<void> {
    await Promise.all([
      this.warmPlatformRoles(),
      this.warmPopularStories(),
    ]);
  }

  private async warmPlatformRoles(): Promise<void> {
    const roles = await this.roleRepo.findMany({});
    await this.cache.set(CacheKeyBuilder.platformRole.all(), roles, { ttl: 7200 });
  }

  private async warmPopularStories(): Promise<void> {
    // Pre-cache top 20 stories by activity
    const stories = await this.storyRepo.findMany(
      { status: 'PUBLISHED' },
      {},
      { limit: 20, sort: { 'stats.reads': -1 } }
    );

    for (const story of stories) {
      await this.cache.set(
        CacheKeyBuilder.story.bySlug(story.slug),
        story,
        { ttl: 1800 }
      );
    }
  }
}
```

### 7.3 Monitoring & Observability

```typescript
// Add to CacheService

async getHealthStatus(): Promise<{
  connected: boolean;
  stats: CacheStats;
  memoryUsage?: string;
}> {
  try {
    const client = this.redis.getClient();
    const info = await client.info('memory');
    const usedMemory = info.match(/used_memory_human:(\S+)/)?.[1];

    return {
      connected: true,
      stats: this.getStats(),
      memoryUsage: usedMemory,
    };
  } catch {
    return {
      connected: false,
      stats: this.getStats(),
    };
  }
}
```

### 7.4 Implementation Checklist

- [ ] Create `CacheKeyBuilder` class
- [ ] Implement `CacheService` with DI
- [ ] Register `CacheService` in container
- [ ] Add enhanced Redis methods
- [ ] Integrate caching in high-priority services:
  - [ ] `UserService.findByClerkId`
  - [ ] `StoryService.getStoryBySlug`
  - [ ] `StoryService.getStoryOverviewBySlug`
  - [ ] `StoryService.getStoryTree`
  - [ ] `PlatformRoleService.getRoles`
- [ ] Add invalidation hooks to mutation methods
- [ ] Implement cache warming for startup
- [ ] Add monitoring endpoint for cache health
- [ ] Write integration tests for cache behavior

### 7.5 File Structure

```
src/
├── services/
│   └── cache/
│       ├── cache.service.ts         # Main cache service
│       ├── cacheKey.builder.ts      # Key generation
│       ├── cacheWarmer.service.ts   # Startup warming
│       └── index.ts                 # Exports
├── config/
│   └── services/
│       └── redis.service.ts         # Enhanced Redis client
└── container/
    ├── tokens.ts                    # Add CacheService token
    └── registry.ts                  # Register CacheService
```

---

## Summary

This caching implementation provides:

1. **Centralized Key Management** - `CacheKeyBuilder` ensures consistent, type-safe key generation across all 20+ models
2. **Flexible Invalidation** - Pattern-based and tag-based invalidation for complex scenarios
3. **Service Integration** - `getOrSet` pattern for seamless cache-aside implementation
4. **Transaction Safety** - Skip cache during transactions, invalidate after commit
5. **Scalability** - Designed to handle complex queries and future model growth
6. **Observability** - Built-in stats and health monitoring

The architecture separates concerns clearly: `RedisService` handles low-level Redis operations, `CacheKeyBuilder` manages key generation, and `CacheService` provides high-level caching semantics with automatic TTL management.
