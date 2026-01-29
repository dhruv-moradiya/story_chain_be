# Overview API Data Architecture Guide

A comprehensive guide for designing scalable data structures when your Overview API needs to aggregate data from multiple models (Story, Bookmark, Chapter, User, etc.) with efficient Redis caching.

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Data Structure Design Patterns](#data-structure-design-patterns)
3. [Redis Caching Strategies](#redis-caching-strategies)
4. [Implementation Guide](#implementation-guide)
5. [Cache Invalidation Strategies](#cache-invalidation-strategies)
6. [Performance Optimization](#performance-optimization)
7. [Complete Implementation](#complete-implementation)

---

## Current State Analysis

### Current Overview API Structure

Your current `/slug/:slug/overview` endpoint fetches:

```typescript
interface IStoryOverview {
  // Story Core Data
  title: string;
  slug: string;
  description: string;
  coverImage: { url: string; publicId: string };
  status: StoryStatus;
  publishedAt: Date;
  lastActivityAt: Date;
  tags: string[];

  // Story Stats
  stats: {
    totalChapters: number;
    totalBranches: number;
    totalReads: number;
    totalVotes: number;
    uniqueContributors: number;
    averageRating: number;
  };

  // Settings
  genres: string[];
  contentRating: string;

  // Related Data (via lookups)
  creator: {
    clerkId: string;
    email: string;
    username: string;
    avatarUrl: string;
  };
  collaborators: Array<{
    clerkId: string;
    role: string;
    username: string;
    avatarUrl: string;
  }>;
}
```

### Future Expansion Needs

You want to add:
- **Bookmarks**: User's bookmark status, notes, total bookmarks
- **Chapters**: Featured chapters, recent chapters, chapter navigation
- **User-Specific Data**: Reading progress, voting history
- **Social Data**: Comments count, shares, recommendations
- **Analytics**: View trends, engagement metrics

---

## Data Structure Design Patterns

### Pattern 1: Layered Data Architecture

Organize data into layers based on update frequency and user specificity.

```
┌─────────────────────────────────────────────────────────────┐
│                    OVERVIEW RESPONSE                         │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: STATIC DATA (rarely changes)                       │
│  - Story metadata (title, description, slug)                 │
│  - Creator info                                              │
│  - Settings (genres, content rating)                         │
│  TTL: 1 hour | Cache Key: story:static:{slug}               │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: AGGREGATE DATA (changes with activity)             │
│  - Stats (reads, votes, chapters count)                      │
│  - Collaborators list                                        │
│  - Total bookmarks                                           │
│  TTL: 5 minutes | Cache Key: story:aggregate:{slug}         │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: DYNAMIC DATA (changes frequently)                  │
│  - Trending score                                            │
│  - Recent activity                                           │
│  - Featured chapters                                         │
│  TTL: 1 minute | Cache Key: story:dynamic:{slug}            │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: USER-SPECIFIC DATA (per user)                      │
│  - Bookmark status                                           │
│  - Reading progress                                          │
│  - Vote history                                              │
│  TTL: 5 minutes | Cache Key: story:user:{slug}:{userId}     │
└─────────────────────────────────────────────────────────────┘
```

### Pattern 2: Domain-Driven Cache Keys

Organize cache keys by domain entities.

```typescript
const CacheKeys = {
  // Story Domain
  story: {
    overview: (slug: string) => `story:overview:${slug}`,
    static: (slug: string) => `story:static:${slug}`,
    stats: (storyId: string) => `story:stats:${storyId}`,
    chapters: (storyId: string) => `story:chapters:${storyId}`,
    collaborators: (storyId: string) => `story:collaborators:${storyId}`,
  },

  // Chapter Domain
  chapter: {
    list: (storyId: string) => `chapter:list:${storyId}`,
    featured: (storyId: string) => `chapter:featured:${storyId}`,
    recent: (storyId: string) => `chapter:recent:${storyId}`,
    tree: (storyId: string) => `chapter:tree:${storyId}`,
  },

  // Bookmark Domain
  bookmark: {
    count: (storyId: string) => `bookmark:count:${storyId}`,
    userStatus: (storyId: string, userId: string) => `bookmark:status:${storyId}:${userId}`,
    userList: (userId: string) => `bookmark:list:${userId}`,
  },

  // User Domain
  user: {
    profile: (userId: string) => `user:profile:${userId}`,
    progress: (userId: string, storyId: string) => `user:progress:${userId}:${storyId}`,
    votes: (userId: string, storyId: string) => `user:votes:${userId}:${storyId}`,
  },

  // Invalidation Tags
  tags: {
    story: (storyId: string) => `tag:story:${storyId}`,
    user: (userId: string) => `tag:user:${userId}`,
    chapter: (chapterId: string) => `tag:chapter:${chapterId}`,
  },
};
```

### Pattern 3: Composite Response Builder

Build responses from multiple cache sources.

```typescript
interface OverviewComposite {
  // Core (always present)
  core: StoryCore;

  // Optional sections (loaded based on needs)
  stats?: StoryStats;
  chapters?: ChapterSummary;
  bookmarks?: BookmarkData;
  userContext?: UserContextData;
  social?: SocialData;
}

// Response builder determines what to fetch
interface OverviewRequest {
  slug: string;
  userId?: string;  // For user-specific data
  include?: Array<'stats' | 'chapters' | 'bookmarks' | 'social'>;
}
```

---

## Redis Caching Strategies

### Strategy 1: Separate Cache Per Domain

Store each domain's data in separate cache entries.

```typescript
// Cache Structure
{
  "story:static:my-story-slug": {
    "title": "My Story",
    "description": "...",
    "coverImage": {...},
    "creator": {...}
  },

  "story:stats:507f1f77bcf86cd799439011": {
    "totalChapters": 25,
    "totalReads": 1500,
    "totalVotes": 230,
    "totalBookmarks": 89
  },

  "chapter:featured:507f1f77bcf86cd799439011": [
    { "id": "...", "title": "Chapter 1", "reads": 500 },
    { "id": "...", "title": "Chapter 5", "reads": 450 }
  ],

  "bookmark:status:507f1f77bcf86cd799439011:user123": {
    "isBookmarked": true,
    "note": "Great story!",
    "bookmarkedAt": "2024-01-15T..."
  }
}
```

**Pros:**
- Fine-grained cache invalidation
- Different TTLs per data type
- Parallel fetching possible

**Cons:**
- Multiple Redis calls
- More complex assembly logic

### Strategy 2: Composite Cache with Hash

Use Redis Hash to store related data together.

```typescript
// Cache Structure using Hash
// Key: story:overview:my-story-slug
{
  "core": "{\"title\":\"My Story\",...}",
  "stats": "{\"totalChapters\":25,...}",
  "chapters": "[{\"id\":\"...\"}]",
  "collaborators": "[{\"userId\":\"...\"}]",
  "updatedAt": "1705320000000"
}

// Operations
await redis.hset('story:overview:my-story-slug', {
  core: JSON.stringify(coreData),
  stats: JSON.stringify(statsData),
  chapters: JSON.stringify(chaptersData),
});

// Get specific fields
const [core, stats] = await redis.hmget(
  'story:overview:my-story-slug',
  'core', 'stats'
);

// Update single field
await redis.hset('story:overview:my-story-slug', 'stats', JSON.stringify(newStats));
```

**Pros:**
- Single key for related data
- Atomic updates per field
- Can fetch specific fields only

**Cons:**
- Single TTL for entire hash
- Larger memory footprint if data varies

### Strategy 3: Hybrid Approach (Recommended)

Combine both strategies based on data characteristics.

```typescript
// Global/Shared Data - Separate keys with longer TTL
"story:core:{slug}"              // TTL: 1 hour
"story:stats:{storyId}"          // TTL: 5 minutes
"chapter:list:{storyId}"         // TTL: 5 minutes

// User-Specific Data - Hash per user-story combination
"user:story:{userId}:{storyId}"  // TTL: 10 minutes
{
  "bookmark": "{...}",
  "progress": "{...}",
  "votes": "{...}"
}

// Aggregated Overview Cache - Full response cache
"story:overview:full:{slug}"     // TTL: 2 minutes (for unauthenticated users)
```

---

## Implementation Guide

### Step 1: Define Data Types

```typescript
// src/features/story/types/overview.types.ts

// Base story data (rarely changes)
export interface StoryCore {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImage: ImageData;
  status: StoryStatus;
  publishedAt: Date | null;
  lastActivityAt: Date;
  tags: string[];
  settings: {
    genres: string[];
    contentRating: string;
    isPublic: boolean;
    allowBranching: boolean;
    allowComments: boolean;
  };
  creator: CreatorInfo;
}

// Aggregate statistics (changes with activity)
export interface StoryStats {
  totalChapters: number;
  totalBranches: number;
  totalReads: number;
  totalVotes: number;
  uniqueContributors: number;
  averageRating: number;
  totalBookmarks: number;
  totalComments: number;
}

// Chapter summary data
export interface ChapterSummary {
  featured: ChapterPreview[];
  recent: ChapterPreview[];
  totalPublished: number;
  totalDrafts: number;
}

export interface ChapterPreview {
  id: string;
  title: string;
  chapterNumber: number;
  reads: number;
  score: number;
  publishedAt: Date;
  author: {
    username: string;
    avatarUrl: string;
  };
}

// User-specific context
export interface UserStoryContext {
  bookmark: {
    isBookmarked: boolean;
    note?: string;
    bookmarkedAt?: Date;
  } | null;
  readingProgress: {
    lastChapterId: string;
    lastChapterNumber: number;
    lastReadAt: Date;
    completionPercentage: number;
  } | null;
  votes: {
    upvotedChapterIds: string[];
    downvotedChapterIds: string[];
  };
  isCollaborator: boolean;
  collaboratorRole?: string;
}

// Collaborator data
export interface CollaboratorInfo {
  userId: string;
  username: string;
  avatarUrl: string;
  role: CollaboratorRole;
  joinedAt: Date;
}

// Complete overview response
export interface StoryOverviewResponse {
  core: StoryCore;
  stats: StoryStats;
  collaborators: CollaboratorInfo[];
  chapters?: ChapterSummary;
  userContext?: UserStoryContext;
  meta: {
    cachedAt: number;
    dataFreshness: {
      core: 'fresh' | 'cached';
      stats: 'fresh' | 'cached';
      chapters: 'fresh' | 'cached';
      userContext: 'fresh' | 'cached';
    };
  };
}
```

### Step 2: Create Cache Key Manager

```typescript
// src/shared/services/cache-keys.service.ts
import { injectable } from 'tsyringe';

@injectable()
export class CacheKeyService {
  private readonly prefix = 'storychain';
  private readonly version = 'v1';

  private buildKey(...parts: string[]): string {
    return [this.prefix, this.version, ...parts].join(':');
  }

  // Story keys
  storyCore(slug: string): string {
    return this.buildKey('story', 'core', slug);
  }

  storyStats(storyId: string): string {
    return this.buildKey('story', 'stats', storyId);
  }

  storyOverview(slug: string): string {
    return this.buildKey('story', 'overview', slug);
  }

  storyCollaborators(storyId: string): string {
    return this.buildKey('story', 'collaborators', storyId);
  }

  // Chapter keys
  chapterList(storyId: string): string {
    return this.buildKey('chapter', 'list', storyId);
  }

  chapterFeatured(storyId: string): string {
    return this.buildKey('chapter', 'featured', storyId);
  }

  chapterRecent(storyId: string): string {
    return this.buildKey('chapter', 'recent', storyId);
  }

  // Bookmark keys
  bookmarkCount(storyId: string): string {
    return this.buildKey('bookmark', 'count', storyId);
  }

  userBookmarkStatus(storyId: string, userId: string): string {
    return this.buildKey('bookmark', 'user', storyId, userId);
  }

  // User context keys
  userStoryContext(userId: string, storyId: string): string {
    return this.buildKey('user', 'context', userId, storyId);
  }

  userReadingProgress(userId: string, storyId: string): string {
    return this.buildKey('user', 'progress', userId, storyId);
  }

  // Invalidation tag keys
  tagStory(storyId: string): string {
    return this.buildKey('tag', 'story', storyId);
  }

  tagUser(userId: string): string {
    return this.buildKey('tag', 'user', userId);
  }

  tagChapter(chapterId: string): string {
    return this.buildKey('tag', 'chapter', chapterId);
  }
}
```

### Step 3: Create Overview Cache Service

```typescript
// src/features/story/services/overview-cache.service.ts
import { injectable, inject } from 'tsyringe';
import { Tokens } from '@/container/tokens';
import type { RedisService } from '@/config/services/redis.service';
import { CacheKeyService } from '@/shared/services/cache-keys.service';
import type {
  StoryCore,
  StoryStats,
  ChapterSummary,
  UserStoryContext,
  CollaboratorInfo,
  StoryOverviewResponse,
} from '../types/overview.types';

interface CacheTTL {
  core: number;
  stats: number;
  chapters: number;
  collaborators: number;
  userContext: number;
  fullOverview: number;
}

@injectable()
export class OverviewCacheService {
  private readonly ttl: CacheTTL = {
    core: 3600,         // 1 hour - rarely changes
    stats: 300,         // 5 minutes - changes with activity
    chapters: 300,      // 5 minutes
    collaborators: 600, // 10 minutes
    userContext: 300,   // 5 minutes
    fullOverview: 120,  // 2 minutes - full response cache
  };

  constructor(
    @inject(Tokens.RedisService) private readonly redis: RedisService,
    @inject(CacheKeyService) private readonly keys: CacheKeyService
  ) {}

  // ============ Core Data ============

  async getCoreData(slug: string): Promise<StoryCore | null> {
    const client = this.redis.getClient();
    const data = await client.get(this.keys.storyCore(slug));
    return data ? JSON.parse(data) : null;
  }

  async setCoreData(slug: string, data: StoryCore, tags: string[] = []): Promise<void> {
    const client = this.redis.getClient();
    const key = this.keys.storyCore(slug);
    const pipeline = client.pipeline();

    pipeline.set(key, JSON.stringify(data), 'EX', this.ttl.core);

    // Add to invalidation tags
    for (const tag of tags) {
      pipeline.sadd(tag, key);
      pipeline.expire(tag, this.ttl.core + 60);
    }

    await pipeline.exec();
  }

  // ============ Stats Data ============

  async getStatsData(storyId: string): Promise<StoryStats | null> {
    const client = this.redis.getClient();
    const data = await client.get(this.keys.storyStats(storyId));
    return data ? JSON.parse(data) : null;
  }

  async setStatsData(storyId: string, data: StoryStats): Promise<void> {
    const client = this.redis.getClient();
    await client.set(
      this.keys.storyStats(storyId),
      JSON.stringify(data),
      'EX',
      this.ttl.stats
    );
  }

  async incrementStatField(
    storyId: string,
    field: keyof StoryStats,
    delta: number = 1
  ): Promise<void> {
    const client = this.redis.getClient();
    const key = this.keys.storyStats(storyId);

    // Use Lua script for atomic increment of JSON field
    const script = `
      local data = redis.call('GET', KEYS[1])
      if data then
        local obj = cjson.decode(data)
        obj['${field}'] = (obj['${field}'] or 0) + tonumber(ARGV[1])
        local ttl = redis.call('TTL', KEYS[1])
        if ttl > 0 then
          redis.call('SET', KEYS[1], cjson.encode(obj), 'EX', ttl)
        end
        return obj['${field}']
      end
      return nil
    `;

    await client.eval(script, 1, key, delta.toString());
  }

  // ============ Chapter Data ============

  async getChapterSummary(storyId: string): Promise<ChapterSummary | null> {
    const client = this.redis.getClient();
    const pipeline = client.pipeline();

    pipeline.get(this.keys.chapterFeatured(storyId));
    pipeline.get(this.keys.chapterRecent(storyId));

    const [[, featured], [, recent]] = await pipeline.exec() as [
      [null, string | null],
      [null, string | null]
    ];

    if (!featured && !recent) return null;

    return {
      featured: featured ? JSON.parse(featured) : [],
      recent: recent ? JSON.parse(recent) : [],
      totalPublished: 0, // Will be set from stats
      totalDrafts: 0,
    };
  }

  async setChapterSummary(storyId: string, data: ChapterSummary): Promise<void> {
    const client = this.redis.getClient();
    const pipeline = client.pipeline();

    pipeline.set(
      this.keys.chapterFeatured(storyId),
      JSON.stringify(data.featured),
      'EX',
      this.ttl.chapters
    );
    pipeline.set(
      this.keys.chapterRecent(storyId),
      JSON.stringify(data.recent),
      'EX',
      this.ttl.chapters
    );

    await pipeline.exec();
  }

  // ============ Collaborators ============

  async getCollaborators(storyId: string): Promise<CollaboratorInfo[] | null> {
    const client = this.redis.getClient();
    const data = await client.get(this.keys.storyCollaborators(storyId));
    return data ? JSON.parse(data) : null;
  }

  async setCollaborators(storyId: string, data: CollaboratorInfo[]): Promise<void> {
    const client = this.redis.getClient();
    await client.set(
      this.keys.storyCollaborators(storyId),
      JSON.stringify(data),
      'EX',
      this.ttl.collaborators
    );
  }

  // ============ User Context ============

  async getUserContext(userId: string, storyId: string): Promise<UserStoryContext | null> {
    const client = this.redis.getClient();
    const data = await client.get(this.keys.userStoryContext(userId, storyId));
    return data ? JSON.parse(data) : null;
  }

  async setUserContext(
    userId: string,
    storyId: string,
    data: UserStoryContext
  ): Promise<void> {
    const client = this.redis.getClient();
    await client.set(
      this.keys.userStoryContext(userId, storyId),
      JSON.stringify(data),
      'EX',
      this.ttl.userContext
    );
  }

  // ============ Full Overview (for unauthenticated) ============

  async getFullOverview(slug: string): Promise<StoryOverviewResponse | null> {
    const client = this.redis.getClient();
    const data = await client.get(this.keys.storyOverview(slug));
    return data ? JSON.parse(data) : null;
  }

  async setFullOverview(slug: string, data: StoryOverviewResponse): Promise<void> {
    const client = this.redis.getClient();
    await client.set(
      this.keys.storyOverview(slug),
      JSON.stringify(data),
      'EX',
      this.ttl.fullOverview
    );
  }

  // ============ Batch Operations ============

  async getMultipleOverviews(slugs: string[]): Promise<Map<string, StoryOverviewResponse | null>> {
    const client = this.redis.getClient();
    const keys = slugs.map(slug => this.keys.storyOverview(slug));
    const values = await client.mget(...keys);

    const result = new Map<string, StoryOverviewResponse | null>();
    slugs.forEach((slug, index) => {
      result.set(slug, values[index] ? JSON.parse(values[index]!) : null);
    });

    return result;
  }

  // ============ Invalidation ============

  async invalidateStory(storyId: string, slug: string): Promise<void> {
    const client = this.redis.getClient();
    const pipeline = client.pipeline();

    // Delete all story-related caches
    pipeline.del(this.keys.storyCore(slug));
    pipeline.del(this.keys.storyStats(storyId));
    pipeline.del(this.keys.storyOverview(slug));
    pipeline.del(this.keys.storyCollaborators(storyId));
    pipeline.del(this.keys.chapterFeatured(storyId));
    pipeline.del(this.keys.chapterRecent(storyId));

    // Delete all keys tagged with this story
    const tagKey = this.keys.tagStory(storyId);
    const taggedKeys = await client.smembers(tagKey);
    if (taggedKeys.length > 0) {
      pipeline.del(...taggedKeys);
    }
    pipeline.del(tagKey);

    await pipeline.exec();
  }

  async invalidateUserContext(userId: string, storyId: string): Promise<void> {
    const client = this.redis.getClient();
    await client.del(this.keys.userStoryContext(userId, storyId));
  }

  async invalidateChapters(storyId: string): Promise<void> {
    const client = this.redis.getClient();
    const pipeline = client.pipeline();

    pipeline.del(this.keys.chapterFeatured(storyId));
    pipeline.del(this.keys.chapterRecent(storyId));
    pipeline.del(this.keys.chapterList(storyId));

    await pipeline.exec();
  }
}
```

### Step 4: Create Overview Data Aggregator

```typescript
// src/features/story/services/overview-aggregator.service.ts
import { injectable, inject } from 'tsyringe';
import { Tokens } from '@/container/tokens';
import { OverviewCacheService } from './overview-cache.service';
import type { StoryRepository } from '../repositories/story.repository';
import type { ChapterRepository } from '@/features/chapter/repositories/chapter.repository';
import type { BookmarkRepository } from '@/features/bookmark/repositories/bookmark.repository';
import type {
  StoryCore,
  StoryStats,
  ChapterSummary,
  UserStoryContext,
  CollaboratorInfo,
  StoryOverviewResponse,
} from '../types/overview.types';

interface AggregatorOptions {
  includeChapters?: boolean;
  includeUserContext?: boolean;
  userId?: string;
}

@injectable()
export class OverviewAggregatorService {
  constructor(
    @inject(OverviewCacheService) private readonly cache: OverviewCacheService,
    @inject(Tokens.StoryRepository) private readonly storyRepo: StoryRepository,
    @inject(Tokens.ChapterRepository) private readonly chapterRepo: ChapterRepository,
    @inject(Tokens.BookmarkRepository) private readonly bookmarkRepo: BookmarkRepository
  ) {}

  async getOverview(
    slug: string,
    options: AggregatorOptions = {}
  ): Promise<StoryOverviewResponse> {
    const freshness: StoryOverviewResponse['meta']['dataFreshness'] = {
      core: 'cached',
      stats: 'cached',
      chapters: 'cached',
      userContext: 'cached',
    };

    // Parallel fetch from cache
    const [
      cachedCore,
      cachedStats,
      cachedChapters,
      cachedCollaborators,
      cachedUserContext,
    ] = await Promise.all([
      this.cache.getCoreData(slug),
      this.fetchStatsWithStoryId(slug),
      options.includeChapters ? this.fetchChaptersWithStoryId(slug) : null,
      this.fetchCollaboratorsWithStoryId(slug),
      options.includeUserContext && options.userId
        ? this.fetchUserContextWithStoryId(slug, options.userId)
        : null,
    ]);

    // Determine what needs to be fetched fresh
    let core = cachedCore;
    let storyId: string | null = null;

    if (!core) {
      freshness.core = 'fresh';
      const freshCore = await this.fetchCoreFromDB(slug);
      core = freshCore;
      storyId = freshCore.id;

      // Cache in background
      this.cache.setCoreData(slug, freshCore, [
        this.cache['keys'].tagStory(freshCore.id),
      ]).catch(console.error);
    } else {
      storyId = core.id;
    }

    // Fetch stats if not cached
    let stats = cachedStats;
    if (!stats) {
      freshness.stats = 'fresh';
      stats = await this.fetchStatsFromDB(storyId);
      this.cache.setStatsData(storyId, stats).catch(console.error);
    }

    // Fetch collaborators if not cached
    let collaborators = cachedCollaborators;
    if (!collaborators) {
      collaborators = await this.fetchCollaboratorsFromDB(storyId);
      this.cache.setCollaborators(storyId, collaborators).catch(console.error);
    }

    // Fetch chapters if requested and not cached
    let chapters: ChapterSummary | undefined;
    if (options.includeChapters) {
      if (cachedChapters) {
        chapters = cachedChapters;
      } else {
        freshness.chapters = 'fresh';
        chapters = await this.fetchChaptersFromDB(storyId);
        this.cache.setChapterSummary(storyId, chapters).catch(console.error);
      }
    }

    // Fetch user context if requested and not cached
    let userContext: UserStoryContext | undefined;
    if (options.includeUserContext && options.userId) {
      if (cachedUserContext) {
        userContext = cachedUserContext;
      } else {
        freshness.userContext = 'fresh';
        userContext = await this.fetchUserContextFromDB(storyId, options.userId);
        this.cache.setUserContext(options.userId, storyId, userContext).catch(console.error);
      }
    }

    return {
      core,
      stats,
      collaborators,
      chapters,
      userContext,
      meta: {
        cachedAt: Date.now(),
        dataFreshness: freshness,
      },
    };
  }

  // Helper methods to handle slug-to-storyId resolution
  private async fetchStatsWithStoryId(slug: string): Promise<StoryStats | null> {
    const core = await this.cache.getCoreData(slug);
    if (!core) return null;
    return this.cache.getStatsData(core.id);
  }

  private async fetchChaptersWithStoryId(slug: string): Promise<ChapterSummary | null> {
    const core = await this.cache.getCoreData(slug);
    if (!core) return null;
    return this.cache.getChapterSummary(core.id);
  }

  private async fetchCollaboratorsWithStoryId(slug: string): Promise<CollaboratorInfo[] | null> {
    const core = await this.cache.getCoreData(slug);
    if (!core) return null;
    return this.cache.getCollaborators(core.id);
  }

  private async fetchUserContextWithStoryId(
    slug: string,
    userId: string
  ): Promise<UserStoryContext | null> {
    const core = await this.cache.getCoreData(slug);
    if (!core) return null;
    return this.cache.getUserContext(userId, core.id);
  }

  // Database fetch methods
  private async fetchCoreFromDB(slug: string): Promise<StoryCore> {
    // Use your existing pipeline builder
    const result = await this.storyRepo.aggregateStories([
      { $match: { slug } },
      // ... your existing pipeline stages
    ]);

    if (!result.length) {
      throw new Error(`Story not found: ${slug}`);
    }

    return this.mapToStoryCore(result[0]);
  }

  private async fetchStatsFromDB(storyId: string): Promise<StoryStats> {
    // Aggregate stats from story and related collections
    const [storyStats, bookmarkCount, commentCount] = await Promise.all([
      this.storyRepo.getStats(storyId),
      this.bookmarkRepo.countByStory(storyId),
      // this.commentRepo.countByStory(storyId), // When you add comments
    ]);

    return {
      ...storyStats,
      totalBookmarks: bookmarkCount,
      totalComments: commentCount || 0,
    };
  }

  private async fetchChaptersFromDB(storyId: string): Promise<ChapterSummary> {
    const [featured, recent, counts] = await Promise.all([
      this.chapterRepo.getFeatured(storyId, 5),
      this.chapterRepo.getRecent(storyId, 5),
      this.chapterRepo.getCounts(storyId),
    ]);

    return {
      featured: featured.map(this.mapToChapterPreview),
      recent: recent.map(this.mapToChapterPreview),
      totalPublished: counts.published,
      totalDrafts: counts.drafts,
    };
  }

  private async fetchCollaboratorsFromDB(storyId: string): Promise<CollaboratorInfo[]> {
    // Use your existing collaborator lookup
    return this.storyRepo.getCollaborators(storyId);
  }

  private async fetchUserContextFromDB(
    storyId: string,
    userId: string
  ): Promise<UserStoryContext> {
    const [bookmark, progress, votes, collaborator] = await Promise.all([
      this.bookmarkRepo.findByUserAndStory(userId, storyId),
      // this.progressRepo.findByUserAndStory(userId, storyId),
      this.chapterRepo.getUserVotes(userId, storyId),
      this.storyRepo.getCollaboratorRole(storyId, userId),
    ]);

    return {
      bookmark: bookmark
        ? {
            isBookmarked: true,
            note: bookmark.note,
            bookmarkedAt: bookmark.createdAt,
          }
        : null,
      readingProgress: null, // progress ? ... : null,
      votes: {
        upvotedChapterIds: votes.upvoted,
        downvotedChapterIds: votes.downvoted,
      },
      isCollaborator: !!collaborator,
      collaboratorRole: collaborator?.role,
    };
  }

  // Mappers
  private mapToStoryCore(doc: any): StoryCore {
    return {
      id: doc._id.toString(),
      title: doc.title,
      slug: doc.slug,
      description: doc.description,
      coverImage: doc.coverImage,
      status: doc.status,
      publishedAt: doc.publishedAt,
      lastActivityAt: doc.lastActivityAt,
      tags: doc.tags || [],
      settings: {
        genres: doc.settings?.genres || [],
        contentRating: doc.settings?.contentRating || 'GENERAL',
        isPublic: doc.settings?.isPublic ?? true,
        allowBranching: doc.settings?.allowBranching ?? true,
        allowComments: doc.settings?.allowComments ?? true,
      },
      creator: doc.creator,
    };
  }

  private mapToChapterPreview(doc: any): any {
    return {
      id: doc._id.toString(),
      title: doc.title,
      chapterNumber: doc.chapterNumber,
      reads: doc.reads || 0,
      score: doc.score || 0,
      publishedAt: doc.publishedAt,
      author: {
        username: doc.author?.username || 'Unknown',
        avatarUrl: doc.author?.avatarUrl,
      },
    };
  }
}
```

---

## Cache Invalidation Strategies

### Event-Driven Invalidation

```typescript
// src/features/story/events/story.events.ts
import { injectable, inject } from 'tsyringe';
import { OverviewCacheService } from '../services/overview-cache.service';

export enum StoryEventType {
  CREATED = 'story.created',
  UPDATED = 'story.updated',
  DELETED = 'story.deleted',
  STATS_CHANGED = 'story.stats_changed',
  CHAPTER_ADDED = 'story.chapter_added',
  CHAPTER_REMOVED = 'story.chapter_removed',
  COLLABORATOR_ADDED = 'story.collaborator_added',
  COLLABORATOR_REMOVED = 'story.collaborator_removed',
}

@injectable()
export class StoryEventHandler {
  constructor(
    @inject(OverviewCacheService) private readonly cache: OverviewCacheService
  ) {}

  async handle(event: StoryEventType, payload: any): Promise<void> {
    const { storyId, slug, userId } = payload;

    switch (event) {
      case StoryEventType.UPDATED:
        // Invalidate core and full overview
        await this.cache.invalidateStory(storyId, slug);
        break;

      case StoryEventType.STATS_CHANGED:
        // Only invalidate stats - core data unchanged
        await this.cache.setStatsData(storyId, null as any); // Force refresh
        break;

      case StoryEventType.CHAPTER_ADDED:
      case StoryEventType.CHAPTER_REMOVED:
        // Invalidate chapters and stats
        await Promise.all([
          this.cache.invalidateChapters(storyId),
          this.cache.incrementStatField(storyId, 'totalChapters',
            event === StoryEventType.CHAPTER_ADDED ? 1 : -1),
        ]);
        break;

      case StoryEventType.COLLABORATOR_ADDED:
      case StoryEventType.COLLABORATOR_REMOVED:
        // Invalidate collaborators cache
        const client = this.cache['redis'].getClient();
        await client.del(this.cache['keys'].storyCollaborators(storyId));
        break;

      default:
        // Full invalidation for unknown events
        await this.cache.invalidateStory(storyId, slug);
    }
  }
}
```

### Invalidation on Write Operations

```typescript
// src/features/story/services/story.service.ts
@injectable()
export class StoryService {
  constructor(
    @inject(OverviewCacheService) private readonly cache: OverviewCacheService,
    @inject(StoryEventHandler) private readonly events: StoryEventHandler,
    // ... other dependencies
  ) {}

  async updateStory(slug: string, data: UpdateStoryDto): Promise<Story> {
    const story = await this.storyRepo.update(slug, data);

    // Invalidate cache
    await this.events.handle(StoryEventType.UPDATED, {
      storyId: story._id.toString(),
      slug: story.slug,
    });

    return story;
  }

  async incrementReads(storyId: string): Promise<void> {
    await this.storyRepo.incrementReads(storyId);

    // Update cache atomically instead of invalidating
    await this.cache.incrementStatField(storyId, 'totalReads', 1);
  }
}
```

### Scheduled Cache Warming

```typescript
// src/jobs/cache-warmer.job.ts
import { injectable, inject } from 'tsyringe';
import { OverviewAggregatorService } from '@/features/story/services/overview-aggregator.service';
import type { StoryRepository } from '@/features/story/repositories/story.repository';

@injectable()
export class CacheWarmerJob {
  constructor(
    @inject(OverviewAggregatorService) private readonly aggregator: OverviewAggregatorService,
    @inject(Tokens.StoryRepository) private readonly storyRepo: StoryRepository
  ) {}

  async warmPopularStories(): Promise<void> {
    // Get top 100 most viewed stories
    const popularStories = await this.storyRepo.findPopular(100);

    // Warm cache in batches
    const batchSize = 10;
    for (let i = 0; i < popularStories.length; i += batchSize) {
      const batch = popularStories.slice(i, i + batchSize);

      await Promise.all(
        batch.map(story =>
          this.aggregator.getOverview(story.slug, {
            includeChapters: true,
          }).catch(err => {
            console.error(`Failed to warm cache for ${story.slug}:`, err);
          })
        )
      );

      // Small delay between batches to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async warmRecentlyUpdated(): Promise<void> {
    // Get stories updated in last hour
    const recentStories = await this.storyRepo.findRecentlyUpdated(50);

    await Promise.all(
      recentStories.map(story =>
        this.aggregator.getOverview(story.slug).catch(console.error)
      )
    );
  }
}
```

---

## Performance Optimization

### 1. Conditional Data Loading

```typescript
// Controller: Only load what's needed
async getOverview(request: FastifyRequest, reply: FastifyReply) {
  const { slug } = request.params;
  const { include } = request.query; // ?include=chapters,userContext

  const includeOptions = {
    includeChapters: include?.includes('chapters'),
    includeUserContext: include?.includes('userContext'),
    userId: request.user?.id,
  };

  const overview = await this.aggregator.getOverview(slug, includeOptions);

  return reply.send(overview);
}
```

### 2. Response Compression

```typescript
// Use Fastify compression
import fastifyCompress from '@fastify/compress';

app.register(fastifyCompress, {
  global: true,
  encodings: ['gzip', 'deflate'],
  threshold: 1024, // Only compress responses > 1KB
});
```

### 3. ETag Support for Conditional Requests

```typescript
// Add ETag header based on cache timestamp
async getOverview(request: FastifyRequest, reply: FastifyReply) {
  const { slug } = request.params;

  const overview = await this.aggregator.getOverview(slug);
  const etag = `"${overview.meta.cachedAt}"`;

  // Check If-None-Match header
  if (request.headers['if-none-match'] === etag) {
    return reply.status(304).send();
  }

  reply.header('ETag', etag);
  reply.header('Cache-Control', 'private, max-age=60');

  return reply.send(overview);
}
```

### 4. Pagination for Large Collections

```typescript
interface ChapterListOptions {
  page: number;
  limit: number;
  sort: 'recent' | 'popular' | 'chronological';
}

async getChapters(storyId: string, options: ChapterListOptions) {
  const cacheKey = `chapter:list:${storyId}:${options.sort}:${options.page}`;

  return this.cache.getOrSet(cacheKey, async () => {
    return this.chapterRepo.findPaginated(storyId, options);
  }, { ttl: 300 });
}
```

---

## Complete Implementation

### Updated Controller

```typescript
// src/features/story/controllers/story.controller.ts
import { injectable, inject } from 'tsyringe';
import { Tokens } from '@/container/tokens';
import { OverviewAggregatorService } from '../services/overview-aggregator.service';
import type { FastifyRequest, FastifyReply } from 'fastify';

interface OverviewQuery {
  include?: string;
}

interface OverviewParams {
  slug: string;
}

@injectable()
export class StoryController {
  constructor(
    @inject(OverviewAggregatorService) private readonly aggregator: OverviewAggregatorService
  ) {}

  async getStoryOverview(
    request: FastifyRequest<{
      Params: OverviewParams;
      Querystring: OverviewQuery;
    }>,
    reply: FastifyReply
  ) {
    const { slug } = request.params;
    const { include } = request.query;

    // Parse include parameter
    const includeSet = new Set(include?.split(',').map(s => s.trim()) || []);

    const overview = await this.aggregator.getOverview(slug, {
      includeChapters: includeSet.has('chapters'),
      includeUserContext: includeSet.has('userContext') && !!request.user,
      userId: request.user?.id,
    });

    // Set caching headers
    const etag = `"${overview.meta.cachedAt}"`;

    if (request.headers['if-none-match'] === etag) {
      return reply.status(304).send();
    }

    reply.header('ETag', etag);
    reply.header('Cache-Control', request.user
      ? 'private, max-age=60'
      : 'public, max-age=120'
    );

    return reply.send({
      success: true,
      data: overview,
    });
  }
}
```

### Updated Routes

```typescript
// src/features/story/routes/story.routes.ts
// Add query schema for validation
const overviewQuerySchema = {
  type: 'object',
  properties: {
    include: {
      type: 'string',
      description: 'Comma-separated list: chapters,userContext',
    },
  },
};

app.get(
  '/slug/:slug/overview',
  {
    schema: {
      params: slugParamSchema,
      querystring: overviewQuerySchema,
      response: {
        200: overviewResponseSchema,
      },
    },
    preHandler: [optionalAuthMiddleware], // Auth optional for user context
  },
  controller.getStoryOverview.bind(controller)
);
```

---

## Summary

### Key Takeaways

1. **Layer your data** by update frequency and user specificity
2. **Use separate cache keys** for different data domains
3. **Implement fine-grained invalidation** to avoid cache stampedes
4. **Load data conditionally** based on API request parameters
5. **Use Redis data structures appropriately**:
   - Strings for simple JSON objects
   - Hashes for related field groups
   - Sorted Sets for rankings/leaderboards
   - Sets for tags/invalidation tracking

### Cache Key Naming Convention

```
{app}:{version}:{domain}:{entity}:{identifier}:{attribute?}

Examples:
storychain:v1:story:core:my-story-slug
storychain:v1:story:stats:507f1f77bcf86cd799439011
storychain:v1:user:context:user123:507f1f77bcf86cd799439011
storychain:v1:tag:story:507f1f77bcf86cd799439011
```

### TTL Strategy Summary

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| Static data (title, description) | 1 hour | Rarely changes |
| Stats (reads, votes) | 5 minutes | Changes with activity |
| User context | 5 minutes | Personalized, changes with actions |
| Full overview | 2 minutes | Composite, balance freshness |
| Leaderboards | 1 minute | Frequently updated |

### Next Steps

1. Implement the `CacheService` in `src/shared/services/cache.service.ts`
2. Add `CacheKeyService` for consistent key management
3. Create `OverviewCacheService` for domain-specific caching
4. Build `OverviewAggregatorService` to compose responses
5. Set up event handlers for cache invalidation
6. Add cache warming job for popular content
7. Monitor cache hit rates and adjust TTLs accordingly
