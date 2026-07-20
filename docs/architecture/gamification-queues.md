# ⚙️ Gamification Queue Architecture

> **Last Updated:** July 2026
> **Folder:** `docs/architecture/`
> **Related:** [`gamification.md`](./gamification.md) · [`src/constants/gamification.ts`](../../src/constants/gamification.ts) · [`src/jobs/`](../../src/jobs/)

---

## Table of Contents

1. [Overview](#overview)
2. [Queue vs. Event — What's the Difference?](#queue-vs-event--whats-the-difference)
3. [Job Catalogue](#job-catalogue)
4. [Job Flows (End-to-End)](#job-flows-end-to-end)
5. [File Structure to Create](#file-structure-to-create)
6. [Implementation Skeleton](#implementation-skeleton)
7. [Configuration Reference](#configuration-reference)

---

## Overview

The gamification system uses **BullMQ** (backed by Redis) to handle two categories of work:

| Category | Description | Examples |
|---|---|---|
| **BullMQ Jobs** | Async tasks with delays, retries, and scheduling | Chapter XP check (7-day delay), Story milestone, Daily badge cron |
| **Internal Events** | In-process signals fired immediately, no queue | XP awarded, Level up, Badge earned |

> The constant object `GAMIFICATION_JOBS` from `src/constants/gamification.ts` is the **single source of truth** for every job name string. Never hardcode these strings directly in worker or producer code — always import from constants.

```typescript
import { GAMIFICATION_JOBS } from '@/constants/gamification';
// e.g. GAMIFICATION_JOBS.CHAPTER_XP_CHECK === 'gamification.chapter-xp-check'
```

---

## Queue vs. Event — What's the Difference?

```
BullMQ Job (goes through Redis)          Internal Event (stays in process memory)
─────────────────────────────────        ──────────────────────────────────────
• Survives server restarts               • Lost if process crashes
• Supports delays (e.g. 7-day)          • Zero latency — synchronous
• Supports retries on failure            • Used to trigger notifications after XP
• Monitored in Bull Dashboard            • Implemented with EventEmitter / Fastify hooks
• Used for: deferred XP, cron badges    • Used for: level-up toast, badge notification
```

---

## Job Catalogue

### 🔵 BullMQ Jobs (go through Redis queue)

#### 1. `STORY_MILESTONE_CHECK`
**Key:** `gamification.story-milestone-check`

| Property | Value |
|---|---|
| **Trigger** | Immediately when a qualifying read is recorded (`readingHistory.qualifyingRead === true`) |
| **Delay** | None — runs as soon as read is confirmed |
| **Queue** | `gamification` |
| **Repeatable** | No — fires per read event |
| **Idempotency** | Checks `story.milestonesAwarded.*` fields before crediting XP |

**What it does:**
1. Loads the story's current `uniqueReaders` count
2. Checks if `reads100`, `reads1000`, or `reads10000` milestone fields are `false`
3. If the unique reader count crosses a threshold AND the milestone hasn't been awarded yet:
   - Sets `story.milestonesAwarded.<field> = true`
   - Calls `GamificationService.awardXP(authorId, xp, 'STORY_MILESTONE_*')`
   - Fires internal event `XP_AWARDED`

**Job data shape:**
```typescript
type StoryMilestoneJobData = {
  storySlug: string;
  authorId: string;
  currentUniqueReaders: number;
};
```

---

#### 2. `CHAPTER_XP_CHECK`
**Key:** `gamification.chapter-xp-check`

| Property | Value |
|---|---|
| **Trigger** | When a chapter is published (status becomes `PUBLISHED`) |
| **Delay** | **7 days** (`XP_TIMING.CHAPTER_SURVIVAL_DELAY_MS` = `7 * 24 * 60 * 60 * 1000`) |
| **Queue** | `gamification` |
| **Repeatable** | No — one job per chapter publish |
| **Idempotency** | Checks if XP transaction already exists for this chapterSlug + reason |

**What it does:**
1. Loads the chapter by slug
2. **Validation gates** (abort if any fail):
   - Chapter still exists (not deleted)?
   - `chapter.isFlagged === false`?
   - `chapter.stats.uniqueReaders >= XP_QUALITY_GATES.CHAPTER.MIN_UNIQUE_READS` (≥ 5)?
3. If all gates pass:
   - Checks how many chapter survival bonuses the author already received this week
   - Applies `getChapterSurvivalMultiplier(countThisWeek)` for diminishing returns
   - Calculates final XP: `Math.floor(CHAPTER_SURVIVAL_BASE × multiplier)`
   - Checks `XP_WEEKLY_CAPS.FROM_CHAPTER_SURVIVAL` (max 100 XP/week from this source)
   - Awards XP via `GamificationService.awardXP()`
   - Fires internal event `XP_AWARDED`

**Job data shape:**
```typescript
type ChapterXpCheckJobData = {
  chapterSlug: string;
  authorId: string;
  publishedAt: string; // ISO date
};
```

---

#### 3. `CHAPTER_SCORE_BONUS_CHECK`
**Key:** `gamification.chapter-score-bonus-check`

| Property | Value |
|---|---|
| **Trigger** | When a chapter's net vote score crosses 10 or 50 |
| **Delay** | **24 hours** (`XP_TIMING.CHAPTER_SCORE_SUSTAIN_MS`) — score must be held for 24h |
| **Queue** | `gamification` |
| **Repeatable** | One job per score threshold per chapter (score-10 and score-50 are separate jobs) |
| **Idempotency** | Checks XpTransaction for existing `CHAPTER_SCORE_BONUS_10` or `_50` for same chapterSlug |

**What it does:**
1. Re-fetches chapter's current `votes.score`
2. Verifies score is **still** at or above the threshold (score must be sustained 24h)
3. Checks no duplicate XP transaction exists for this chapter + bonus tier
4. If valid: awards `CHAPTER_SCORE_BONUS_10` (+20 XP) or `CHAPTER_SCORE_BONUS_50` (+50 XP)

**Job data shape:**
```typescript
type ChapterScoreBonusJobData = {
  chapterSlug: string;
  authorId: string;
  scoreTier: 10 | 50;      // which threshold was crossed
  scoreAtEnqueue: number;   // score when the job was created (for logging)
};
```

---

#### 4. `VETERAN_BADGE_CHECK`
**Key:** `gamification.veteran-badge-check`

| Property | Value |
|---|---|
| **Trigger** | **Daily cron** — runs once per day at midnight UTC |
| **Delay** | Cron: `0 0 * * *` |
| **Queue** | `gamification-cron` (separate queue for scheduled jobs) |
| **Repeatable** | Yes — repeating cron |
| **Idempotency** | Badge uses `$addToSet` — safe to run multiple times |

**What it does:**
1. Queries all users where `badges` does NOT include `VETERAN_WRITER`
2. For each user:
   - Checks `accountAge = now - user.createdAt >= 365 days`
   - Checks `recentXP = sum of XpTransactions in last 30 days >= 50`
   - If both pass: calls `GamificationService.checkAndAwardBadge(userId, 'VETERAN_WRITER', 365)`
3. Sends badge notification if newly awarded

**Job data shape:**
```typescript
// No data payload — cron job queries the DB itself
type VeteranBadgeJobData = Record<string, never>;
```

---

### 🟡 Internal Events (in-process only — NOT queued in Redis)

These are fired **synchronously inside the service layer** using Fastify's event emitter or Node's `EventEmitter`. They do not survive restarts and require no BullMQ setup.

#### `XP_AWARDED` — `gamification.xp-awarded`

Fired immediately after any XP transaction is credited to a user.

```typescript
// Payload
type XpAwardedEvent = {
  userId: string;
  amount: number;           // XP credited (positive or negative)
  reason: XPRewardKey;      // e.g. 'PR_APPROVED'
  newTotal: number;         // user.xp after update
  sourceId?: string;        // chapterSlug, storySlug, etc.
};
```

**Who listens:** `GamificationService` itself — listens to trigger level-up check.

---

#### `LEVEL_UP` — `gamification.level-up`

Fired when `calculateLevel(newXP) > previousLevel`.

```typescript
type LevelUpEvent = {
  userId: string;
  previousLevel: number;
  newLevel: number;
  newLevelTitle: string;    // e.g. 'Storyteller'
};
```

**Who listens:** `NotificationService` — sends push notification: *"You reached Level 4 — Storyteller! 🗺️"*

---

#### `BADGE_EARNED` — `gamification.badge-earned`

Fired when a badge is newly awarded.

```typescript
type BadgeEarnedEvent = {
  userId: string;
  badgeId: BadgeId;
  badgeName: string;        // e.g. 'Story Starter'
  badgeIcon: string;        // e.g. '📖'
};
```

**Who listens:** `NotificationService` — sends push notification: *"🏅 New Badge: Story Starter"*

---

## Job Flows (End-to-End)

### Chapter Published → XP Awarded (7-day flow)

```
ChapterService.create()
       │
       ▼
Chapter saved (status: PUBLISHED)
       │
       ▼
Enqueue CHAPTER_XP_CHECK job
  delay: 7 * 24 * 60 * 60 * 1000 ms
  data:  { chapterSlug, authorId, publishedAt }
       │
       │  ← 7 days pass →
       ▼
[BullMQ Worker fires]
chapter-xp-check processor runs:
  → Gate 1: chapter exists? (abort if deleted)
  → Gate 2: isFlagged === false? (abort if flagged)
  → Gate 3: uniqueReaders >= 5? (abort if not enough)
  → getDiminishingMultiplier(chaptersThisWeek)
  → calculateChapterSurvivalXP(chaptersThisWeek) → e.g. 10 XP
  → checkWeeklyCap(userId, 'FROM_CHAPTER_SURVIVAL') → under 100? ✅
  → GamificationService.awardXP(authorId, 10, 'CHAPTER_SURVIVAL_BASE', chapterSlug)
  → XP transaction inserted
  → user.xp += 10 (atomic $inc)
  → recalculateLevel(userId) → level changed?
       │ YES
       ▼
  Emit XP_AWARDED event → Emit LEVEL_UP event
       │
       ▼
  NotificationService: sends level-up push notification
```

### Story Read → Milestone XP (immediate flow)

```
ReadingHistoryService.recordRead()
       │
       ▼
readingHistory saved (qualifyingRead: true)
       │
       ▼
story.stats.uniqueReaders++ (atomic)
       │
       ▼
Enqueue STORY_MILESTONE_CHECK job (no delay)
  data: { storySlug, authorId, currentUniqueReaders }
       │
       ▼
[BullMQ Worker fires immediately]
story-milestone-check processor runs:
  → Load story.milestonesAwarded
  → uniqueReaders >= 100 AND reads100 === false?
       │ YES
       ▼
  Set story.milestonesAwarded.reads100 = true
  GamificationService.awardXP(authorId, 50, 'STORY_MILESTONE_100_READS')
  → Check badge: STORY_STARTER (distinctReaders >= 50)
  → Emit XP_AWARDED
```

### Daily Cron — Veteran Badge

```
[Cron fires at 00:00 UTC daily]
       │
       ▼
veteran-badge-check processor:
  → Query: db.users.find({ badges: { $nin: ['VETERAN_WRITER'] } })
  → For each user:
       accountAge = Date.now() - user.createdAt
       recentXP   = SUM(xpTransactions.amount WHERE createdAt > 30d ago)
       │
       ├── accountAge < 365d → skip
       ├── recentXP < 50     → skip
       │
       └── Both pass →
            User.findByIdAndUpdate($addToSet: { badges: 'VETERAN_WRITER' })
            NotificationService: sends badge notification
            Emit BADGE_EARNED
```

---

## File Structure to Create

```
src/
└── jobs/
    ├── gamification/
    │   ├── index.ts                        ← registers all gamification queues & workers
    │   ├── queues.ts                       ← Queue instances (exported for producers)
    │   ├── processors/
    │   │   ├── story-milestone.processor.ts
    │   │   ├── chapter-xp-check.processor.ts
    │   │   ├── chapter-score-bonus.processor.ts
    │   │   └── veteran-badge.processor.ts
    │   └── producers/
    │       └── gamification.producer.ts    ← helper functions to enqueue jobs
    ├── email.job.ts                        ← (existing)
    └── scheduled.job.ts                    ← (existing)
```

---

## Implementation Skeleton

### `src/jobs/gamification/queues.ts`

```typescript
import { Queue } from 'bullmq';
import { redisConnection } from '@/config/redis';
import { GAMIFICATION_JOBS } from '@/constants/gamification';

// Main queue — delayed and immediate jobs
export const gamificationQueue = new Queue('gamification', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

// Cron queue — repeating scheduled jobs
export const gamificationCronQueue = new Queue('gamification-cron', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
  },
});

// Register the daily veteran badge cron (idempotent — safe to call on startup)
export async function registerGamificationCrons() {
  await gamificationCronQueue.add(
    GAMIFICATION_JOBS.VETERAN_BADGE_CHECK,
    {},
    {
      repeat: { pattern: '0 0 * * *' }, // every day at midnight UTC
      jobId: 'veteran-badge-check-cron', // stable ID prevents duplicate cron registrations
    },
  );
}
```

---

### `src/jobs/gamification/producers/gamification.producer.ts`

```typescript
import { gamificationQueue } from '../queues';
import { GAMIFICATION_JOBS, XP_TIMING } from '@/constants/gamification';

// ── Story Milestone ──────────────────────────────────────────
export async function enqueueStoryMilestoneCheck(data: {
  storySlug: string;
  authorId: string;
  currentUniqueReaders: number;
}) {
  return gamificationQueue.add(GAMIFICATION_JOBS.STORY_MILESTONE_CHECK, data, {
    // No delay — fires immediately
    jobId: `story-milestone-${data.storySlug}-${data.currentUniqueReaders}`,
  });
}

// ── Chapter XP Check (7-day delay) ──────────────────────────
export async function enqueueChapterXpCheck(data: {
  chapterSlug: string;
  authorId: string;
  publishedAt: string;
}) {
  return gamificationQueue.add(GAMIFICATION_JOBS.CHAPTER_XP_CHECK, data, {
    delay: XP_TIMING.CHAPTER_SURVIVAL_DELAY_MS,      // 7 days in ms
    jobId: `chapter-xp-${data.chapterSlug}`,         // prevents duplicate jobs
  });
}

// ── Chapter Score Bonus (24-hour delay) ─────────────────────
export async function enqueueChapterScoreBonus(data: {
  chapterSlug: string;
  authorId: string;
  scoreTier: 10 | 50;
  scoreAtEnqueue: number;
}) {
  return gamificationQueue.add(GAMIFICATION_JOBS.CHAPTER_SCORE_BONUS_CHECK, data, {
    delay: XP_TIMING.CHAPTER_SCORE_SUSTAIN_MS,       // 24 hours in ms
    jobId: `chapter-score-bonus-${data.chapterSlug}-tier${data.scoreTier}`,
  });
}
```

---

### `src/jobs/gamification/processors/chapter-xp-check.processor.ts`

```typescript
import { Job } from 'bullmq';
import { GAMIFICATION_JOBS, XP_QUALITY_GATES, XP_REWARDS } from '@/constants/gamification';
import { calculateChapterSurvivalXP } from '@/constants/gamification';
import { Chapter } from '@/models/chapter.model';

export async function chapterXpCheckProcessor(job: Job) {
  const { chapterSlug, authorId } = job.data;

  // Load chapter
  const chapter = await Chapter.findOne({ slug: chapterSlug });

  // Gate 1: Does it still exist?
  if (!chapter) {
    return { skipped: true, reason: 'Chapter no longer exists' };
  }

  // Gate 2: Is it unflagged?
  if (chapter.isFlagged) {
    return { skipped: true, reason: 'Chapter is flagged' };
  }

  // Gate 3: Minimum unique reads
  if (chapter.stats.uniqueReaders < XP_QUALITY_GATES.CHAPTER.MIN_UNIQUE_READS) {
    return { skipped: true, reason: `Only ${chapter.stats.uniqueReaders} unique readers (need 5)` };
  }

  // Count how many chapter survival bonuses the author received this week
  // (query XpTransaction collection for this week's credited CHAPTER_SURVIVAL_BASE entries)
  const chaptersThisWeek = await getChapterSurvivalCountThisWeek(authorId);

  const xpToAward = calculateChapterSurvivalXP(chaptersThisWeek);

  if (xpToAward === 0) {
    return { skipped: true, reason: 'Diminishing returns: 0 XP for this chapter' };
  }

  // Award via GamificationService (also checks weekly cap internally)
  // await GamificationService.awardXP(authorId, xpToAward, 'CHAPTER_SURVIVAL_BASE', chapterSlug);

  return { awarded: xpToAward, chapterSlug };
}
```

---

### `src/jobs/gamification/index.ts`

```typescript
import { Worker } from 'bullmq';
import { redisConnection } from '@/config/redis';
import { GAMIFICATION_JOBS } from '@/constants/gamification';
import { registerGamificationCrons } from './queues';
import { storyMilestoneProcessor }   from './processors/story-milestone.processor';
import { chapterXpCheckProcessor }   from './processors/chapter-xp-check.processor';
import { chapterScoreBonusProcessor } from './processors/chapter-score-bonus.processor';
import { veteranBadgeProcessor }     from './processors/veteran-badge.processor';

export async function startGamificationWorkers() {
  // Register cron jobs (idempotent)
  await registerGamificationCrons();

  // Main worker — handles all delayed + immediate gamification jobs
  const worker = new Worker(
    'gamification',
    async (job) => {
      switch (job.name) {
        case GAMIFICATION_JOBS.STORY_MILESTONE_CHECK:
          return storyMilestoneProcessor(job);
        case GAMIFICATION_JOBS.CHAPTER_XP_CHECK:
          return chapterXpCheckProcessor(job);
        case GAMIFICATION_JOBS.CHAPTER_SCORE_BONUS_CHECK:
          return chapterScoreBonusProcessor(job);
        default:
          throw new Error(`Unknown gamification job: ${job.name}`);
      }
    },
    { connection: redisConnection, concurrency: 5 },
  );

  // Cron worker — handles repeating daily cron jobs
  const cronWorker = new Worker(
    'gamification-cron',
    async (job) => {
      switch (job.name) {
        case GAMIFICATION_JOBS.VETERAN_BADGE_CHECK:
          return veteranBadgeProcessor(job);
        default:
          throw new Error(`Unknown gamification cron job: ${job.name}`);
      }
    },
    { connection: redisConnection, concurrency: 1 },
  );

  worker.on('failed', (job, err) => {
    console.error(`[Gamification] Job ${job?.name} failed:`, err.message);
  });

  return { worker, cronWorker };
}
```

---

## Configuration Reference

### All Job Constants (`GAMIFICATION_JOBS`)

| Constant Key | String Value | Type | Delay |
|---|---|---|---|
| `STORY_MILESTONE_CHECK` | `gamification.story-milestone-check` | BullMQ Job | None (immediate) |
| `CHAPTER_XP_CHECK` | `gamification.chapter-xp-check` | BullMQ Job | **7 days** |
| `CHAPTER_SCORE_BONUS_CHECK` | `gamification.chapter-score-bonus-check` | BullMQ Job | **24 hours** |
| `VETERAN_BADGE_CHECK` | `gamification.veteran-badge-check` | BullMQ Cron | **Daily** (`0 0 * * *`) |
| `XP_AWARDED` | `gamification.xp-awarded` | Internal Event | Immediate |
| `LEVEL_UP` | `gamification.level-up` | Internal Event | Immediate |
| `BADGE_EARNED` | `gamification.badge-earned` | Internal Event | Immediate |

### Timing Constants Used (`XP_TIMING`)

| Constant | Value | Purpose |
|---|---|---|
| `INSTANT` | `0` ms | No delay — fires synchronously |
| `STORY_ESCROW_MS` | `172,800,000` ms (48h) | Minimum story age before milestone XP |
| `CHAPTER_SURVIVAL_DELAY_MS` | `604,800,000` ms (7 days) | BullMQ job delay for chapter XP check |
| `CHAPTER_SCORE_SUSTAIN_MS` | `86,400,000` ms (24h) | BullMQ job delay for score bonus check |
| `PR_MIN_OPEN_MS` | `3,600,000` ms (1h) | Minimum PR open time before approval XP |
| `VALID_REPORT_DELAY_MS` | `0` ms | Immediate on moderator action |

### Job ID Strategy (Idempotency)

Using stable `jobId` values prevents the same job from being enqueued twice:

| Job | `jobId` Pattern | Example |
|---|---|---|
| Story milestone | `story-milestone-{slug}-{reads}` | `story-milestone-my-story-100` |
| Chapter XP check | `chapter-xp-{slug}` | `chapter-xp-my-chapter-abc` |
| Chapter score bonus | `chapter-score-bonus-{slug}-tier{10\|50}` | `chapter-score-bonus-my-chapter-tier10` |
| Veteran badge cron | `veteran-badge-check-cron` (fixed) | Prevents duplicate cron registration |

> **Why does this matter?** If the server restarts while jobs are in the queue, BullMQ will try to re-add them. A stable `jobId` tells BullMQ "this job already exists — don't add a duplicate."

### Queue Naming Convention

| Queue Name | Purpose |
|---|---|
| `gamification` | All delayed and immediate one-off gamification jobs |
| `gamification-cron` | Repeating scheduled cron jobs only |

Keeping crons in a separate queue allows you to monitor them independently and prevents a flood of delayed jobs from starving the cron worker.
