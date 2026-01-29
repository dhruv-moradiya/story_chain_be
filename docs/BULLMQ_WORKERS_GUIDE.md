# BullMQ Workers Configuration Guide

## How Many Workers Should You Create?

### Quick Answer for 8 vCPU / 8 GB RAM

```
┌─────────────────────────────────────────────────────────┐
│           RECOMMENDED CONFIGURATION                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  For Mixed Workload (API + Workers):                   │
│  • 4 API processes                                      │
│  • 4 Worker processes                                   │
│  • Each worker: concurrency 5-10                        │
│  • Total parallel jobs: 20-40                           │
│                                                         │
│  For Worker-Heavy Workload:                            │
│  • 2 API processes                                      │
│  • 6 Worker processes                                   │
│  • Each worker: concurrency 5-10                        │
│  • Total parallel jobs: 30-60                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Understanding BullMQ Concepts

### Worker vs Process vs Concurrency

```
┌─────────────────────────────────────────────────────────┐
│                    TERMINOLOGY                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Process (Node.js Instance)                            │
│  └── Worker (BullMQ Worker Class)                      │
│      └── Concurrency (Parallel Jobs per Worker)        │
│                                                         │
│  Example: 4 processes × 1 worker × 10 concurrency      │
│           = 40 jobs running in parallel                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Visual Representation

```
┌─────────────────────────────────────────────────────────┐
│                 PROCESS 1 (Worker)                      │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐    │
│  │Job 1│Job 2│Job 3│Job 4│Job 5│Job 6│Job 7│Job 8│    │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘    │
│                    concurrency = 8                      │
├─────────────────────────────────────────────────────────┤
│                 PROCESS 2 (Worker)                      │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐    │
│  │Job 9│J 10 │J 11 │J 12 │J 13 │J 14 │J 15 │J 16 │    │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘    │
│                    concurrency = 8                      │
├─────────────────────────────────────────────────────────┤
│                    Total: 16 parallel jobs              │
└─────────────────────────────────────────────────────────┘
```

---

## Factors That Determine Worker Count

### 1. Job Type (CPU vs I/O Bound)

| Job Type | Examples | Recommended Concurrency |
|----------|----------|------------------------|
| **CPU-Bound** | Image processing, PDF generation, Compression | 1 per CPU core |
| **I/O-Bound** | API calls, DB queries, File uploads | 10-50 per process |
| **Mixed** | Most real apps | 5-15 per process |

### 2. Memory Per Job

```
Available Memory = 8 GB - OS overhead - API processes
Worker Memory = Available Memory / Number of workers

If each job uses ~50 MB:
  With 4 workers, each with 1 GB limit
  Max concurrent jobs per worker = 1024 MB / 50 MB ≈ 20
```

### 3. Job Duration

| Job Duration | Concurrency Strategy |
|--------------|---------------------|
| < 100ms | High concurrency (20-50) |
| 100ms - 1s | Medium concurrency (10-20) |
| 1s - 10s | Low concurrency (5-10) |
| > 10s | Very low (1-5) |

---

## Configuration Examples

### Example 1: I/O-Bound Jobs (API calls, DB operations)

```typescript
// worker.ts
import { Worker } from 'bullmq';
import { redisConnection } from './config/redis';

const worker = new Worker(
  'notification-queue',
  async (job) => {
    // Send email, push notification, etc.
    await sendNotification(job.data);
  },
  {
    connection: redisConnection,
    concurrency: 20,  // High - jobs are mostly waiting on I/O
    limiter: {
      max: 100,       // Max 100 jobs per duration
      duration: 1000, // Per second (rate limiting)
    },
  }
);
```

### Example 2: CPU-Bound Jobs (Image processing)

```typescript
// worker.ts
import { Worker } from 'bullmq';
import os from 'os';

const worker = new Worker(
  'image-processing',
  async (job) => {
    // Heavy CPU work
    await processImage(job.data);
  },
  {
    connection: redisConnection,
    concurrency: 1,  // Low - CPU intensive, one per core
  }
);
```

### Example 3: Mixed Workload with Multiple Queues

```typescript
// worker.ts
import { Worker } from 'bullmq';

// High-priority, fast jobs
const emailWorker = new Worker('email-queue', processEmail, {
  connection: redisConnection,
  concurrency: 15,
});

// Medium priority, moderate duration
const notificationWorker = new Worker('notification-queue', processNotification, {
  connection: redisConnection,
  concurrency: 10,
});

// Low priority, heavy jobs
const reportWorker = new Worker('report-queue', generateReport, {
  connection: redisConnection,
  concurrency: 2,
});
```

---

## Recommended Setup for StoryChain (8 vCPU / 8 GB)

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│              STORYCHAIN WORKER SETUP                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Railway Service: 8 vCPU / 8 GB                        │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  API PROCESSES (4 instances)           4 GB     │   │
│  │  • Handles HTTP requests                        │   │
│  │  • Adds jobs to queues                          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  WORKER PROCESSES (4 instances)        4 GB     │   │
│  │                                                  │   │
│  │  Worker 1: email-queue      (concurrency: 10)   │   │
│  │  Worker 2: notification-queue (concurrency: 15) │   │
│  │  Worker 3: story-processing  (concurrency: 5)   │   │
│  │  Worker 4: analytics-queue   (concurrency: 20)  │   │
│  │                                                  │   │
│  │  Total parallel jobs: ~50                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// src/workers/index.ts
import { Worker, Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

// Queue definitions
export const emailQueue = new Queue('email', { connection: redisConnection });
export const notificationQueue = new Queue('notification', { connection: redisConnection });
export const storyQueue = new Queue('story-processing', { connection: redisConnection });

// Worker configurations based on job characteristics
const workerConfigs = {
  email: {
    concurrency: 10,
    limiter: { max: 50, duration: 1000 }, // 50 emails/sec max
  },
  notification: {
    concurrency: 15,
    limiter: { max: 100, duration: 1000 },
  },
  'story-processing': {
    concurrency: 5, // CPU intensive
  },
};

export function startWorkers() {
  const emailWorker = new Worker('email', processEmail, {
    connection: redisConnection,
    ...workerConfigs.email,
  });

  const notificationWorker = new Worker('notification', processNotification, {
    connection: redisConnection,
    ...workerConfigs.notification,
  });

  const storyWorker = new Worker('story-processing', processStory, {
    connection: redisConnection,
    ...workerConfigs['story-processing'],
  });

  // Graceful shutdown
  const shutdown = async () => {
    await emailWorker.close();
    await notificationWorker.close();
    await storyWorker.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
```

### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'api',
      script: './dist/server.js',
      instances: 4,
      exec_mode: 'cluster',
      max_memory_restart: '900M',
    },
    {
      name: 'worker',
      script: './dist/worker.js',
      instances: 4,
      exec_mode: 'cluster',
      max_memory_restart: '900M',
    },
  ],
};
```

---

## Calculating Optimal Concurrency

### Formula

```
Optimal Concurrency = (Wait Time + Processing Time) / Processing Time

For I/O-bound job:
  Wait time (network): 100ms
  Processing time (CPU): 10ms
  Optimal = (100 + 10) / 10 = 11

For CPU-bound job:
  Wait time: 0ms
  Processing time: 100ms
  Optimal = (0 + 100) / 100 = 1
```

### Practical Guidelines

| Job Characteristic | Concurrency | Workers (4 CPU) | Total Parallel |
|-------------------|-------------|-----------------|----------------|
| Fast I/O (< 50ms) | 20-30 | 4 | 80-120 |
| Slow I/O (50-500ms) | 10-20 | 4 | 40-80 |
| Mixed (API + DB) | 5-15 | 4 | 20-60 |
| CPU Heavy | 1-2 | 4 | 4-8 |
| Memory Heavy (> 100MB/job) | 2-5 | 2 | 4-10 |

---

## Rate Limiting

### External API Rate Limits

```typescript
// If external API allows 100 requests/minute
const worker = new Worker('api-calls', processApiCall, {
  connection: redisConnection,
  concurrency: 10,
  limiter: {
    max: 100,
    duration: 60000, // 60 seconds
  },
});
```

### Database Protection

```typescript
// Limit DB-heavy operations
const worker = new Worker('db-heavy', processDbOperation, {
  connection: redisConnection,
  concurrency: 5,
  limiter: {
    max: 50,
    duration: 1000, // 50 operations per second max
  },
});
```

---

## Monitoring Workers

### Add Worker Events

```typescript
worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
});

// Monitor queue health
setInterval(async () => {
  const waiting = await queue.getWaitingCount();
  const active = await queue.getActiveCount();
  const delayed = await queue.getDelayedCount();

  console.log({ waiting, active, delayed });

  // Alert if queue is backing up
  if (waiting > 1000) {
    console.warn('Queue backing up! Consider increasing workers.');
  }
}, 30000);
```

---

## Summary Table

| Your Setup | API Processes | Worker Processes | Concurrency/Worker | Total Jobs |
|------------|---------------|------------------|-------------------|------------|
| Balanced | 4 | 4 | 10 | 40 |
| API Heavy | 6 | 2 | 15 | 30 |
| Worker Heavy | 2 | 6 | 10 | 60 |
| Single Queue | 4 | 4 | 5-20 | 20-80 |

### Key Takeaways

1. **Start conservative**: Begin with concurrency of 5-10, monitor, then adjust
2. **I/O-bound = high concurrency**: Jobs waiting on network can have 20+ concurrency
3. **CPU-bound = low concurrency**: Match to CPU cores (1 per core)
4. **Monitor memory**: Each job consumes memory, don't exceed limits
5. **Use rate limiting**: Protect external APIs and databases
