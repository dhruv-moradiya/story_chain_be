# Query Optimization Report

## Executive Summary

This report provides a comprehensive guide for optimizing database queries in the StoryChain application. It covers MongoDB-specific optimization techniques, aggregation pipeline best practices, indexing strategies, and practical code examples tailored to your existing architecture.

---

## Table of Contents

1. [Understanding Query Performance](#1-understanding-query-performance)
2. [Indexing Strategies](#2-indexing-strategies)
3. [Aggregation Pipeline Optimization](#3-aggregation-pipeline-optimization)
4. [Query Pattern Optimization](#4-query-pattern-optimization)
5. [Pipeline Builder Enhancements](#5-pipeline-builder-enhancements)
6. [Advanced Optimization Techniques](#6-advanced-optimization-techniques)
7. [Monitoring & Profiling](#7-monitoring--profiling)
8. [Recommended Implementations](#8-recommended-implementations)

---

## 1. Understanding Query Performance

### 1.1 How MongoDB Executes Queries

```
Query Execution Flow:

┌─────────────────┐
│  Query Request  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Query Planner  │ ← Analyzes available indexes
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Choose Best Plan│ ← Selects optimal execution strategy
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Execute Query   │ ← Uses index or collection scan
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Return Results  │
└─────────────────┘
```

### 1.2 Query Performance Indicators

| Indicator | Good | Bad |
|-----------|------|-----|
| Index Used | `IXSCAN` | `COLLSCAN` |
| Documents Examined | ≈ Documents Returned | >> Documents Returned |
| Execution Time | < 100ms | > 1000ms |
| Keys Examined | ≈ Documents Returned | >> Documents Returned |

### 1.3 Current Model Complexity

Your application has complex relationships:

```
Story (1) ──────────────── (N) Chapter
   │                            │
   │                            └── (N) ChapterVersion
   │                            └── (N) ChapterAutoSave
   │                            └── (N) Comment
   │                            └── (N) Vote
   │
   └── (N) StoryCollaborator ──── (1) User
   └── (N) PullRequest ────────── (N) PRComment
                                  (N) PRReview
                                  (N) PRVote
```

---

## 2. Indexing Strategies

### 2.1 Current Indexes Analysis

**Story Model - Current Indexes:**
```typescript
// Field-level indexes
title: { index: 'text' }
slug: { unique: true, index: true }
creatorId: { index: true }
trendingScore: { index: -1 }
lastActivityAt: { index: -1 }

// Compound indexes
{ creatorId: 1, createdAt: -1 }
{ trendingScore: -1, publishedAt: -1 }
{ 'stats.totalReads': -1 }
{ tags: 1 }
{ title: 'text', description: 'text' }
```

**Chapter Model - Current Indexes:**
```typescript
// Field-level indexes
storyId: { index: true }
parentChapterId: { index: true }
authorId: { index: true }

// Compound indexes
{ storyId: 1, parentChapterId: 1 }
{ storyId: 1, depth: 1 }
{ authorId: 1, createdAt: -1 }
{ 'votes.score': -1 }
{ status: 1 }
```

### 2.2 Recommended Additional Indexes

```typescript
// src/models/story.model.ts - Add these indexes

// For filtering published stories by genre
storySchema.index({ status: 1, 'settings.genre': 1, createdAt: -1 });

// For trending published stories
storySchema.index({ status: 1, trendingScore: -1 });

// For user's stories with status filter
storySchema.index({ creatorId: 1, status: 1, createdAt: -1 });

// For tag-based searches with status
storySchema.index({ tags: 1, status: 1, createdAt: -1 });
```

```typescript
// src/models/chapter.model.ts - Add these indexes

// For loading story tree efficiently
chapterSchema.index({ storyId: 1, status: 1, createdAt: 1 });

// For finding branches (children of a parent)
chapterSchema.index({ parentChapterId: 1, status: 1, 'votes.score': -1 });

// For author's contributions across stories
chapterSchema.index({ authorId: 1, storyId: 1, createdAt: -1 });

// For pending approval chapters
chapterSchema.index({ storyId: 1, 'pullRequest.status': 1 });
```

```typescript
// src/models/storyCollaborator.model.ts - Add these indexes

// For checking user's role on a story
storyCollaboratorSchema.index({ slug: 1, userId: 1 }, { unique: true });

// For listing user's collaborations
storyCollaboratorSchema.index({ userId: 1, status: 1, createdAt: -1 });

// For story's team listing
storyCollaboratorSchema.index({ slug: 1, status: 1, role: 1 });
```

### 2.3 Index Creation Best Practices

```typescript
// src/utils/indexManager.ts

import mongoose from 'mongoose';
import { logger } from './logger';

export async function ensureIndexes(): Promise<void> {
  const models = mongoose.modelNames();

  for (const modelName of models) {
    const model = mongoose.model(modelName);
    try {
      await model.ensureIndexes();
      logger.info(`Indexes ensured for ${modelName}`);
    } catch (error) {
      logger.error(`Failed to ensure indexes for ${modelName}:`, error);
    }
  }
}

export async function analyzeIndexUsage(
  collectionName: string
): Promise<IndexStats[]> {
  const db = mongoose.connection.db;
  const stats = await db.collection(collectionName).aggregate([
    { $indexStats: {} }
  ]).toArray();

  return stats.map(stat => ({
    name: stat.name,
    accesses: stat.accesses.ops,
    since: stat.accesses.since,
  }));
}

interface IndexStats {
  name: string;
  accesses: number;
  since: Date;
}
```

---

## 3. Aggregation Pipeline Optimization

### 3.1 Pipeline Stage Order Matters

**Rule: Filter early, transform late**

```typescript
// ❌ BAD: Transforms all documents before filtering
const badPipeline = [
  { $lookup: { from: 'users', ... } },  // Joins ALL documents
  { $set: { fullName: { $concat: [...] } } },  // Transforms ALL
  { $match: { status: 'PUBLISHED' } },  // Filters AFTER expensive ops
];

// ✅ GOOD: Filters first, then transforms only matching documents
const goodPipeline = [
  { $match: { status: 'PUBLISHED' } },  // Filters FIRST (uses index)
  { $lookup: { from: 'users', ... } },  // Joins only matching docs
  { $set: { fullName: { $concat: [...] } } },  // Transforms only matching
];
```

### 3.2 Optimizing $lookup Operations

**Basic $lookup vs Optimized $lookup:**

```typescript
// ❌ SLOW: Fetches entire user document
{
  $lookup: {
    from: 'users',
    localField: 'creatorId',
    foreignField: 'clerkId',
    as: 'creator'
  }
}

// ✅ FAST: Fetches only needed fields with sub-pipeline
{
  $lookup: {
    from: 'users',
    let: { creatorId: '$creatorId' },
    pipeline: [
      { $match: { $expr: { $eq: ['$clerkId', '$$creatorId'] } } },
      { $project: { _id: 0, clerkId: 1, username: 1, avatarUrl: 1 } },
      { $limit: 1 }  // Optimization: stop after first match
    ],
    as: 'creator'
  }
}
```

### 3.3 Avoiding Common Pipeline Anti-Patterns

```typescript
// ❌ ANTI-PATTERN 1: Using $unwind when not necessary
const bad1 = [
  { $lookup: { from: 'users', ..., as: 'user' } },
  { $unwind: '$user' },  // Creates multiple documents if array
];

// ✅ BETTER: Use $arrayElemAt for single document
const good1 = [
  { $lookup: { from: 'users', ..., as: 'user' } },
  { $set: { user: { $arrayElemAt: ['$user', 0] } } },
];

// ❌ ANTI-PATTERN 2: Multiple $project stages
const bad2 = [
  { $project: { title: 1, content: 1, author: 1 } },
  { $project: { title: 1, author: 1 } },  // Unnecessary second project
];

// ✅ BETTER: Single combined $project
const good2 = [
  { $project: { title: 1, author: 1 } },
];

// ❌ ANTI-PATTERN 3: Using $group after $sort without $limit
const bad3 = [
  { $sort: { createdAt: -1 } },
  { $group: { _id: '$category', docs: { $push: '$$ROOT' } } },
];

// ✅ BETTER: $limit before expensive operations
const good3 = [
  { $sort: { createdAt: -1 } },
  { $limit: 100 },
  { $group: { _id: '$category', docs: { $push: '$$ROOT' } } },
];
```

---

## 4. Query Pattern Optimization

### 4.1 Pagination Optimization

**Offset-based (Current - Slow for large offsets):**

```typescript
// src/features/story/repositories/story.repository.ts

// ❌ SLOW for large offsets (e.g., skip: 10000)
async findAll(options: { limit?: number; skip?: number }): Promise<IStory[]> {
  return this.model
    .find()
    .skip(options.skip ?? 0)  // MongoDB must scan skipped docs
    .limit(options.limit ?? 100)
    .lean()
    .exec();
}
```

**Cursor-based (Recommended - Constant performance):**

```typescript
// ✅ FAST: Cursor-based pagination
interface CursorPaginationOptions {
  limit: number;
  cursor?: string;  // Last item's _id or sortable field
  direction?: 'next' | 'prev';
}

interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}

async findAllCursorPaginated(
  options: CursorPaginationOptions
): Promise<PaginatedResult<IStory>> {
  const { limit, cursor, direction = 'next' } = options;

  let filter: FilterQuery<IStoryDoc> = { status: 'PUBLISHED' };

  if (cursor) {
    const cursorDate = new Date(Buffer.from(cursor, 'base64').toString());
    filter.createdAt = direction === 'next'
      ? { $lt: cursorDate }
      : { $gt: cursorDate };
  }

  const stories = await this.model
    .find(filter)
    .sort({ createdAt: direction === 'next' ? -1 : 1 })
    .limit(limit + 1)  // Fetch one extra to check hasMore
    .lean()
    .exec();

  const hasMore = stories.length > limit;
  const data = hasMore ? stories.slice(0, limit) : stories;

  return {
    data,
    nextCursor: data.length > 0
      ? Buffer.from(data[data.length - 1].createdAt.toISOString()).toString('base64')
      : null,
    prevCursor: cursor ?? null,
    hasMore,
  };
}
```

### 4.2 Count Query Optimization

```typescript
// ❌ SLOW: Exact count with large collections
async countAll(): Promise<number> {
  return this.model.countDocuments({});  // Scans entire collection
}

// ✅ FAST: Estimated count for large collections
async countAllEstimated(): Promise<number> {
  return this.model.estimatedDocumentCount();  // Uses metadata
}

// ✅ FAST: Count with filter using index
async countPublished(): Promise<number> {
  return this.model.countDocuments({
    status: 'PUBLISHED'  // Uses status index
  });
}

// ✅ OPTIMIZED: Count with hint to force index
async countByCreator(creatorId: string): Promise<number> {
  return this.model
    .countDocuments({ creatorId })
    .hint({ creatorId: 1 })  // Force use of creatorId index
    .exec();
}
```

### 4.3 Projection Optimization

```typescript
// ❌ BAD: Fetching entire document when only title needed
const story = await Story.findById(id);
return story.title;

// ✅ GOOD: Project only needed fields
const story = await Story.findById(id, { title: 1, slug: 1 });
return story.title;

// ✅ GOOD: Exclude large fields explicitly
const story = await Story.findById(id, {
  description: 0,  // Large text field
  'settings': 0,   // Nested object not needed
});
```

### 4.4 Batch Operations

```typescript
// ❌ SLOW: N+1 queries
async getStoriesWithCreators(storyIds: string[]): Promise<IStoryWithCreator[]> {
  const results = [];
  for (const id of storyIds) {
    const story = await this.storyRepo.findById(id);
    const creator = await this.userRepo.findByClerkId(story.creatorId);
    results.push({ ...story, creator });
  }
  return results;
}

// ✅ FAST: Single aggregation
async getStoriesWithCreators(storyIds: string[]): Promise<IStoryWithCreator[]> {
  return this.model.aggregate([
    { $match: { _id: { $in: storyIds.map(id => new Types.ObjectId(id)) } } },
    {
      $lookup: {
        from: 'users',
        let: { creatorId: '$creatorId' },
        pipeline: [
          { $match: { $expr: { $eq: ['$clerkId', '$$creatorId'] } } },
          { $project: { clerkId: 1, username: 1, avatarUrl: 1 } },
        ],
        as: 'creator',
      },
    },
    { $set: { creator: { $arrayElemAt: ['$creator', 0] } } },
  ]).exec();
}
```

---

## 5. Pipeline Builder Enhancements

### 5.1 Enhanced Base Pipeline Builder

```typescript
// src/utils/pipelines/basePipeline.builder.ts

import { PipelineStage, Types } from 'mongoose';

export abstract class BasePipelineBuilder<T extends BasePipelineBuilder<T>> {
  protected pipeline: PipelineStage[] = [];

  // ═══════════════════════════════════════════════════════════════
  // CORE MATCH OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  matchById(id: string): T {
    this.pipeline.push({
      $match: { _id: new Types.ObjectId(id) },
    });
    return this as unknown as T;
  }

  matchByIds(ids: string[]): T {
    this.pipeline.push({
      $match: {
        _id: { $in: ids.map(id => new Types.ObjectId(id)) }
      },
    });
    return this as unknown as T;
  }

  matchField<K extends string>(field: K, value: unknown): T {
    this.pipeline.push({
      $match: { [field]: value },
    });
    return this as unknown as T;
  }

  // ═══════════════════════════════════════════════════════════════
  // PAGINATION
  // ═══════════════════════════════════════════════════════════════

  paginate(page: number, limit: number): T {
    const skip = (page - 1) * limit;
    this.pipeline.push(
      { $skip: skip },
      { $limit: limit }
    );
    return this as unknown as T;
  }

  cursorPaginate(cursor: Date | null, limit: number, direction: 'next' | 'prev' = 'next'): T {
    if (cursor) {
      this.pipeline.push({
        $match: {
          createdAt: direction === 'next' ? { $lt: cursor } : { $gt: cursor },
        },
      });
    }

    this.pipeline.push(
      { $sort: { createdAt: direction === 'next' ? -1 : 1 } },
      { $limit: limit + 1 }  // +1 to check hasMore
    );

    return this as unknown as T;
  }

  // ═══════════════════════════════════════════════════════════════
  // SORTING
  // ═══════════════════════════════════════════════════════════════

  sortBy(field: string, order: 1 | -1 = -1): T {
    this.pipeline.push({
      $sort: { [field]: order },
    });
    return this as unknown as T;
  }

  sortByMultiple(sorts: Record<string, 1 | -1>): T {
    this.pipeline.push({ $sort: sorts });
    return this as unknown as T;
  }

  // ═══════════════════════════════════════════════════════════════
  // LOOKUP HELPERS
  // ═══════════════════════════════════════════════════════════════

  protected lookupOne(options: {
    from: string;
    localField: string;
    foreignField: string;
    as: string;
    project?: Record<string, 0 | 1>;
  }): T {
    const subPipeline: PipelineStage[] = [
      { $limit: 1 },  // Optimization: single document expected
    ];

    if (options.project) {
      subPipeline.unshift({ $project: options.project });
    }

    this.pipeline.push(
      {
        $lookup: {
          from: options.from,
          let: { localVal: `$${options.localField}` },
          pipeline: [
            { $match: { $expr: { $eq: [`$${options.foreignField}`, '$$localVal'] } } },
            ...subPipeline,
          ],
          as: options.as,
        },
      },
      {
        $set: { [options.as]: { $arrayElemAt: [`$${options.as}`, 0] } },
      }
    );

    return this as unknown as T;
  }

  protected lookupMany(options: {
    from: string;
    localField: string;
    foreignField: string;
    as: string;
    project?: Record<string, 0 | 1>;
    limit?: number;
    sort?: Record<string, 1 | -1>;
  }): T {
    const subPipeline: PipelineStage[] = [];

    if (options.project) {
      subPipeline.push({ $project: options.project });
    }
    if (options.sort) {
      subPipeline.push({ $sort: options.sort });
    }
    if (options.limit) {
      subPipeline.push({ $limit: options.limit });
    }

    this.pipeline.push({
      $lookup: {
        from: options.from,
        let: { localVal: `$${options.localField}` },
        pipeline: [
          { $match: { $expr: { $eq: [`$${options.foreignField}`, '$$localVal'] } } },
          ...subPipeline,
        ],
        as: options.as,
      },
    });

    return this as unknown as T;
  }

  // ═══════════════════════════════════════════════════════════════
  // FIELD OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  project(fields: Record<string, 0 | 1 | string | object>): T {
    this.pipeline.push({ $project: fields });
    return this as unknown as T;
  }

  exclude(...fields: string[]): T {
    const unset: Record<string, 0> = {};
    fields.forEach(f => unset[f] = 0);
    this.pipeline.push({ $project: unset });
    return this as unknown as T;
  }

  addFields(fields: Record<string, unknown>): T {
    this.pipeline.push({ $set: fields });
    return this as unknown as T;
  }

  removeFields(...fields: string[]): T {
    this.pipeline.push({ $unset: fields });
    return this as unknown as T;
  }

  // ═══════════════════════════════════════════════════════════════
  // FACET (Multiple aggregations in one query)
  // ═══════════════════════════════════════════════════════════════

  withCount(dataField = 'data', countField = 'totalCount'): T {
    // Wrap existing pipeline in facet
    const existingPipeline = [...this.pipeline];
    this.pipeline = [
      ...existingPipeline.filter(stage => '$match' in stage),  // Keep matches
      {
        $facet: {
          [dataField]: existingPipeline.filter(stage => !('$match' in stage)),
          [countField]: [{ $count: 'count' }],
        },
      },
      {
        $set: {
          [countField]: {
            $ifNull: [{ $arrayElemAt: [`$${countField}.count`, 0] }, 0]
          },
        },
      },
    ];

    return this as unknown as T;
  }

  // ═══════════════════════════════════════════════════════════════
  // BUILD
  // ═══════════════════════════════════════════════════════════════

  build(): PipelineStage[] {
    return [...this.pipeline];
  }

  // Debug helper
  explain(): string {
    return JSON.stringify(this.pipeline, null, 2);
  }
}
```

### 5.2 Enhanced Story Pipeline Builder

```typescript
// src/features/story/pipelines/storyPipeline.builder.ts

import { PipelineStage, Types } from 'mongoose';
import { BasePipelineBuilder } from '@utils/pipelines/basePipeline.builder';

type StoryStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'DELETED';
type StoryGenre = 'FANTASY' | 'SCI_FI' | 'MYSTERY' | 'ROMANCE' | 'HORROR' |
                  'THRILLER' | 'ADVENTURE' | 'DRAMA' | 'COMEDY' | 'OTHER';

interface StoryFilterOptions {
  status?: StoryStatus;
  genre?: StoryGenre;
  creatorId?: string;
  tags?: string[];
  search?: string;
}

export class StoryPipelineBuilder extends BasePipelineBuilder<StoryPipelineBuilder> {

  // ═══════════════════════════════════════════════════════════════
  // MATCH OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  storyById(storyId: string): StoryPipelineBuilder {
    return this.matchById(storyId);
  }

  storyBySlug(slug: string): StoryPipelineBuilder {
    return this.matchField('slug', slug);
  }

  publishedOnly(): StoryPipelineBuilder {
    return this.matchField('status', 'PUBLISHED');
  }

  byCreator(creatorId: string): StoryPipelineBuilder {
    return this.matchField('creatorId', creatorId);
  }

  withFilters(options: StoryFilterOptions): StoryPipelineBuilder {
    const matchConditions: Record<string, unknown> = {};

    if (options.status) {
      matchConditions.status = options.status;
    }
    if (options.genre) {
      matchConditions['settings.genre'] = options.genre;
    }
    if (options.creatorId) {
      matchConditions.creatorId = options.creatorId;
    }
    if (options.tags?.length) {
      matchConditions.tags = { $all: options.tags };
    }

    if (Object.keys(matchConditions).length > 0) {
      this.pipeline.push({ $match: matchConditions });
    }

    // Text search handled separately (requires text index)
    if (options.search) {
      this.pipeline.unshift({
        $match: { $text: { $search: options.search } },
      });
      this.addFields({ textScore: { $meta: 'textScore' } });
    }

    return this;
  }

  // ═══════════════════════════════════════════════════════════════
  // DATE FILTERS
  // ═══════════════════════════════════════════════════════════════

  lastSevenDays(): StoryPipelineBuilder {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    this.pipeline.push({
      $match: {
        createdAt: { $gte: sevenDaysAgo },
        status: 'PUBLISHED',
      },
    });
    return this;
  }

  createdBetween(start: Date, end: Date): StoryPipelineBuilder {
    this.pipeline.push({
      $match: {
        createdAt: { $gte: start, $lte: end },
      },
    });
    return this;
  }

  // ═══════════════════════════════════════════════════════════════
  // LOOKUPS
  // ═══════════════════════════════════════════════════════════════

  withCreator(): StoryPipelineBuilder {
    return this.lookupOne({
      from: 'users',
      localField: 'creatorId',
      foreignField: 'clerkId',
      as: 'creator',
      project: { _id: 0, clerkId: 1, username: 1, avatarUrl: 1, email: 1 },
    });
  }

  withCollaborators(limit = 10): StoryPipelineBuilder {
    this.pipeline.push({
      $lookup: {
        from: 'storycollaborators',
        let: { storySlug: '$slug' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$slug', '$$storySlug'] },
              status: 'ACCEPTED',
            },
          },
          { $limit: limit },
          { $project: { userId: 1, role: 1 } },
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: 'clerkId',
              pipeline: [
                { $project: { _id: 0, clerkId: 1, username: 1, avatarUrl: 1 } },
                { $limit: 1 },
              ],
              as: 'user',
            },
          },
          { $unwind: '$user' },
          {
            $project: {
              _id: 0,
              clerkId: '$user.clerkId',
              username: '$user.username',
              avatarUrl: '$user.avatarUrl',
              role: 1,
            },
          },
        ],
        as: 'collaborators',
      },
    });

    return this;
  }

  withChapterCount(): StoryPipelineBuilder {
    this.pipeline.push(
      {
        $lookup: {
          from: 'chapters',
          let: { storyId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$storyId', '$$storyId'] }, status: 'PUBLISHED' } },
            { $count: 'count' },
          ],
          as: 'chapterStats',
        },
      },
      {
        $set: {
          publishedChapterCount: {
            $ifNull: [{ $arrayElemAt: ['$chapterStats.count', 0] }, 0],
          },
        },
      },
      { $unset: 'chapterStats' }
    );

    return this;
  }

  // ═══════════════════════════════════════════════════════════════
  // PROJECTIONS
  // ═══════════════════════════════════════════════════════════════

  cardView(): StoryPipelineBuilder {
    return this.project({
      _id: 1,
      title: 1,
      slug: 1,
      description: { $substrCP: ['$description', 0, 200] },  // Truncate
      cardImage: 1,
      'settings.genre': 1,
      'settings.contentRating': 1,
      'stats.totalReads': 1,
      'stats.totalChapters': 1,
      createdAt: 1,
      creator: 1,
    });
  }

  detailView(): StoryPipelineBuilder {
    return this.project({
      _id: 1,
      title: 1,
      slug: 1,
      description: 1,
      coverImage: 1,
      cardImage: 1,
      settings: 1,
      stats: 1,
      tags: 1,
      status: 1,
      createdAt: 1,
      publishedAt: 1,
      creator: 1,
      collaborators: 1,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // SORTING PRESETS
  // ═══════════════════════════════════════════════════════════════

  sortByTrending(): StoryPipelineBuilder {
    return this.sortByMultiple({ trendingScore: -1, publishedAt: -1 });
  }

  sortByNewest(): StoryPipelineBuilder {
    return this.sortBy('createdAt', -1);
  }

  sortByPopular(): StoryPipelineBuilder {
    return this.sortBy('stats.totalReads', -1);
  }

  sortByRelevance(): StoryPipelineBuilder {
    // For text search results
    return this.sortBy('textScore', -1);
  }
}
```

### 5.3 Enhanced Chapter Pipeline Builder

```typescript
// src/features/chapter/pipelines/chapterPipeline.builder.ts

import { PipelineStage, Types } from 'mongoose';
import { BasePipelineBuilder } from '@utils/pipelines/basePipeline.builder';

export class ChapterPipelineBuilder extends BasePipelineBuilder<ChapterPipelineBuilder> {

  // ═══════════════════════════════════════════════════════════════
  // MATCH OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  forStory(storyId: string): ChapterPipelineBuilder {
    this.pipeline.push({
      $match: { storyId: new Types.ObjectId(storyId) },
    });
    return this;
  }

  publishedOnly(): ChapterPipelineBuilder {
    return this.matchField('status', 'PUBLISHED');
  }

  rootChaptersOnly(): ChapterPipelineBuilder {
    return this.matchField('parentChapterId', null);
  }

  childrenOf(parentChapterId: string): ChapterPipelineBuilder {
    this.pipeline.push({
      $match: { parentChapterId: new Types.ObjectId(parentChapterId) },
    });
    return this;
  }

  byAuthor(authorId: string): ChapterPipelineBuilder {
    return this.matchField('authorId', authorId);
  }

  pendingApproval(): ChapterPipelineBuilder {
    return this.matchField('status', 'PENDING_APPROVAL');
  }

  // ═══════════════════════════════════════════════════════════════
  // TREE OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  loadFullTree(): ChapterPipelineBuilder {
    // Optimized for loading entire chapter tree
    this.pipeline.push(
      { $match: { status: 'PUBLISHED' } },
      { $sort: { depth: 1, createdAt: 1 } },  // Process parents first
      {
        $project: {
          _id: 1,
          title: 1,
          parentChapterId: 1,
          ancestorIds: 1,
          depth: 1,
          authorId: 1,
          'votes.score': 1,
          'stats.childBranches': 1,
          createdAt: 1,
          isEnding: 1,
        },
      }
    );
    return this;
  }

  loadBranchPath(chapterId: string): ChapterPipelineBuilder {
    // Load a specific path from root to given chapter
    this.pipeline.push(
      {
        $match: { _id: new Types.ObjectId(chapterId) },
      },
      {
        $graphLookup: {
          from: 'chapters',
          startWith: '$parentChapterId',
          connectFromField: 'parentChapterId',
          connectToField: '_id',
          as: 'ancestors',
          maxDepth: 50,  // Prevent infinite loops
          depthField: 'pathDepth',
        },
      },
      {
        $project: {
          chapter: {
            _id: '$_id',
            title: '$title',
            content: '$content',
            depth: '$depth',
          },
          ancestors: {
            $sortArray: { input: '$ancestors', sortBy: { pathDepth: -1 } },
          },
        },
      }
    );
    return this;
  }

  // ═══════════════════════════════════════════════════════════════
  // LOOKUPS
  // ═══════════════════════════════════════════════════════════════

  withAuthor(): ChapterPipelineBuilder {
    return this.lookupOne({
      from: 'users',
      localField: 'authorId',
      foreignField: 'clerkId',
      as: 'author',
      project: { _id: 0, clerkId: 1, username: 1, avatarUrl: 1 },
    });
  }

  withChildrenCount(): ChapterPipelineBuilder {
    this.pipeline.push(
      {
        $lookup: {
          from: 'chapters',
          let: { chapterId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$parentChapterId', '$$chapterId'] },
                status: 'PUBLISHED',
              }
            },
            { $count: 'count' },
          ],
          as: 'childCount',
        },
      },
      {
        $set: {
          branchCount: { $ifNull: [{ $arrayElemAt: ['$childCount.count', 0] }, 0] },
        },
      },
      { $unset: 'childCount' }
    );
    return this;
  }

  withVoteStatus(userId?: string): ChapterPipelineBuilder {
    if (!userId) return this;

    this.pipeline.push(
      {
        $lookup: {
          from: 'votes',
          let: { chapterId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$chapterId', '$$chapterId'] },
                    { $eq: ['$userId', userId] },
                  ],
                },
              },
            },
            { $project: { _id: 0, voteType: 1 } },
            { $limit: 1 },
          ],
          as: 'userVote',
        },
      },
      {
        $set: {
          userVote: { $arrayElemAt: ['$userVote.voteType', 0] },
        },
      }
    );
    return this;
  }

  // ═══════════════════════════════════════════════════════════════
  // GRAPH NODE PROJECTION
  // ═══════════════════════════════════════════════════════════════

  asGraphNode(): ChapterPipelineBuilder {
    this.pipeline.push({
      $project: {
        _id: 1,
        title: 1,
        parentChapterId: 1,
        depth: 1,
        author: 1,
        votes: '$votes.score',
        branches: '$stats.childBranches',
        isEnding: 1,
        createdAt: 1,
      },
    });
    return this;
  }

  asDetailView(): ChapterPipelineBuilder {
    return this.removeFields('__v', 'reportCount', 'isFlagged');
  }

  // ═══════════════════════════════════════════════════════════════
  // SORTING PRESETS
  // ═══════════════════════════════════════════════════════════════

  sortByVotes(): ChapterPipelineBuilder {
    return this.sortBy('votes.score', -1);
  }

  sortByNewest(): ChapterPipelineBuilder {
    return this.sortBy('createdAt', -1);
  }

  sortByDepthThenDate(): ChapterPipelineBuilder {
    return this.sortByMultiple({ depth: 1, createdAt: 1 });
  }
}
```

---

## 6. Advanced Optimization Techniques

### 6.1 Read Preference for Read Replicas

```typescript
// src/config/services/database.service.ts

import mongoose, { ReadPreferenceMode } from 'mongoose';

interface QueryOptions {
  readPreference?: ReadPreferenceMode;
}

// For read-heavy operations, use secondaries
async function findWithReadPreference<T>(
  model: mongoose.Model<T>,
  filter: FilterQuery<T>,
  options: QueryOptions = {}
): Promise<T[]> {
  return model
    .find(filter)
    .read(options.readPreference ?? 'secondaryPreferred')
    .lean()
    .exec();
}

// Usage in repository
async findPublishedStories(): Promise<IStory[]> {
  return this.model
    .find({ status: 'PUBLISHED' })
    .read('secondaryPreferred')  // Read from replica
    .lean()
    .exec();
}
```

### 6.2 Aggregation Pipeline Explain

```typescript
// src/utils/queryAnalyzer.ts

import { Model, PipelineStage } from 'mongoose';
import { logger } from './logger';

interface ExplainResult {
  executionTimeMs: number;
  totalDocsExamined: number;
  totalKeysExamined: number;
  indexesUsed: string[];
  stages: StageStats[];
}

interface StageStats {
  stage: string;
  nReturned: number;
  executionTimeMs: number;
}

export async function explainPipeline<T>(
  model: Model<T>,
  pipeline: PipelineStage[]
): Promise<ExplainResult> {
  const explanation = await model
    .aggregate(pipeline)
    .explain('executionStats');

  const stats = explanation.stages?.[0]?.$cursor?.executionStats;

  return {
    executionTimeMs: stats?.executionTimeMillis ?? 0,
    totalDocsExamined: stats?.totalDocsExamined ?? 0,
    totalKeysExamined: stats?.totalKeysExamined ?? 0,
    indexesUsed: extractIndexNames(explanation),
    stages: extractStageStats(explanation),
  };
}

function extractIndexNames(explanation: any): string[] {
  const indexes: string[] = [];
  const winningPlan = explanation.stages?.[0]?.$cursor?.queryPlanner?.winningPlan;

  function traverse(plan: any) {
    if (plan?.indexName) {
      indexes.push(plan.indexName);
    }
    if (plan?.inputStage) {
      traverse(plan.inputStage);
    }
    if (plan?.inputStages) {
      plan.inputStages.forEach(traverse);
    }
  }

  traverse(winningPlan);
  return indexes;
}

// Usage
const pipeline = new StoryPipelineBuilder()
  .publishedOnly()
  .withCreator()
  .sortByTrending()
  .paginate(1, 20)
  .build();

const stats = await explainPipeline(Story, pipeline);
logger.info('Pipeline stats:', stats);

// Output:
// {
//   executionTimeMs: 15,
//   totalDocsExamined: 20,
//   totalKeysExamined: 20,
//   indexesUsed: ['status_1_trendingScore_-1'],
//   stages: [...]
// }
```

### 6.3 Query Result Caching Integration

```typescript
// src/features/story/services/story.service.ts

import { CacheService } from '@services/cache/cache.service';
import { CacheKeyBuilder } from '@services/cache/cacheKey.builder';

@singleton()
export class StoryService extends BaseModule {
  constructor(
    @inject(TOKENS.StoryRepository) private readonly storyRepo: StoryRepository,
    @inject(TOKENS.CacheService) private readonly cache: CacheService
  ) {
    super();
  }

  async getStoryOverview(slug: string): Promise<IStoryWithCreator> {
    const cacheKey = CacheKeyBuilder.story.overview(slug);

    // Check cache first
    const cached = await this.cache.get<IStoryWithCreator>(cacheKey);
    if (cached) return cached;

    // Build optimized pipeline
    const pipeline = new StoryPipelineBuilder()
      .storyBySlug(slug)
      .publishedOnly()
      .withCreator()
      .withCollaborators(5)
      .withChapterCount()
      .detailView()
      .build();

    const [story] = await this.storyRepo.aggregateStories<IStoryWithCreator>(pipeline);

    if (!story) {
      this.throwNotFoundError('Story not found');
    }

    // Cache for 15 minutes
    await this.cache.set(cacheKey, story, { ttl: 900 });

    return story;
  }

  async getTrendingStories(page: number, limit: number): Promise<PaginatedResult<IStory>> {
    const cacheKey = CacheKeyBuilder.story.list(page, limit, 'trending');

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const pipeline = new StoryPipelineBuilder()
          .publishedOnly()
          .withCreator()
          .sortByTrending()
          .paginate(page, limit)
          .cardView()
          .build();

        const data = await this.storyRepo.aggregateStories(pipeline);

        // Get total count (cached separately)
        const countKey = CacheKeyBuilder.query('story', 'published-count');
        const total = await this.cache.getOrSet(
          countKey,
          () => this.storyRepo.count({ status: 'PUBLISHED' }),
          { ttl: 300 }
        );

        return {
          data,
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        };
      },
      { ttl: 300 }  // 5 minutes for list queries
    );
  }
}
```

### 6.4 Compound Query Optimization

```typescript
// src/features/story/repositories/story.repository.ts

interface StorySearchParams {
  search?: string;
  genre?: string;
  tags?: string[];
  status?: string;
  creatorId?: string;
  sortBy?: 'trending' | 'newest' | 'popular' | 'relevance';
  page?: number;
  limit?: number;
}

async searchStories(params: StorySearchParams): Promise<PaginatedResult<IStory>> {
  const {
    search,
    genre,
    tags,
    status = 'PUBLISHED',
    sortBy = 'newest',
    page = 1,
    limit = 20,
  } = params;

  const builder = new StoryPipelineBuilder();

  // 1. Text search MUST come first (requires special index)
  if (search) {
    builder.withFilters({ search });
  }

  // 2. Apply filters (use compound index)
  builder.withFilters({ status, genre, tags });

  // 3. Add lookups (after filtering to reduce docs)
  builder.withCreator();

  // 4. Sort (based on indexed fields)
  switch (sortBy) {
    case 'trending':
      builder.sortByTrending();
      break;
    case 'popular':
      builder.sortByPopular();
      break;
    case 'relevance':
      if (search) builder.sortByRelevance();
      else builder.sortByNewest();
      break;
    default:
      builder.sortByNewest();
  }

  // 5. Pagination
  builder.paginate(page, limit);

  // 6. Project only needed fields
  builder.cardView();

  const pipeline = builder.build();

  // Execute with facet for count
  const [result] = await this.model.aggregate([
    ...pipeline.slice(0, -2),  // Remove pagination stages
    {
      $facet: {
        data: pipeline.slice(-2),  // Only pagination stages
        totalCount: [{ $count: 'count' }],
      },
    },
  ]);

  return {
    data: result.data,
    page,
    limit,
    total: result.totalCount[0]?.count ?? 0,
    totalPages: Math.ceil((result.totalCount[0]?.count ?? 0) / limit),
  };
}
```

---

## 7. Monitoring & Profiling

### 7.1 Slow Query Logger

```typescript
// src/utils/queryProfiler.ts

import mongoose from 'mongoose';
import { logger } from './logger';

interface QueryLog {
  collection: string;
  operation: string;
  query: object;
  executionTimeMs: number;
  timestamp: Date;
}

const slowQueryThreshold = 100; // ms
const queryLogs: QueryLog[] = [];

export function enableQueryProfiling(): void {
  mongoose.set('debug', (collectionName, methodName, ...args) => {
    const startTime = Date.now();

    // Log after execution (approximate timing)
    setImmediate(() => {
      const executionTime = Date.now() - startTime;

      if (executionTime > slowQueryThreshold) {
        const logEntry: QueryLog = {
          collection: collectionName,
          operation: methodName,
          query: args[0] ?? {},
          executionTimeMs: executionTime,
          timestamp: new Date(),
        };

        queryLogs.push(logEntry);

        logger.warn('Slow query detected:', {
          ...logEntry,
          query: JSON.stringify(logEntry.query).slice(0, 500),
        });
      }
    });
  });
}

export function getSlowQueries(limit = 100): QueryLog[] {
  return queryLogs
    .sort((a, b) => b.executionTimeMs - a.executionTimeMs)
    .slice(0, limit);
}

export function clearQueryLogs(): void {
  queryLogs.length = 0;
}
```

### 7.2 Index Usage Monitor

```typescript
// src/utils/indexMonitor.ts

import mongoose from 'mongoose';
import { logger } from './logger';

interface IndexUsage {
  collection: string;
  indexName: string;
  accesses: number;
  since: Date;
}

export async function getIndexUsageStats(): Promise<IndexUsage[]> {
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  const allStats: IndexUsage[] = [];

  for (const coll of collections) {
    try {
      const stats = await db.collection(coll.name).aggregate([
        { $indexStats: {} }
      ]).toArray();

      stats.forEach(stat => {
        allStats.push({
          collection: coll.name,
          indexName: stat.name,
          accesses: stat.accesses.ops,
          since: stat.accesses.since,
        });
      });
    } catch (error) {
      // Some collections may not support indexStats
    }
  }

  return allStats.sort((a, b) => b.accesses - a.accesses);
}

export async function findUnusedIndexes(
  minDays = 7
): Promise<IndexUsage[]> {
  const allStats = await getIndexUsageStats();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - minDays);

  return allStats.filter(stat =>
    stat.accesses === 0 &&
    stat.since < cutoffDate &&
    stat.indexName !== '_id_'  // Don't suggest removing _id index
  );
}

// Usage in health check endpoint
export async function getQueryHealthReport(): Promise<object> {
  const indexStats = await getIndexUsageStats();
  const unusedIndexes = await findUnusedIndexes();
  const slowQueries = getSlowQueries(10);

  return {
    topIndexes: indexStats.slice(0, 10),
    unusedIndexes: unusedIndexes.slice(0, 5),
    recentSlowQueries: slowQueries,
    recommendations: generateRecommendations(indexStats, slowQueries),
  };
}

function generateRecommendations(
  indexStats: IndexUsage[],
  slowQueries: QueryLog[]
): string[] {
  const recommendations: string[] = [];

  // Check for unused indexes
  const unused = indexStats.filter(i => i.accesses === 0 && i.indexName !== '_id_');
  if (unused.length > 3) {
    recommendations.push(
      `Consider removing ${unused.length} unused indexes to improve write performance`
    );
  }

  // Check for slow query patterns
  const slowCollections = new Set(slowQueries.map(q => q.collection));
  if (slowCollections.size > 0) {
    recommendations.push(
      `Review indexes for collections: ${[...slowCollections].join(', ')}`
    );
  }

  return recommendations;
}
```

---

## 8. Recommended Implementations

### 8.1 Repository Layer Updates

```typescript
// src/features/story/repositories/story.repository.ts

import { singleton } from 'tsyringe';
import { PipelineStage, Types, ClientSession } from 'mongoose';
import { Story } from '@models/story.model';
import { BaseRepository } from '@utils/baseClass';
import { StoryPipelineBuilder } from '../pipelines/storyPipeline.builder';
import { IStory, IStoryDoc } from '../types/story.types';

interface FindOptions {
  session?: ClientSession;
  lean?: boolean;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@singleton()
export class StoryRepository extends BaseRepository<IStory, IStoryDoc> {
  constructor() {
    super(Story);
  }

  // ═══════════════════════════════════════════════════════════════
  // OPTIMIZED FINDERS
  // ═══════════════════════════════════════════════════════════════

  async findBySlugOptimized(
    slug: string,
    options: FindOptions = {}
  ): Promise<IStory | null> {
    // Uses unique slug index - fastest possible lookup
    const query = this.model.findOne({ slug });

    if (options.session) query.session(options.session);

    return query
      .hint({ slug: 1 })  // Force slug index
      .lean()
      .exec();
  }

  async findByCreatorPaginated(
    creatorId: string,
    page: number,
    limit: number,
    status?: string
  ): Promise<PaginatedResult<IStory>> {
    const filter: Record<string, unknown> = { creatorId };
    if (status) filter.status = status;

    // Use compound index: { creatorId: 1, status: 1, createdAt: -1 }
    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .hint({ creatorId: 1, status: 1, createdAt: -1 })
        .lean()
        .exec(),
      this.model.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // AGGREGATION METHODS
  // ═══════════════════════════════════════════════════════════════

  async aggregateWithBuilder<T = IStory>(
    builderFn: (builder: StoryPipelineBuilder) => StoryPipelineBuilder,
    options: FindOptions = {}
  ): Promise<T[]> {
    const builder = new StoryPipelineBuilder();
    const pipeline = builderFn(builder).build();

    return this.model
      .aggregate<T>(pipeline)
      .session(options.session ?? null)
      .exec();
  }

  async getStoryWithDetails(slug: string): Promise<IStoryWithDetails | null> {
    const [result] = await this.aggregateWithBuilder<IStoryWithDetails>(
      builder => builder
        .storyBySlug(slug)
        .withCreator()
        .withCollaborators()
        .withChapterCount()
        .detailView()
    );

    return result ?? null;
  }

  async getTrendingStories(
    page: number,
    limit: number
  ): Promise<PaginatedResult<IStoryCard>> {
    const pipeline = new StoryPipelineBuilder()
      .publishedOnly()
      .sortByTrending()
      .build();

    const [result] = await this.model.aggregate([
      ...pipeline,
      {
        $facet: {
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            // Add creator lookup inline
            {
              $lookup: {
                from: 'users',
                let: { creatorId: '$creatorId' },
                pipeline: [
                  { $match: { $expr: { $eq: ['$clerkId', '$$creatorId'] } } },
                  { $project: { _id: 0, clerkId: 1, username: 1, avatarUrl: 1 } },
                  { $limit: 1 },
                ],
                as: 'creator',
              },
            },
            { $set: { creator: { $arrayElemAt: ['$creator', 0] } } },
            // Card projection
            {
              $project: {
                _id: 1,
                title: 1,
                slug: 1,
                description: { $substrCP: ['$description', 0, 200] },
                cardImage: 1,
                'settings.genre': 1,
                'stats.totalReads': 1,
                creator: 1,
                createdAt: 1,
              },
            },
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]);

    const total = result.totalCount[0]?.count ?? 0;

    return {
      data: result.data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // SEARCH WITH TEXT INDEX
  // ═══════════════════════════════════════════════════════════════

  async searchStories(
    query: string,
    options: { page?: number; limit?: number; genre?: string } = {}
  ): Promise<PaginatedResult<IStory>> {
    const { page = 1, limit = 20, genre } = options;

    const matchStage: Record<string, unknown> = {
      $text: { $search: query },
      status: 'PUBLISHED',
    };

    if (genre) {
      matchStage['settings.genre'] = genre;
    }

    const [result] = await this.model.aggregate([
      { $match: matchStage },
      { $addFields: { score: { $meta: 'textScore' } } },
      {
        $facet: {
          data: [
            { $sort: { score: -1, createdAt: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            { $project: { score: 0 } },  // Remove internal score
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]);

    const total = result.totalCount[0]?.count ?? 0;

    return {
      data: result.data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
```

### 8.2 Service Layer Integration

```typescript
// src/features/story/services/story.service.ts

import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { CacheService } from '@services/cache/cache.service';
import { CacheKeyBuilder } from '@services/cache/cacheKey.builder';
import { StoryRepository } from '../repositories/story.repository';
import { StoryPipelineBuilder } from '../pipelines/storyPipeline.builder';

@singleton()
export class StoryService extends BaseModule {
  constructor(
    @inject(TOKENS.StoryRepository)
    private readonly storyRepo: StoryRepository,
    @inject(TOKENS.CacheService)
    private readonly cache: CacheService
  ) {
    super();
  }

  async getStoryBySlug(slug: string): Promise<IStory> {
    const cacheKey = CacheKeyBuilder.story.bySlug(slug);

    const story = await this.cache.getOrSet(
      cacheKey,
      () => this.storyRepo.findBySlugOptimized(slug),
      { ttl: 1800 }
    );

    if (!story) {
      this.throwNotFoundError('Story not found');
    }

    return story;
  }

  async getStoryOverview(slug: string): Promise<IStoryWithDetails> {
    const cacheKey = CacheKeyBuilder.story.overview(slug);

    const story = await this.cache.getOrSet(
      cacheKey,
      () => this.storyRepo.getStoryWithDetails(slug),
      { ttl: 900 }
    );

    if (!story) {
      this.throwNotFoundError('Story not found');
    }

    return story;
  }

  async getTrendingStories(page = 1, limit = 20): Promise<PaginatedResult<IStoryCard>> {
    const cacheKey = CacheKeyBuilder.story.list(page, limit, 'trending');

    return this.cache.getOrSet(
      cacheKey,
      () => this.storyRepo.getTrendingStories(page, limit),
      { ttl: 300 }
    );
  }

  async searchStories(
    query: string,
    options: { page?: number; limit?: number; genre?: string }
  ): Promise<PaginatedResult<IStory>> {
    // Don't cache search results (too many variations)
    // But cache individual stories when accessed
    return this.storyRepo.searchStories(query, options);
  }

  async getNewStories(): Promise<IStory[]> {
    const cacheKey = CacheKeyBuilder.story.newStories();

    return this.cache.getOrSet(
      cacheKey,
      () => this.storyRepo.aggregateWithBuilder(
        builder => builder
          .lastSevenDays()
          .withCreator()
          .sortByNewest()
          .paginate(1, 20)
          .cardView()
      ),
      { ttl: 300 }
    );
  }
}
```

### 8.3 Implementation Checklist

- [ ] **Indexing**
  - [ ] Add recommended compound indexes to Story model
  - [ ] Add recommended compound indexes to Chapter model
  - [ ] Add compound indexes to StoryCollaborator model
  - [ ] Run `ensureIndexes()` on startup
  - [ ] Monitor index usage after 1 week

- [ ] **Pipeline Builders**
  - [ ] Create `BasePipelineBuilder` utility class
  - [ ] Enhance `StoryPipelineBuilder` with new methods
  - [ ] Enhance `ChapterPipelineBuilder` with new methods
  - [ ] Add cursor pagination support

- [ ] **Repository Updates**
  - [ ] Add `findBySlugOptimized` with hint
  - [ ] Add `findByCreatorPaginated` method
  - [ ] Add `aggregateWithBuilder` helper
  - [ ] Add `getTrendingStories` with facet
  - [ ] Add text search method

- [ ] **Caching Integration**
  - [ ] Integrate CacheService in StoryService
  - [ ] Cache story by slug lookups
  - [ ] Cache trending/new story lists
  - [ ] Implement cache invalidation on mutations

- [ ] **Monitoring**
  - [ ] Enable query profiling in development
  - [ ] Set up slow query logging
  - [ ] Create index usage monitoring endpoint
  - [ ] Add query health check to status endpoint

---

## Summary

This query optimization report provides:

1. **Understanding** of how MongoDB executes queries and what makes them performant
2. **Indexing strategies** with specific recommendations for your models
3. **Aggregation pipeline best practices** with before/after examples
4. **Practical code implementations** for pipeline builders, repositories, and services
5. **Monitoring tools** to identify and fix slow queries
6. **Caching integration** to reduce database load

Key optimizations that will have the most impact:

1. **Add compound indexes** for common query patterns
2. **Use cursor pagination** instead of offset for large datasets
3. **Filter early in pipelines** before expensive $lookup operations
4. **Project only needed fields** to reduce data transfer
5. **Use $facet** for paginated results with counts
6. **Cache frequently accessed data** with appropriate TTLs
