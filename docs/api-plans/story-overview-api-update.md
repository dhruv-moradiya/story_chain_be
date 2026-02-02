# GetStoryOverviewBySlug API Enhancement Plan

> **Status**: Draft for Review  
> **Created**: 2026-02-01  
> **Related File**: [overview-section-data.md](file:///e:/Mine/Turorials/storychain-be/needed-data-to-fe/overview-section-data.md)

---

## Executive Summary

This document outlines the plan to enhance the `GetStoryOverviewBySlug` API endpoint to provide all data required by the OverviewSection component on the frontend. Based on the requirements analysis, we recommend a **single enhanced API** approach with **one optional separate endpoint** for user-specific reading progress.

---

## Current State Analysis

### Endpoint Information

- **Route**: `GET /story/slug/:slug/overview`
- **Auth**: Required (`validateAuth` middleware)
- **Controller**: `storyController.getStoryOverviewBySlug`
- **Service**: `StoryQueryService.getStoryOverviewBySlug()`

### Current Response Structure

The API currently returns `IStoryWithCreator` which includes:

| Field                          | Status       | Notes                        |
| ------------------------------ | ------------ | ---------------------------- |
| `title`, `slug`, `description` | ✅ Available | -                            |
| `coverImage`                   | ✅ Available | -                            |
| `status`                       | ✅ Available | ONGOING, COMPLETED, etc.     |
| `genres`, `contentRating`      | ✅ Available | Via pipeline builder         |
| `collaborators`                | ✅ Available | With role & user info        |
| `stats.totalChapters`          | ✅ Available | -                            |
| `stats.totalReads`             | ✅ Available | -                            |
| `stats.totalVotes`             | ✅ Available | -                            |
| `stats.uniqueContributors`     | ✅ Available | -                            |
| `stats.averageRating`          | ✅ Available | -                            |
| `lastActivityAt`               | ✅ Available | -                            |
| `createdAt`                    | ✅ Available | Can be used for "Started At" |

---

## Requirements Gap Analysis

### A. Extended Statistics (Missing)

| Field                  | Current State           | Required Action                                 |
| ---------------------- | ----------------------- | ----------------------------------------------- |
| `totalRatings` (count) | ❌ Not in `IStoryStats` | Add to model & response                         |
| `estimatedChapters`    | ❌ Not in model         | Add to `IStorySettings` or `IStory`             |
| `progressPercent`      | ❌ Not calculated       | Derive from `totalChapters / estimatedChapters` |

### B. Latest Chapters Preview (Missing)

**Requirement**: Array of 2-3 most recent chapters with:

- `_id`, `slug`, `title`, `excerpt`
- Stats: `readCount`, `commentCount`, `likeCount`
- `createdAt`
- Author: `username`, `role`, `avatarUrl`

**Current State**: Not included in overview response.

### C. User Reading Progress (Missing)

**Requirement**: User-specific data for "Continue Reading" button:

- `lastReadChapterId` / `currentChapterId`
- First chapter info for "Start Reading"

**Current State**: `ReadingHistory` model exists with `currentChapterId`, but not integrated into overview.

---

## Recommended Approach

### 🏆 **Single Enhanced API** (Recommended)

Enhance the existing `GetStoryOverviewBySlug` endpoint to include all required data.

**Pros**:

- Single network request for the overview page
- Simpler frontend integration
- Better performance (one aggregation query)
- Atomic data fetching (all data consistent)

**Cons**:

- More complex aggregation pipeline
- Optional user-specific data requires conditional logic

```
┌─────────────────────────────────────────────────────────┐
│  GET /story/slug/:slug/overview                         │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐               │
│  │  Story Details  │  │  Collaborators  │               │
│  │  + Stats        │  │  (existing)     │               │
│  └─────────────────┘  └─────────────────┘               │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐               │
│  │ Latest Chapters │  │  User Progress  │  ← NEW        │
│  │ (top 2-3)       │  │  (if auth'd)    │               │
│  └─────────────────┘  └─────────────────┘               │
│                                                         │
│  ┌─────────────────┐                                    │
│  │ Extended Stats  │  ← NEW (totalRatings,              │
│  │                 │       estimatedChapters, etc.)     │
│  └─────────────────┘                                    │
└─────────────────────────────────────────────────────────┘
```

---

### Alternative: Separate APIs Approach

If preferred, the data could be split across multiple endpoints:

| Endpoint                                 | Data                                       | Use Case         |
| ---------------------------------------- | ------------------------------------------ | ---------------- |
| `GET /story/slug/:slug/overview`         | Story + collaborators + stats _(existing)_ | Main story info  |
| `GET /story/slug/:slug/latest-chapters`  | Top 2-3 chapters                           | Chapter previews |
| `GET /story/slug/:slug/reading-progress` | User's progress                            | Continue reading |

**Pros**:

- More granular caching
- Independent updates

**Cons**:

- Multiple network requests
- Complex loading states on frontend
- Potential race conditions

> **Verdict**: Not recommended unless there's a specific caching/performance requirement.

---

## Implementation Plan

### Phase 0: Chapter Hierarchical Numbering (Branch Index)

Before enhancing the overview API, we need to add support for hierarchical chapter numbers like `1.1`, `1.2`, `2.1.1` to properly display chapters in the tree structure.

#### Problem

Current `chapterNumber` is a simple integer, but branching stories need path-based numbering:

```
├── Chapter 1 (depth: 0) → displays as "1"
│   ├── Chapter 1.1 (depth: 1) → displays as "1.1"
│   └── Chapter 1.2 (depth: 1) → displays as "1.2"
│       └── Chapter 1.2.1 (depth: 2) → displays as "1.2.1"
└── Chapter 2 (depth: 0) → displays as "2"
    ├── Chapter 2.1 → displays as "2.1"
    └── Chapter 2.2 → displays as "2.2"
```

#### Solution: Branch Index Approach

Add a `branchIndex` field that stores the chapter's position among its siblings.

#### 0.1 Update Chapter Model

**File**: `src/models/chapter.model.ts`

```typescript
// Add alongside existing tree fields
branchIndex: {
  type: Number,
  min: 1,
  required: true,  // Position among siblings (1st, 2nd, 3rd branch)
},
```

#### 0.2 Update Chapter Type

**File**: `src/features/chapter/types/chapter.types.ts`

```typescript
interface IChapter {
  // ... existing fields
  branchIndex: number; // Position among siblings
  displayNumber?: string; // Computed: "1.2.1" (virtual/computed field)
}
```

#### 0.3 Calculate branchIndex on Creation

**File**: Chapter creation service/repository

```typescript
// When creating a new chapter:
const siblingCount = await Chapter.countDocuments({
  storyId,
  parentChapterId: parentChapterId || null,
  status: { $in: ['PUBLISHED', 'DRAFT'] },
});
const branchIndex = siblingCount + 1;
```

#### 0.4 Compute displayNumber in Pipeline

**File**: `src/features/chapter/pipelines/chapterPipeline.builder.ts`

```typescript
withDisplayNumber() {
  // Step 1: Lookup ancestor branchIndexes
  this.pipeline.push({
    $lookup: {
      from: 'chapters',
      let: { ancestorIds: '$ancestorIds' },
      pipeline: [
        { $match: { $expr: { $in: ['$_id', '$$ancestorIds'] } } },
        { $project: { _id: 1, branchIndex: 1 } }
      ],
      as: 'ancestorDetails'
    }
  });

  // Step 2: Sort ancestors by their order in ancestorIds array
  this.pipeline.push({
    $addFields: {
      ancestorDetails: {
        $map: {
          input: '$ancestorIds',
          as: 'ancestorId',
          in: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$ancestorDetails',
                  cond: { $eq: ['$$this._id', '$$ancestorId'] }
                }
              },
              0
            ]
          }
        }
      }
    }
  });

  // Step 3: Build the display number string
  this.pipeline.push({
    $addFields: {
      displayNumber: {
        $cond: {
          if: { $eq: [{ $size: '$ancestorIds' }, 0] },
          // Root chapter: just its own branchIndex
          then: { $toString: '$branchIndex' },
          // Child chapter: ancestors + own branchIndex
          else: {
            $concat: [
              {
                $reduce: {
                  input: '$ancestorDetails',
                  initialValue: '',
                  in: {
                    $concat: [
                      '$$value',
                      { $cond: [{ $eq: ['$$value', ''] }, '', '.'] },
                      { $toString: '$$this.branchIndex' }
                    ]
                  }
                }
              },
              '.',
              { $toString: '$branchIndex' }
            ]
          }
        }
      }
    }
  });

  // Cleanup
  this.pipeline.push({ $unset: 'ancestorDetails' });

  return this;
}
```

#### 0.5 Migration for Existing Chapters

Run a migration script to calculate and set `branchIndex` for all existing chapters:

```typescript
// Migration pseudocode
const stories = await Story.find({});

for (const story of stories) {
  // Get root chapters sorted by creation date
  const rootChapters = await Chapter.find({
    storyId: story._id,
    parentChapterId: null,
  }).sort({ createdAt: 1 });

  for (let i = 0; i < rootChapters.length; i++) {
    await Chapter.updateOne({ _id: rootChapters[i]._id }, { $set: { branchIndex: i + 1 } });
    // Recursively process children...
  }
}
```

#### Example Output

| Chapter  | parentChapterId | depth | branchIndex | displayNumber |
| -------- | --------------- | ----- | ----------- | ------------- |
| Prologue | null            | 0     | 1           | "1"           |
| Act 1    | null            | 0     | 2           | "2"           |
| Scene 1a | Act 1's ID      | 1     | 1           | "2.1"         |
| Scene 1b | Act 1's ID      | 1     | 2           | "2.2"         |
| Variant  | Scene 1b's ID   | 2     | 1           | "2.2.1"       |

---

### Phase 1: Model & Type Updates

#### 1.1 Update `IStoryStats` Interface

**File**: `src/features/story/types/story.types.ts`

```typescript
interface IStoryStats {
  totalChapters: number;
  totalBranches: number;
  totalReads: number;
  totalVotes: number;
  uniqueContributors: number;
  averageRating: number;
  totalRatings: number; // ← NEW: Count of ratings
}
```

#### 1.2 Update `IStory` / `IStorySettings` for Estimated Chapters

**File**: `src/features/story/types/story.types.ts`

```typescript
interface IStory {
  // ... existing fields
  estimatedChapters?: number; // ← NEW: Target chapter count
}
```

#### 1.3 Update Story Model

**File**: `src/models/story.model.ts`

```typescript
// In stats object
stats: {
  // ... existing
  totalRatings: { type: Number, default: 0 },
},

// Root level
estimatedChapters: {
  type: Number,
  min: 1,
  default: null,
},
```

---

### Phase 2: New Types for Enhanced Response

#### 2.1 Create Chapter Preview Type

**File**: `src/types/response/story.response.types.ts`

```typescript
interface ILatestChapterPreview {
  _id: string;
  slug: string;
  title: string;
  excerpt?: string; // First 100-150 chars of content

  // Stats
  readCount: number;
  commentCount: number;
  likeCount: number;

  // Meta
  createdAt: Date;

  // Author
  author: {
    clerkId: string;
    username: string;
    avatarUrl?: string;
    role: string; // Collaborator role in story
  };
}

interface IUserReadingProgress {
  hasStartedReading: boolean;
  currentChapterId?: string;
  currentChapterSlug?: string;
  currentChapterTitle?: string;
  lastReadAt?: Date;
  chaptersReadCount: number;
}

interface IStoryFirstChapter {
  _id: string;
  slug: string;
  title: string;
}

interface IStoryOverviewResponse extends IStoryWithCreator {
  // NEW fields
  estimatedChapters?: number;
  progressPercent?: number; // Calculated: (totalChapters / estimatedChapters) * 100

  latestChapters: ILatestChapterPreview[];

  firstChapter?: IStoryFirstChapter; // For "Start Reading" button
  userProgress?: IUserReadingProgress; // Only if authenticated
}
```

---

### Phase 3: Pipeline Builder Enhancement

#### 3.1 Add New Pipeline Methods

**File**: `src/features/story/pipelines/storyPipeline.builder.ts`

```typescript
class StoryPipelineBuilder {
  // ... existing methods

  withLatestChapters(limit: number = 3) {
    this.pipeline.push({
      $lookup: {
        from: 'chapters',
        let: { storyId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$storyId', '$$storyId'] }, status: 'PUBLISHED' } },
          { $sort: { createdAt: -1 } },
          { $limit: limit },
          // ... project required fields + author lookup
        ],
        as: 'latestChapters',
      },
    });
    return this;
  }

  withFirstChapter() {
    this.pipeline.push({
      $lookup: {
        from: 'chapters',
        let: { storyId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$storyId', '$$storyId'] },
              parentChapterId: null,
              status: 'PUBLISHED',
            },
          },
          { $limit: 1 },
          { $project: { _id: 1, slug: 1, title: 1 } },
        ],
        as: 'firstChapter',
      },
    });
    this.pipeline.push({ $set: { firstChapter: { $arrayElemAt: ['$firstChapter', 0] } } });
    return this;
  }

  withUserProgress(userId: string) {
    this.pipeline.push({
      $lookup: {
        from: 'readinghistories',
        let: { storyId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$storyId', '$$storyId'] }, userId: userId } },
          // ... lookup current chapter details
        ],
        as: 'userProgress',
      },
    });
    this.pipeline.push({ $set: { userProgress: { $arrayElemAt: ['$userProgress', 0] } } });
    return this;
  }

  withProgressPercent() {
    this.pipeline.push({
      $set: {
        progressPercent: {
          $cond: {
            if: { $and: [{ $gt: ['$estimatedChapters', 0] }] },
            then: { $multiply: [{ $divide: ['$stats.totalChapters', '$estimatedChapters'] }, 100] },
            else: null,
          },
        },
      },
    });
    return this;
  }
}
```

---

### Phase 4: Service Layer Update

#### 4.1 Update `getStoryOverviewBySlug` Method

**File**: `src/features/story/services/story-query.service.ts`

```typescript
async getStoryOverviewBySlug(slug: string, userId?: string): Promise<IStoryOverviewResponse> {
  const pipelineBuilder = new StoryPipelineBuilder()
    .storyBySlug(slug)
    .storySettings(['genres', 'contentRating'])
    .withStoryCollaborators()
    .withLatestChapters(3)
    .withFirstChapter()
    .withProgressPercent();

  // Add user progress only if authenticated
  if (userId) {
    pipelineBuilder.withUserProgress(userId);
  }

  const pipeline = pipelineBuilder.build();
  const stories = await this.storyRepo.aggregateStories<IStoryOverviewResponse>(pipeline);

  if (!stories.length) {
    this.throwNotFoundError('Story not found');
  }

  return stories[0];
}
```

---

### Phase 5: Controller Update

**File**: `src/features/story/controllers/story.controller.ts`

```typescript
getStoryOverviewBySlug = catchAsync(
  async (req: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
    const { slug } = req.params;
    const userId = req.user?.id; // Optional: from auth middleware

    const overview = await this.storyQueryService.getStoryOverviewBySlug(slug, userId);
    return reply.success('Story overview fetched successfully', overview);
  }
);
```

---

## Summary of Changes

| Layer          | File                         | Changes                                                                                         |
| -------------- | ---------------------------- | ----------------------------------------------------------------------------------------------- |
| **Model**      | `chapter.model.ts`           | Add `branchIndex` field                                                                         |
| **Types**      | `chapter.types.ts`           | Add `branchIndex`, `displayNumber`                                                              |
| **Pipeline**   | `chapterPipeline.builder.ts` | Add `withDisplayNumber()` method                                                                |
| **Migration**  | New migration script         | Backfill `branchIndex` for existing chapters                                                    |
| **Types**      | `story.types.ts`             | Add `totalRatings` to stats, `estimatedChapters` to story                                       |
| **Types**      | `story.response.types.ts`    | Add `ILatestChapterPreview`, `IUserReadingProgress`, `IStoryOverviewResponse`                   |
| **Model**      | `story.model.ts`             | Add `totalRatings` stat, `estimatedChapters` field                                              |
| **Pipeline**   | `storyPipeline.builder.ts`   | Add `withLatestChapters()`, `withFirstChapter()`, `withUserProgress()`, `withProgressPercent()` |
| **Service**    | `story-query.service.ts`     | Update `getStoryOverviewBySlug()` to accept `userId` and use enhanced pipeline                  |
| **Controller** | `story.controller.ts`        | Pass `userId` to service method                                                                 |
| **Schema**     | Response schema files        | Update Zod/JSON schema for API docs                                                             |

---

## Open Questions for Review

> [!IMPORTANT]
> Please review and confirm the following before implementation:

1. **estimatedChapters**: Should this be in `settings` (user-configurable) or root level of story?

2. **Latest Chapters count**: Should we return 2 or 3 latest chapters?

3. **Chapter excerpt**: What character limit for the excerpt (100? 150? 200)?

4. **User Progress**: Should unauthenticated users still see `firstChapter` for "Start Reading"?

5. **Rating count**: Is `totalRatings` the right name, or should it be `ratingCount`?

6. **Branch Index Migration**: Should we sort existing chapters by `createdAt` or by current `chapterNumber` (if set)?

---

## Verification Plan

### Automated Testing

- Unit tests for new pipeline builder methods
- Integration tests for the enhanced overview endpoint

### Manual Verification

1. Call the API with authenticated user → verify `userProgress` is populated
2. Call the API without auth → verify `userProgress` is `undefined`
3. Verify `latestChapters` contains correct data with author info
4. Verify `progressPercent` calculates correctly when `estimatedChapters` is set
5. Verify chapter `displayNumber` shows correctly (e.g., "1.2.1")

---

## Timeline Estimate

| Phase                           | Effort           |
| ------------------------------- | ---------------- |
| Phase 0: Chapter Numbering      | 2-3 hours        |
| Phase 1: Model Updates          | 1-2 hours        |
| Phase 2: Type Definitions       | 1 hour           |
| Phase 3: Pipeline Builder       | 2-3 hours        |
| Phase 4-5: Service & Controller | 1 hour           |
| Testing & Verification          | 2-3 hours        |
| **Total**                       | **~10-12 hours** |
