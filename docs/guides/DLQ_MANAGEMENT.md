# Dead Letter Queue (DLQ) Management — StoryChain BullMQ Guide

> **Scope**: This document covers how BullMQ handles failed jobs in StoryChain, what a Dead Letter Queue is, why you need one, and **exactly** how to implement DLQ management for the existing `notification`, `email`, and `chapter-comment-vote` queues.

---

## Table of Contents

1. [What is a DLQ?](#1-what-is-a-dlq)
2. [Current Retry Configuration (As-Is)](#2-current-retry-configuration-as-is)
3. [The Problem Without a DLQ](#3-the-problem-without-a-dlq)
4. [DLQ Strategy for StoryChain](#4-dlq-strategy-for-storychain)
5. [Implementation Guide](#5-implementation-guide)
   - [Step 1 — Define DLQ Queue Names](#step-1--define-dlq-queue-names)
   - [Step 2 — Update Worker to Forward Failed Jobs](#step-2--update-worker-to-forward-failed-jobs)
   - [Step 3 — Create DLQ Processor (Alerting & Logging)](#step-3--create-dlq-processor-alerting--logging)
   - [Step 4 — Register DLQ Workers at Bootstrap](#step-4--register-dlq-workers-at-bootstrap)
   - [Step 5 — Add DLQ to Bull Board Dashboard](#step-5--add-dlq-to-bull-board-dashboard)
6. [Manual Retry from DLQ](#6-manual-retry-from-dlq)
7. [Admin API Endpoints for DLQ](#7-admin-api-endpoints-for-dlq)
8. [Monitoring & Alerting](#8-monitoring--alerting)
9. [Per-Queue Strategy Matrix](#9-per-queue-strategy-matrix)
10. [BullMQ Job Lifecycle Diagram](#10-bullmq-job-lifecycle-diagram)
11. [Best Practices & Gotchas](#11-best-practices--gotchas)

---

## 1. What is a DLQ?

A **Dead Letter Queue (DLQ)** is a secondary queue that holds jobs which have **exhausted all retry attempts** and still failed. Instead of losing these jobs or leaving them in a `failed` state polluting your main queue, they're moved to a dedicated queue where they can be:

- **Inspected** by developers/admins
- **Manually retried** after a root cause is fixed
- **Alerting** triggers can fire on DLQ depth
- **Metrics** can track failure rates over time

> [!IMPORTANT]
> BullMQ does NOT have a built-in DLQ feature. You must implement it yourself using the `failed` event on the worker. This is a common pattern in production BullMQ setups.

---

## 2. Current Retry Configuration (As-Is)

Here's what your codebase currently configures for retries:

### `QueueService.addJob()` defaults:
```typescript
// src/infrastructure/queue/queue.service.ts
const bullOptions: JobsOptions = {
  attempts: options?.attempts ?? 3,                     // 3 retries
  backoff: options?.backoff ?? { type: 'exponential', delay: 1000 },
  removeOnComplete: options?.removeOnComplete ?? true,  // ✅ Clean after success
  removeOnFail: options?.removeOnFail ?? false,         // ❌ Failed jobs STAY in Redis
};
```

### `ChapterCommentVoteQueue` overrides:
```typescript
// src/infrastructure/domains/chapterCommentVote.queue.ts
{
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: true,
  // removeOnFail defaults to false
}
```

### What happens today:
```
Attempt 1 → fails → wait 1s
Attempt 2 → fails → wait 2s
Attempt 3 → fails → ⚠️ Job stays in "failed" state FOREVER in Redis
```

---

## 3. The Problem Without a DLQ

| Issue | Impact |
|-------|--------|
| **Redis memory leak** | Failed jobs with `removeOnFail: false` accumulate indefinitely |
| **No visibility** | Failed jobs are scattered across multiple queues |
| **No alerting** | No one knows when jobs are permanently failing |
| **Hard to retry** | You'd need to SSH into the container or use Bull Board queue-by-queue |
| **Mixed concerns** | Failed jobs pollute the main queue metrics |

---

## 4. DLQ Strategy for StoryChain

The recommended pattern for your setup:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│  Main Queue │────▶│   Worker    │────▶│   ✅ Success         │
│ (3 retries) │     │ (processor) │     │   (removeOnComplete) │
└─────────────┘     └──────┬──────┘     └─────────────────────┘
                           │
                     ❌ All retries
                      exhausted
                           │
                           ▼
                 ┌─────────────────┐     ┌──────────────────┐
                 │   DLQ Queue     │────▶│  DLQ Worker      │
                 │ (dead-letter-*) │     │  - Log error     │
                 └─────────────────┘     │  - Send alert    │
                                         │  - Store context │
                                         └──────────────────┘
```

**Key decisions:**
- **One DLQ per main queue** (not a single global DLQ) — keeps job type safety
- **DLQ jobs are NOT auto-retried** — they require manual intervention
- **DLQ jobs expire after 7 days** — prevents indefinite Redis growth
- **Alerts fire** when DLQ depth exceeds a threshold

---

## 5. Implementation Guide

### Step 1 — Define DLQ Queue Names

Update `queue.types.ts` to include DLQ names:

```typescript
// src/infrastructure/queue/queue.types.ts

export const QUEUE_NAMES = {
  NOTIFICATION: 'notification',
  EMAIL: 'email',
  CHAPTER_COMMENT_VOTE: 'chapter-comment-vote',

  // ─── Dead Letter Queues ───
  DLQ_NOTIFICATION: 'dlq:notification',
  DLQ_EMAIL: 'dlq:email',
  DLQ_CHAPTER_COMMENT_VOTE: 'dlq:chapter-comment-vote',
} as const;

/** Maps a main queue name to its DLQ counterpart */
export const DLQ_MAP: Record<string, TQueueName> = {
  [QUEUE_NAMES.NOTIFICATION]: QUEUE_NAMES.DLQ_NOTIFICATION,
  [QUEUE_NAMES.EMAIL]: QUEUE_NAMES.DLQ_EMAIL,
  [QUEUE_NAMES.CHAPTER_COMMENT_VOTE]: QUEUE_NAMES.DLQ_CHAPTER_COMMENT_VOTE,
};
```

Also add the DLQ job data interface:

```typescript
// src/infrastructure/queue/queue.types.ts

/** Payload stored in a DLQ job — wraps the original job info + error context */
export interface IDLQJobData {
  /** Name of the original queue the job came from */
  originalQueue: string;
  /** Original job name (e.g. "notify:chapter-added") */
  originalJobName: string;
  /** The original job ID */
  originalJobId: string | undefined;
  /** Original job payload (serialized) */
  originalData: unknown;
  /** Error message from the final failure */
  errorMessage: string;
  /** Error stack trace */
  errorStack?: string;
  /** Number of attempts the job went through */
  attemptsMade: number;
  /** Timestamp when the job was moved to DLQ */
  movedToDlqAt: string;
}
```

### Step 2 — Update Worker to Forward Failed Jobs

Add a DLQ forwarding method to `WorkerService`:

```typescript
// src/infrastructure/queue/worker.service.ts — add to registerWorker()

// Inside the registerWorker method, REPLACE the existing 'failed' handler:

worker.on('failed', async (job: Job | undefined, error: Error) => {
  this.logError(
    `Job "${job?.name}" (id=${job?.id}) failed on queue "${queueName}": ${error.message}`
  );

  // If all retries exhausted, move to DLQ
  if (job && job.attemptsMade >= (job.opts?.attempts ?? 3)) {
    await this.moveToDeadLetterQueue(queueName, job, error);
  }
});
```

Add the `moveToDeadLetterQueue` method:

```typescript
// src/infrastructure/queue/worker.service.ts — add as a new private method

/**
 * Move a permanently failed job to the Dead Letter Queue.
 * Preserves the original job data, error context, and metadata
 * so that an admin can inspect and optionally retry.
 */
private async moveToDeadLetterQueue(
  originalQueueName: TQueueName,
  job: Job,
  error: Error
): Promise<void> {
  try {
    const dlqQueueName = DLQ_MAP[originalQueueName];
    if (!dlqQueueName) {
      this.logError(`No DLQ configured for queue "${originalQueueName}"`);
      return;
    }

    // Get or create the DLQ queue via QueueService
    const queueService = container.resolve<QueueService>(TOKENS.QueueService);
    const dlqQueue = queueService.getQueue(dlqQueueName);

    const dlqPayload: IDLQJobData = {
      originalQueue: originalQueueName,
      originalJobName: job.name,
      originalJobId: job.id,
      originalData: job.data,
      errorMessage: error.message,
      errorStack: error.stack,
      attemptsMade: job.attemptsMade,
      movedToDlqAt: new Date().toISOString(),
    };

    await dlqQueue.add(`dlq:${job.name}`, dlqPayload, {
      attempts: 1,             // DLQ jobs are NOT retried
      removeOnComplete: false,  // Keep for manual inspection
      removeOnFail: false,
      // Auto-expire from Redis after 7 days
      removeOnComplete: { age: 7 * 24 * 3600 },
      removeOnFail: { age: 7 * 24 * 3600 },
    });

    this.logInfo(
      `Job "${job.name}" (id=${job.id}) moved to DLQ "${dlqQueueName}"`
    );
  } catch (dlqError) {
    // DLQ forwarding itself should never crash the worker
    this.logError(
      `Failed to move job to DLQ: ${(dlqError as Error).message}`
    );
  }
}
```

> [!NOTE]
> You need to add these imports to `worker.service.ts`:
> ```typescript
> import { container } from 'tsyringe';
> import { TOKENS } from '@container/tokens';
> import { QueueService } from './queue.service';
> import { DLQ_MAP, IDLQJobData } from './queue.types';
> ```

### Step 3 — Create DLQ Processor (Alerting & Logging)

```typescript
// src/infrastructure/processors/dlq.processor.ts

import { Job } from 'bullmq';
import { logger } from '@/utils/logger';
import { IDLQJobData, IJobResult } from '../queue/queue.types';

/**
 * DLQ Processor — runs when a job lands in any Dead Letter Queue.
 *
 * Responsibilities:
 * 1. Log the full error context for debugging
 * 2. Trigger alerts (e.g. webhook, email to admin)
 * 3. Optionally persist to a "failed_jobs" MongoDB collection for auditing
 *
 * This processor intentionally does NOT retry the job. Its purpose
 * is observability and alerting only.
 */
export async function dlqProcessor(
  job: Job<IDLQJobData, IJobResult>
): Promise<IJobResult> {
  const { originalQueue, originalJobName, originalJobId, errorMessage, attemptsMade, movedToDlqAt } =
    job.data;

  // ─── 1. Structured logging ───
  logger.error('🚨 [DLQ] Job permanently failed', {
    dlqJobId: job.id,
    originalQueue,
    originalJobName,
    originalJobId,
    errorMessage,
    attemptsMade,
    movedToDlqAt,
  });

  // ─── 2. Alert (add your own webhook/email/slack integration) ───
  // Example: POST to a Slack webhook
  // await fetch(SLACK_WEBHOOK_URL, {
  //   method: 'POST',
  //   body: JSON.stringify({
  //     text: `🚨 DLQ Alert: Job "${originalJobName}" failed after ${attemptsMade} attempts.\nError: ${errorMessage}\nQueue: ${originalQueue}`,
  //   }),
  // });

  // ─── 3. Optional: Persist to MongoDB for querying ───
  // const FailedJob = mongoose.model('FailedJob');
  // await FailedJob.create({
  //   originalQueue,
  //   originalJobName,
  //   originalJobId,
  //   originalData: job.data.originalData,
  //   errorMessage,
  //   errorStack: job.data.errorStack,
  //   attemptsMade,
  //   movedToDlqAt,
  // });

  return {
    success: true,
    processedAt: new Date(),
    message: `DLQ job processed — alert sent for ${originalJobName}`,
  };
}
```

### Step 4 — Register DLQ Workers at Bootstrap

Update `worker.bootstrap.ts`:

```typescript
// src/infrastructure/queue/worker.bootstrap.ts

import { container } from 'tsyringe';
import { QUEUE_NAMES, WorkerService } from '.';
import { TOKENS } from '@/container';
import { commentVoteProcessor } from '../processors/commentVote.processors';
import { dlqProcessor } from '../processors/dlq.processor';
import { logger } from '@/utils/logger';
import { ChapterCommentVoteQueue } from '../domains/chapterCommentVote.queue';

export function bootstrapWorkers(): void {
  logger.info('[BOOTSTRAP-WORKERS]: 🚀 Bootstrapping workers');
  const workerService = container.resolve<WorkerService>(TOKENS.WorkerService);

  // ── Main workers ──
  workerService.registerWorker(QUEUE_NAMES.CHAPTER_COMMENT_VOTE, commentVoteProcessor, 1);

  // ── DLQ workers (all share the same dlqProcessor) ──
  workerService.registerWorker(QUEUE_NAMES.DLQ_NOTIFICATION, dlqProcessor, 1);
  workerService.registerWorker(QUEUE_NAMES.DLQ_EMAIL, dlqProcessor, 1);
  workerService.registerWorker(QUEUE_NAMES.DLQ_CHAPTER_COMMENT_VOTE, dlqProcessor, 1);

  logger.info('[BOOTSTRAP-WORKERS]: ✅ Workers bootstrapped (including DLQ workers)');
}

export async function bootstrapSchedulers(): Promise<void> {
  logger.info('[BOOTSTRAP-SCHEDULERS]: ⏰ Bootstrapping schedulers');

  const voteQueue = container.resolve(ChapterCommentVoteQueue);
  await voteQueue.enqueueSyncCountsJob();

  logger.info('[BOOTSTRAP-SCHEDULERS]: ✅ Schedulers bootstrapped');
}
```

### Step 5 — Add DLQ to Bull Board Dashboard

Update `app.ts` to show DLQ queues on the dashboard:

```typescript
// src/app.ts — update the queues array

const queues = [
  // Main queues
  QUEUE_NAMES.CHAPTER_COMMENT_VOTE,
  QUEUE_NAMES.EMAIL,
  QUEUE_NAMES.NOTIFICATION,
  // DLQ queues
  QUEUE_NAMES.DLQ_CHAPTER_COMMENT_VOTE,
  QUEUE_NAMES.DLQ_EMAIL,
  QUEUE_NAMES.DLQ_NOTIFICATION,
].map((name) => new BullMQAdapter(queueService.getQueue(name)));
```

Now the Bull Board at `/admin/queues` will show both main queues and their DLQ counterparts:

```
Dashboard:
├── notification           (main)
├── email                  (main)
├── chapter-comment-vote   (main)
├── dlq:notification       (DLQ)
├── dlq:email              (DLQ)
└── dlq:chapter-comment-vote (DLQ)
```

---

## 6. Manual Retry from DLQ

When you've fixed the root cause and want to replay failed jobs:

### Option A: Via Bull Board UI
1. Navigate to `/admin/queues`
2. Click on the DLQ queue (e.g., `dlq:notification`)
3. Find the failed job
4. Click **Retry** — this will retry it in the DLQ (just re-runs the alerting)

### Option B: Programmatic replay (recommended)
Create a utility function to move jobs FROM the DLQ BACK to the original queue:

```typescript
// src/infrastructure/queue/dlq.utils.ts

import { Queue } from 'bullmq';
import { QueueService } from './queue.service';
import { QUEUE_NAMES, DLQ_MAP, IDLQJobData, TQueueName } from './queue.types';
import { container } from 'tsyringe';
import { TOKENS } from '@/container';
import { logger } from '@/utils/logger';

/**
 * Replay a specific job from the DLQ back to its original queue.
 * The original payload is restored and the job is re-enqueued
 * with fresh retry attempts.
 */
export async function replayDlqJob(
  dlqQueueName: TQueueName,
  jobId: string
): Promise<boolean> {
  const queueService = container.resolve<QueueService>(TOKENS.QueueService);
  const dlqQueue = queueService.getQueue(dlqQueueName);

  const job = await dlqQueue.getJob(jobId);
  if (!job) {
    logger.warn(`[DLQ-Replay] Job ${jobId} not found in ${dlqQueueName}`);
    return false;
  }

  const dlqData = job.data as IDLQJobData;
  const originalQueueName = dlqData.originalQueue as TQueueName;
  const originalQueue = queueService.getQueue(originalQueueName);

  // Re-enqueue with original data and fresh retry config
  await originalQueue.add(dlqData.originalJobName, dlqData.originalData, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
    removeOnFail: false,
  });

  // Remove the DLQ job after successful replay
  await job.remove();

  logger.info(
    `[DLQ-Replay] Job "${dlqData.originalJobName}" replayed from ${dlqQueueName} → ${originalQueueName}`
  );
  return true;
}

/**
 * Replay ALL jobs currently in a DLQ back to their original queue.
 * Use with caution — only after the root cause is confirmed fixed.
 */
export async function replayAllDlqJobs(dlqQueueName: TQueueName): Promise<number> {
  const queueService = container.resolve<QueueService>(TOKENS.QueueService);
  const dlqQueue = queueService.getQueue(dlqQueueName);

  // Get all completed + failed jobs in the DLQ
  const jobs = await dlqQueue.getJobs(['completed', 'failed', 'waiting', 'active']);
  let replayed = 0;

  for (const job of jobs) {
    const success = await replayDlqJob(dlqQueueName, job.id!);
    if (success) replayed++;
  }

  logger.info(`[DLQ-Replay] Replayed ${replayed}/${jobs.length} jobs from ${dlqQueueName}`);
  return replayed;
}

/**
 * Purge (permanently delete) all jobs from a DLQ.
 * Use when failed jobs are no longer relevant.
 */
export async function purgeDlq(dlqQueueName: TQueueName): Promise<number> {
  const queueService = container.resolve<QueueService>(TOKENS.QueueService);
  const dlqQueue = queueService.getQueue(dlqQueueName);

  const jobs = await dlqQueue.getJobs(['completed', 'failed', 'waiting', 'active']);
  for (const job of jobs) {
    await job.remove();
  }

  logger.info(`[DLQ-Purge] Purged ${jobs.length} jobs from ${dlqQueueName}`);
  return jobs.length;
}
```

---

## 7. Admin API Endpoints for DLQ

Create a Fastify route for DLQ management:

```typescript
// src/features/admin/routes/dlq.routes.ts (example)

import { FastifyInstance } from 'fastify';
import { QUEUE_NAMES, TQueueName } from '@/infrastructure';
import { replayDlqJob, replayAllDlqJobs, purgeDlq } from '@/infrastructure/queue/dlq.utils';

export async function dlqRoutes(app: FastifyInstance) {
  // GET /admin/dlq/:queueName/stats
  app.get('/admin/dlq/:queueName/stats', async (request) => {
    const { queueName } = request.params as { queueName: string };
    const dlqName = `dlq:${queueName}` as TQueueName;

    const queueService = container.resolve<QueueService>(TOKENS.QueueService);
    const dlqQueue = queueService.getQueue(dlqName);
    const counts = await dlqQueue.getJobCounts();

    return { queue: dlqName, counts };
  });

  // POST /admin/dlq/:queueName/replay/:jobId
  app.post('/admin/dlq/:queueName/replay/:jobId', async (request) => {
    const { queueName, jobId } = request.params as { queueName: string; jobId: string };
    const dlqName = `dlq:${queueName}` as TQueueName;

    const success = await replayDlqJob(dlqName, jobId);
    return { success, replayed: jobId };
  });

  // POST /admin/dlq/:queueName/replay-all
  app.post('/admin/dlq/:queueName/replay-all', async (request) => {
    const { queueName } = request.params as { queueName: string };
    const dlqName = `dlq:${queueName}` as TQueueName;

    const count = await replayAllDlqJobs(dlqName);
    return { replayed: count };
  });

  // DELETE /admin/dlq/:queueName/purge
  app.delete('/admin/dlq/:queueName/purge', async (request) => {
    const { queueName } = request.params as { queueName: string };
    const dlqName = `dlq:${queueName}` as TQueueName;

    const count = await purgeDlq(dlqName);
    return { purged: count };
  });
}
```

> [!WARNING]
> Protect these admin endpoints with role-based auth! Only platform admins should be able to replay or purge DLQ jobs.

---

## 8. Monitoring & Alerting

### Prometheus Metrics (via `fastify-metrics`)

You already have `fastify-metrics` registered. Add custom metrics for DLQ:

```typescript
// In your DLQ processor or a dedicated metrics service:
import { register, Gauge, Counter } from 'prom-client';

const dlqDepth = new Gauge({
  name: 'storychain_dlq_depth',
  help: 'Number of jobs currently in the Dead Letter Queue',
  labelNames: ['queue'],
});

const dlqJobsTotal = new Counter({
  name: 'storychain_dlq_jobs_total',
  help: 'Total jobs moved to Dead Letter Queue',
  labelNames: ['queue', 'original_job_name'],
});
```

### Health Check Enhancement

Update your `/health` endpoint to include DLQ depth:

```typescript
app.get('/health', async () => {
  const queueService = container.resolve<QueueService>(TOKENS.QueueService);

  const dlqQueues = [
    QUEUE_NAMES.DLQ_NOTIFICATION,
    QUEUE_NAMES.DLQ_EMAIL,
    QUEUE_NAMES.DLQ_CHAPTER_COMMENT_VOTE,
  ];

  const dlqStats = await Promise.all(
    dlqQueues.map(async (name) => {
      const q = queueService.getQueue(name);
      const counts = await q.getJobCounts();
      return { queue: name, waiting: counts.waiting, failed: counts.failed };
    })
  );

  const totalDlqJobs = dlqStats.reduce((sum, s) => sum + s.waiting + s.failed, 0);

  return {
    status: totalDlqJobs > 50 ? 'degraded' : 'ok',
    dlq: dlqStats,
    totalDlqJobs,
  };
});
```

---

## 9. Per-Queue Strategy Matrix

| Queue | Retry Attempts | Backoff | DLQ TTL | Alert Threshold | Critical? |
|-------|---------------|---------|---------|-----------------|-----------|
| `notification` | 3 | exponential 1s | 7 days | > 10 jobs | Medium |
| `email` | 5 | exponential 2s | 14 days | > 5 jobs | High |
| `chapter-comment-vote` | 3 | exponential 1s | 3 days | > 20 jobs | Low |

**Rationale:**
- **Email** gets more retries (5) because transient SMTP failures are common, and missing emails is worse than missing a notification badge.
- **Comment votes** are lower criticality because the `syncVoteCounts` cron job (every minute) reconciles cache→DB anyway, so a lost vote job is self-healing.
- **Notifications** are medium — users notice missing notifications but they're not mission-critical.

---

## 10. BullMQ Job Lifecycle Diagram

```
                        ┌──────────┐
                        │  addJob  │
                        └────┬─────┘
                             │
                             ▼
                       ┌───────────┐
                       │  waiting   │
                       └─────┬─────┘
                             │
                             ▼
                       ┌───────────┐
                  ┌────│  active    │────┐
                  │    └───────────┘    │
                  │                     │
                  ▼                     ▼
            ┌───────────┐        ┌───────────┐
            │ completed  │        │  failed    │
            │ (removed)  │        │ (retry?)   │
            └───────────┘        └─────┬─────┘
                                       │
                              ┌────────┼────────┐
                              │                  │
                          attempts            attempts
                          < max               >= max
                              │                  │
                              ▼                  ▼
                        ┌───────────┐    ┌──────────────┐
                        │  waiting   │    │  DLQ Queue   │
                        │ (backoff)  │    │ (permanent)  │
                        └───────────┘    └──────┬───────┘
                                                │
                                          ┌─────┼─────┐
                                          │           │
                                     Admin Replay   Auto-Expire
                                     (→ original)   (7 days)
```

---

## 11. Best Practices & Gotchas

### ✅ Do

- **Always set `removeOnFail`** on DLQ jobs to auto-expire. Without it, DLQ jobs stay in Redis forever.
- **Include original error context** in the DLQ payload. The stack trace is critical for debugging.
- **Use the Bull Board dashboard** — it's already in your project at `/admin/queues`.
- **Set different retry strategies per queue** based on criticality (see matrix above).
- **Add a `jobId` for deduplication** where applicable (you already do this in `ChapterCommentVoteQueue`).

### ❌ Don't

- **Don't auto-retry from DLQ** — if a job failed 3 times, blindly retrying will likely fail again. Fix the root cause first.
- **Don't use a single global DLQ** — different queues have different data types. Keeping them separate preserves type safety.
- **Don't keep DLQ jobs forever** — set a TTL (7-14 days). Old failed jobs are noise, not signal.
- **Don't throw errors in the DLQ processor** — if the DLQ processor itself fails, you lose the job. Wrap everything in try/catch.

### ⚠️ Redis Memory Considerations on Fly.io

Your Fly.io machine has **1 GB RAM** total (shared with the app process, workers, and Node.js heap). If you're using external Redis (Redis Cloud / Upstash), this isn't a concern. But if you ever run Redis locally:

- Each failed job with full stack trace ≈ 2-5 KB
- 1000 DLQ jobs ≈ 2-5 MB — negligible
- Set `removeOnFail: { age: 7 * 24 * 3600 }` on DLQ jobs as a safety net
- Monitor Redis memory: `redis-cli INFO memory`

### 🔄 Idempotency Check

Before replaying DLQ jobs, ensure your processors are **idempotent** (safe to run twice):

| Queue | Idempotent? | Notes |
|-------|------------|-------|
| `chapter-comment-vote` | ✅ Yes | `upsertVote()` uses MongoDB `$set`, so re-running is safe |
| `notification` | ⚠️ Partially | Could create duplicate notifications — add a `jobId`-based dedup check |
| `email` | ❌ No | Replaying sends duplicate emails — add a `sentEmails` collection to track |

> [!TIP]
> For the `email` queue, store a hash of `(to, subject, templateId, timestamp)` in a `SentEmails` collection before sending. On replay, skip if the hash already exists.

---

## Summary

| What | Where |
|------|-------|
| DLQ queue names | `queue.types.ts` → `DLQ_MAP` |
| Failed job forwarding | `worker.service.ts` → `moveToDeadLetterQueue()` |
| DLQ processor (alerting) | `processors/dlq.processor.ts` |
| Worker bootstrap | `worker.bootstrap.ts` — register DLQ workers |
| Bull Board dashboard | `app.ts` — add DLQ queues to adapter list |
| Manual replay utility | `queue/dlq.utils.ts` |
| Admin API | `routes/dlq.routes.ts` |
