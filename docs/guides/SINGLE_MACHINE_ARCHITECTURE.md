# Single Machine Architecture — API + Workers on Fly.io

> **Scope**: This document explains exactly how the StoryChain backend runs **both** the Fastify HTTP API server and BullMQ background workers within a **single Docker container** on one Fly.io machine, what happens under the hood, the trade-offs, and when/how to split them.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [How It Works Today (Single Process)](#2-how-it-works-today-single-process)
3. [Process Boot Sequence](#3-process-boot-sequence)
4. [Resource Sharing — CPU, Memory, Redis](#4-resource-sharing--cpu-memory-redis)
5. [What Happens When the Machine Stops?](#5-what-happens-when-the-machine-stops)
6. [Current Fly.io Configuration](#6-current-flyio-configuration)
7. [Risks & Failure Modes](#7-risks--failure-modes)
8. [Scaling Strategies](#8-scaling-strategies)
   - [Option A: Scale Vertically (Bigger Machine)](#option-a-scale-vertically-bigger-machine)
   - [Option B: Separate Processes via `fly.toml`](#option-b-separate-processes-via-flytoml)
   - [Option C: Separate Machines (Full Split)](#option-c-separate-machines-full-split)
9. [Recommended Configuration for Production](#9-recommended-configuration-for-production)
10. [Graceful Shutdown Handling](#10-graceful-shutdown-handling)
11. [Monitoring the Unified Process](#11-monitoring-the-unified-process)
12. [FAQ](#12-faq)

---

## 1. Architecture Overview

```
                    ┌─────────────────────────────────────────────────────────────────┐
                    │                    Fly.io Machine (1 VM)                        │
                    │                    1 shared CPU • 1 GB RAM                      │
                    │                                                                 │
                    │  ┌───────────────────────────────────────────────────────────┐  │
                    │  │              Node.js Process (node dist/server.js)       │  │
                    │  │                                                           │  │
                    │  │  ┌─────────────────────────────────────────────────────┐  │  │
                    │  │  │              Fastify HTTP Server (:8080)            │  │  │
                    │  │  │                                                     │  │  │
                    │  │  │  • REST API Routes (stories, chapters, PRs, etc.)  │  │  │
                    │  │  │  • Clerk Auth Middleware                            │  │  │
                    │  │  │  • Rate Limiting (via Redis)                        │  │  │
                    │  │  │  • Swagger UI at /docs                             │  │  │
                    │  │  │  • Bull Board UI at /admin/queues                  │  │  │
                    │  │  │  • Health Check at /health                         │  │  │
                    │  │  │  • Prometheus Metrics at /metrics                  │  │  │
                    │  │  └─────────────────────────────────────────────────────┘  │  │
                    │  │                                                           │  │
                    │  │  ┌─────────────────────────────────────────────────────┐  │  │
                    │  │  │            BullMQ Workers (in-process)              │  │  │
                    │  │  │                                                     │  │  │
                    │  │  │  • chapter-comment-vote worker (concurrency=1)     │  │  │
                    │  │  │  • notification worker         (not registered)    │  │  │
                    │  │  │  • email worker                (not registered)    │  │  │
                    │  │  └─────────────────────────────────────────────────────┘  │  │
                    │  │                                                           │  │
                    │  │  ┌─────────────────────────────────────────────────────┐  │  │
                    │  │  │            BullMQ Schedulers (in-process)           │  │  │
                    │  │  │                                                     │  │  │
                    │  │  │  • sync-counts cron (every minute via repeatable)  │  │  │
                    │  │  └─────────────────────────────────────────────────────┘  │  │
                    │  │                                                           │  │
                    │  └───────────────────────────────────────────────────────────┘  │
                    └───────────────────────────────┬────────────────┬────────────────┘
                                                    │                │
                                                    ▼                ▼
                                           ┌──────────────┐  ┌───────────────┐
                                           │ MongoDB Atlas │  │ Redis Cloud / │
                                           │  (external)   │  │   Upstash     │
                                           │               │  │  (external)   │
                                           └──────────────┘  └───────────────┘
```

**Key insight**: Everything runs inside a **single `node` process**. There is no process manager (PM2, supervisord), no separate worker container, no separate Dockerfile. The API server and the workers share the same Node.js event loop, memory heap, and TCP connections.

---

## 2. How It Works Today (Single Process)

Your entrypoint is:

```dockerfile
# Dockerfile, line 51
CMD ["node", "dist/server.js"]
```

This runs `src/server.ts` which does the following in sequence:

```typescript
// src/server.ts (simplified)
const start = async () => {
  // 1. Connect to MongoDB Atlas
  await databaseService.connect();

  // 2. Connect to Redis Cloud
  await redisService.connect();

  // 3. Create Fastify app (registers ALL plugins, routes, and queue infra)
  const app = await createApp();

  // 4. Start listening on port 8080
  await app.listen({ port: 8080, host: '0.0.0.0' });
};
```

Inside `createApp()` (in `src/app.ts`), the queue infrastructure is bootstrapped:

```typescript
// src/app.ts — key lines

// Line 27: Resolve QueueService (producer — creates BullMQ Queue instances)
const queueService = container.resolve<QueueService>(TOKENS.QueueService);

// Line 152: Register cron schedulers (repeatable BullMQ jobs)
await bootstrapSchedulers();

// Line 154: Register workers (consumers that process jobs)
bootstrapWorkers();
```

### What gets started:

| Component | Type | Thread Model |
|-----------|------|-------------|
| Fastify HTTP server | Event loop (async I/O) | Main thread |
| BullMQ `Queue` instances | Redis connection pool | Main thread (produces are async) |
| BullMQ `Worker` instances | Redis long-polling (BRPOPLPUSH) | Main thread (event-driven) |
| BullMQ Repeatable Jobs | Redis-based scheduling | Main thread |
| Bull Board UI | Fastify plugin | Main thread |

> [!IMPORTANT]
> BullMQ workers use **non-blocking I/O** to poll Redis for jobs. They do NOT create separate threads or child processes. This is why running them in the same process as the API server works — they're all cooperating on the same Node.js event loop.

---

## 3. Process Boot Sequence

Here's the exact startup order and what each step does:

```
────────────────────────────────────────────────────────────────
PHASE 1: Infrastructure Connections
────────────────────────────────────────────────────────────────

1. [server.ts] MongoDB Atlas connection
   └── Mongoose connects to cloud cluster
   └── Connection pool: default 100 connections

2. [server.ts] Redis Cloud connection
   └── ioredis connects to external Redis
   └── Single connection for the RedisService
   └── maxRetriesPerRequest: 3

────────────────────────────────────────────────────────────────
PHASE 2: Fastify App Assembly
────────────────────────────────────────────────────────────────

3. [app.ts] Fastify instance created
   └── CORS, Helmet, Clerk Auth registered

4. [app.ts] Rate limiter registered (uses Redis)
   └── 50 req/min per user/IP

5. [app.ts] Swagger & Swagger UI registered

6. [app.ts] Redis cache flushed (flushdb)
   └── ⚠️ This clears ALL Redis keys on every deploy!

7. [app.ts] Routes registered (all REST endpoints)

────────────────────────────────────────────────────────────────
PHASE 3: Queue Infrastructure
────────────────────────────────────────────────────────────────

8. [app.ts] bootstrapSchedulers()
   └── ChapterCommentVoteQueue.enqueueSyncCountsJob()
   └── Registers repeatable job: sync-counts (every minute)
   └── BullMQ Queue creates its own Redis connection

9. [app.ts] bootstrapWorkers()
   └── WorkerService.registerWorker('chapter-comment-vote', ...)
   └── BullMQ Worker creates its own Redis connection
   └── Worker begins polling Redis for jobs immediately

10. [app.ts] Bull Board registered at /admin/queues
    └── Adapters wrap each Queue for the dashboard

────────────────────────────────────────────────────────────────
PHASE 4: Listen
────────────────────────────────────────────────────────────────

11. [server.ts] app.listen({ port: 8080, host: '0.0.0.0' })
    └── Fastify starts accepting TCP connections
    └── Fly.io health check starts: GET /health

────────────────────────────────────────────────────────────────
READY
────────────────────────────────────────────────────────────────
```

> [!NOTE]
> **Redis connections**: Your single process opens multiple Redis connections:
> - 1 for `RedisService` (cache, rate limiting)
> - 1 per `Queue` instance (producer side — currently 3 queues)
> - 1 per `Worker` instance (consumer side — currently 1 worker)
> - **Total: ~5 Redis connections** from one machine

---

## 4. Resource Sharing — CPU, Memory, Redis

### Your Fly.io Machine Specs:

```toml
# fly.toml
[[vm]]
  memory = '1gb'
  cpu_kind = 'shared'
  cpus = 1
  memory_mb = 1024
```

### How resources are consumed:

```
┌─────────────────────────────────────────────────┐
│               1 GB RAM Budget                    │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │ Node.js Heap (V8)          ~300-500 MB   │   │
│  │ ├── Fastify route handlers               │   │
│  │ ├── Mongoose document buffers            │   │
│  │ ├── BullMQ job data in memory            │   │
│  │ └── Request/response buffers             │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │ OS + Node Runtime           ~100-200 MB  │   │
│  │ ├── Alpine Linux kernel                  │   │
│  │ ├── Node.js runtime                      │   │
│  │ └── Native modules (ioredis, mongoose)   │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │ Available headroom          ~300-600 MB  │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### CPU sharing between API and Workers:

```
Event Loop Cycle:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐
│ API     │  │ Worker   │  │ API      │  │ Worker  │ ...
│ Request │  │ Job      │  │ Request  │  │ Job     │
│ Handler │  │ Process  │  │ Handler  │  │ Process │
└─────────┘  └──────────┘  └──────────┘  └─────────┘
     │              │            │             │
     └──────────────┴────────────┴─────────────┘
                        │
              Single-threaded event loop
              (cooperative multitasking)
```

> [!WARNING]
> **CPU contention scenario**: If a worker job does heavy synchronous computation (e.g., parsing a massive document), it will **block the API** from responding to HTTP requests until the computation finishes. Currently your `commentVoteProcessor` does lightweight MongoDB operations (async I/O), so this is NOT a problem today.

---

## 5. What Happens When the Machine Stops?

Your `fly.toml` has:

```toml
auto_stop_machines = 'stop'    # Machine stops when idle
auto_start_machines = true     # Machine restarts on incoming request
min_machines_running = 0       # 0 means ALL machines can stop
```

### The lifecycle:

```
┌─────────┐     ┌─────────────┐     ┌───────────┐     ┌───────────┐
│ Running  │────▶│ No traffic  │────▶│ auto_stop │────▶│  Stopped  │
│          │     │  for ~5 min │     │           │     │           │
└─────────┘     └─────────────┘     └───────────┘     └─────┬─────┘
                                                            │
                                                      HTTP request
                                                       arrives
                                                            │
                                                            ▼
                                                    ┌───────────┐
                                                    │auto_start │
                                                    │(cold start│
                                                    │ ~3-8 sec) │
                                                    └───────────┘
```

### What happens to workers and queues during stop/start:

| Event | API | Workers | Queues |
|-------|-----|---------|--------|
| **Machine stops** | HTTP connections close | Workers disconnect from Redis | Jobs stay in Redis (safe) |
| **Machine is stopped** | ❌ No API available | ❌ No jobs processed | ✅ Jobs accumulate in Redis |
| **Machine starts** | API starts in ~3-8s | Workers reconnect to Redis | Accumulated jobs begin processing |
| **During cold start** | 503 errors possible | Workers resume polling | Backlog is drained |

> [!CAUTION]
> **Critical impact of `min_machines_running = 0`**:
> 
> When the machine is stopped, **no workers are running**. Jobs enqueued by external webhooks (e.g., Clerk user sync) will sit in Redis until the next HTTP request wakes the machine. This means:
> - Notifications can be delayed by hours if no one visits the site
> - Scheduled cron jobs do NOT run while the machine is stopped
> - The `sync-counts` job won't fire until the machine wakes up
>
> **Fix**: Set `min_machines_running = 1` if you need workers to always be active.

### What happens to in-flight jobs during shutdown:

When Fly.io sends SIGTERM to stop the machine:

1. Fly.io sends `SIGTERM` to the Node.js process
2. **Currently**: Your app has no SIGTERM handler → process exits immediately
3. Any in-flight BullMQ job is **abandoned** mid-execution
4. BullMQ marks abandoned jobs as `stalled` after the stall interval (default 30s)
5. When the worker restarts, stalled jobs are automatically retried

> See [Section 10](#10-graceful-shutdown-handling) for implementing proper shutdown.

---

## 6. Current Fly.io Configuration

```toml
# fly.toml

app = 'story-chain-be'
primary_region = 'bom'          # Mumbai, India

[build]
# Uses the Dockerfile in the project root

[http_service]
  internal_port = 8080           # Fastify listens here
  force_https = true
  auto_stop_machines = 'stop'    # ⚠️ Stops when idle
  auto_start_machines = true     # Restarts on request
  min_machines_running = 0       # ⚠️ Can fully stop
  processes = ['app']            # Single process group

[[vm]]
  memory = '1gb'
  cpu_kind = 'shared'            # Burstable CPU (not dedicated)
  cpus = 1
  memory_mb = 1024
```

### What Fly.io uses from the Dockerfile:

```dockerfile
# Stage 1: Build (tsc + tsc-alias)
FROM node:20-alpine AS builder
RUN npm run build

# Stage 2: Runner (production image)
FROM node:20-alpine AS runner
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/server.js"]    # ← This is the single process
```

---

## 7. Risks & Failure Modes

### Risk Matrix for Single-Machine Setup

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Worker blocks API** (CPU-intensive job) | Low | High | Keep workers async, avoid sync computation |
| **OOM Kill** (exceed 1 GB) | Medium | Critical | Monitor heap, set `--max-old-space-size` |
| **Cold start delays** (machine was stopped) | High | Medium | Set `min_machines_running = 1` |
| **Job loss on crash** | Low | Medium | BullMQ stall detection retries automatically |
| **Redis connection exhaustion** | Low | High | Use connection pooling, limit max connections |
| **Webhook jobs lost during stop** | Medium | Medium | External queue (webhook → Redis) survives; jobs wait |

### Memory Pressure Scenario

```
Normal Operation:           Memory Pressure:
┌───────────────┐           ┌───────────────┐
│ API: 200 MB   │           │ API: 500 MB   │ ← Spike from large responses
│ Worker: 50 MB │           │ Worker: 300 MB│ ← Batch sync processing
│ Runtime: 150 MB│          │ Runtime: 150 MB│
│ Free: 624 MB  │           │ Free: 74 MB   │ ← ⚠️ Danger zone
└───────────────┘           └───────────────┘

                            If > 1024 MB → OOM Kill → Process restart
                            → In-flight API requests: LOST
                            → In-flight worker jobs: STALLED (auto-retry)
```

**Protect against OOM**:
```dockerfile
# Add to Dockerfile CMD
CMD ["node", "--max-old-space-size=768", "dist/server.js"]
```

This caps the V8 heap at 768 MB, leaving ~256 MB for the OS, native modules, and buffer memory.

---

## 8. Scaling Strategies

### Option A: Scale Vertically (Bigger Machine)

**When**: Your current setup works but you're hitting memory/CPU limits.

```toml
# fly.toml
[[vm]]
  memory = '2gb'           # 2x memory
  cpu_kind = 'shared'      
  cpus = 2                 # 2 shared CPUs
  memory_mb = 2048
```

```bash
fly scale vm shared-cpu-2x
fly scale memory 2048
```

**Pros**: Zero code changes. Just more resources.
**Cons**: Still single point of failure. Costs more.

### Option B: Separate Processes via `fly.toml`

**When**: You want API and workers on the same machine but isolated as separate processes.

This uses Fly.io's **process groups** feature:

```toml
# fly.toml

app = 'story-chain-be'
primary_region = 'bom'

# ── Process Groups ──
[processes]
  app = "node dist/server.js"           # API only
  worker = "node dist/worker-entry.js"  # Workers only

# ── HTTP Service (only for 'app' process) ──
[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0
  processes = ['app']

# ── VM for API ──
[[vm]]
  processes = ['app']
  memory = '512mb'
  cpu_kind = 'shared'
  cpus = 1

# ── VM for Workers (always running!) ──
[[vm]]
  processes = ['worker']
  memory = '512mb'
  cpu_kind = 'shared'
  cpus = 1
```

You'd need to create a separate entrypoint file:

```typescript
// src/worker-entry.ts

import 'reflect-metadata';
import { container, TOKENS } from '@container/index';
import { RedisService } from '@config/services/redis.service';
import { DatabaseService } from '@config/services/database.service';
import { bootstrapWorkers, bootstrapSchedulers } from '@infrastructure/queue/worker.bootstrap';
import { logger } from '@utils/logger';

const startWorkers = async () => {
  try {
    // Workers need DB access (for processors that query MongoDB)
    const databaseService = container.resolve<DatabaseService>(TOKENS.DatabaseService);
    await databaseService.connect();

    // Workers need Redis (for BullMQ polling)
    const redisService = container.resolve<RedisService>(TOKENS.RedisService);
    await redisService.connect();

    // Bootstrap schedulers and workers
    await bootstrapSchedulers();
    bootstrapWorkers();

    logger.info('🔧 Worker process started — listening for jobs');

    // Keep the process alive
    process.on('SIGTERM', async () => {
      logger.info('Worker received SIGTERM — shutting down gracefully');
      // Close workers, then exit
      process.exit(0);
    });
  } catch (error) {
    logger.error('❌ Failed to start workers:', error);
    process.exit(1);
  }
};

startWorkers();
```

**Pros**: API can stop/start independently. Workers can always run.
**Cons**: 2 VMs = 2x base cost. Need separate entrypoint.

### Option C: Separate Machines (Full Split)

**When**: You need full isolation, independent scaling, or different regions.

```
┌─────────────────┐         ┌─────────────────┐
│   story-chain-  │         │  story-chain-    │
│   api (fly app) │         │  worker (fly app)│
│                 │         │                  │
│  Fastify + REST │         │  BullMQ Workers  │
│  Bull Board UI  │         │  Schedulers      │
│  Port 8080      │         │  No HTTP         │
└────────┬────────┘         └────────┬─────────┘
         │                           │
         └─────────┬─────────────────┘
                   │
          ┌────────┴────────┐
          │  Shared Redis   │
          │  (Redis Cloud)  │
          └────────┬────────┘
                   │
          ┌────────┴────────┐
          │ Shared MongoDB  │
          │ (Atlas)         │
          └─────────────────┘
```

**Pros**: Full isolation. Scale workers independently. Different auto-stop policies.
**Cons**: Need 2 Fly.io apps. More infrastructure to manage.

---

## 9. Recommended Configuration for Production

### For your current scale (early stage / low traffic):

Keep the **single machine** setup, but make these changes:

```toml
# fly.toml — RECOMMENDED changes

app = 'story-chain-be'
primary_region = 'bom'

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 1       # ← CHANGE: Always keep 1 machine running
  processes = ['app']

[[vm]]
  memory = '1gb'
  cpu_kind = 'shared'
  cpus = 1
  memory_mb = 1024
```

### Why `min_machines_running = 1`:

| Setting | Worker Behavior | Cold Starts | Cost |
|---------|----------------|-------------|------|
| `min_machines_running = 0` | Workers stop when idle → jobs accumulate | Yes (3-8s) | Cheapest |
| `min_machines_running = 1` | Workers always running → jobs processed immediately | No | Small monthly cost |

> [!TIP]
> With `min_machines_running = 1`, your workers will always be processing jobs and your cron schedulers will always fire on time. This is the minimum viable production config.

### Dockerfile change — add Node.js memory limit:

```dockerfile
# Last line of Dockerfile
CMD ["node", "--max-old-space-size=768", "dist/server.js"]
```

---

## 10. Graceful Shutdown Handling

Your app currently has **no SIGTERM handler**. When Fly.io shuts down the machine, the Node.js process is killed immediately, which can:

- Leave API requests hanging
- Abandon in-flight worker jobs (they'll be stalled and retried)
- Leave Redis connections in a dirty state

### Add graceful shutdown to `server.ts`:

```typescript
// src/server.ts — add after start()

import { QueueService, WorkerService } from '@infrastructure/queue';

const gracefulShutdown = async (signal: string) => {
  logger.info(`📛 Received ${signal} — starting graceful shutdown...`);

  try {
    // 1. Stop accepting new HTTP connections
    // (app.close() will be available after createApp)

    // 2. Close all BullMQ workers (waits for in-progress jobs)
    const workerService = container.resolve<WorkerService>(TOKENS.WorkerService);
    await workerService.closeAll();
    logger.info('✅ All workers closed');

    // 3. Close all BullMQ queue connections
    const queueService = container.resolve<QueueService>(TOKENS.QueueService);
    await queueService.closeAll();
    logger.info('✅ All queues closed');

    // 4. Close Redis connection
    const redisService = container.resolve<RedisService>(TOKENS.RedisService);
    await redisService.disconnect();
    logger.info('✅ Redis disconnected');

    // 5. Close MongoDB connection
    const databaseService = container.resolve<DatabaseService>(TOKENS.DatabaseService);
    await databaseService.disconnect();
    logger.info('✅ MongoDB disconnected');

    logger.info('👋 Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

> [!IMPORTANT]
> Fly.io gives you **10 seconds** by default to handle SIGTERM before sending SIGKILL. If your shutdown takes longer, add a `kill_timeout` to your `fly.toml`:
> ```toml
> [http_service]
>   ...
> 
> # Give the app more time to drain connections
> kill_timeout = "30s"
> ```

---

## 11. Monitoring the Unified Process

### Key metrics to watch:

| Metric | Source | Alert When |
|--------|--------|------------|
| **Heap Used (MB)** | `process.memoryUsage().heapUsed` | > 700 MB |
| **Event Loop Lag (ms)** | `fastify-metrics` | > 100 ms |
| **Active Workers** | `WorkerService.isRunning()` | Any worker NOT running |
| **Queue Depth** | `queue.getJobCounts()` | Waiting jobs > 100 |
| **Failed Jobs** | `queue.getJobCounts().failed` | > 0 |
| **Redis Latency** | `redis-cli --latency` | > 10 ms |

### Add to your `/health` endpoint:

```typescript
app.get('/health', async () => {
  const workerService = container.resolve<WorkerService>(TOKENS.WorkerService);
  const queueService = container.resolve<QueueService>(TOKENS.QueueService);

  // Check if workers are running
  const workerStatus = {
    'chapter-comment-vote': workerService.isRunning(QUEUE_NAMES.CHAPTER_COMMENT_VOTE),
  };

  // Check queue depths
  const queueDepths = {};
  for (const name of [QUEUE_NAMES.CHAPTER_COMMENT_VOTE, QUEUE_NAMES.NOTIFICATION, QUEUE_NAMES.EMAIL]) {
    const q = queueService.getQueue(name);
    const counts = await q.getJobCounts();
    queueDepths[name] = counts;
  }

  // Memory info
  const memory = process.memoryUsage();

  return {
    status: 'ok',
    uptime: process.uptime(),
    memory: {
      heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`,
      rss: `${Math.round(memory.rss / 1024 / 1024)} MB`,
    },
    workers: workerStatus,
    queues: queueDepths,
  };
});
```

### Using Fly.io's built-in monitoring:

```bash
# Live logs
fly logs

# Machine status
fly status

# SSH into running container
fly ssh console

# Check memory from inside the container
fly ssh console -C "cat /proc/meminfo | head -5"

# Check Node.js heap from inside the container
fly ssh console -C "node -e 'console.log(process.memoryUsage())'"
```

---

## 12. FAQ

### Q: Will API requests slow down if workers are processing many jobs?

**A**: Unlikely with your current setup. Your `commentVoteProcessor` does lightweight async MongoDB operations (upsert, update count). These are I/O-bound (waiting for MongoDB response), which means the event loop is free to handle API requests while waiting. 

This would only be a problem if:
- A worker job does **synchronous computation** (e.g., CPU-intensive text processing)
- A worker job loads a **massive dataset** into memory

### Q: What if I need to process 1000 jobs quickly?

**A**: BullMQ workers process jobs serially by default (concurrency = 1). To increase throughput:

```typescript
// In worker.bootstrap.ts
workerService.registerWorker(QUEUE_NAMES.CHAPTER_COMMENT_VOTE, commentVoteProcessor, 5);
//                                                                              concurrency ↑
```

Be cautious: higher concurrency = more memory and more concurrent MongoDB operations.

### Q: Can I run scheduled jobs reliably with `auto_stop_machines = 'stop'`?

**A**: **No.** When the machine is stopped, no Node.js process is running. BullMQ's repeatable jobs are implemented by having the worker poll Redis on a schedule. If the worker isn't running, the scheduled job simply won't fire until the machine wakes up.

**Solution**: Set `min_machines_running = 1` or use an external cron service.

### Q: What happens if the machine crashes mid-job?

**A**: BullMQ has built-in **stall detection**:
1. When a worker picks up a job, it periodically sends a "heartbeat" to Redis (every 30s by default).
2. If the heartbeat stops (because the process crashed), BullMQ marks the job as **stalled**.
3. When the worker restarts, stalled jobs are automatically retried.
4. If `maxStalledCount` (default 1) is exceeded, the job is moved to the failed state.

### Q: Should I use a separate Fly.io app for workers?

**A**: Not yet. Split when:
- You have **> 3 worker types** with high throughput
- Workers need **different scaling** from the API (e.g., 3 worker machines, 1 API machine)
- You need workers in a **different region** from the API
- Worker jobs are **CPU-intensive** and interfere with API latency

### Q: How do I ensure Redis Cloud doesn't become a bottleneck?

**A**: Your Redis connections from one machine:
- 1 for RedisService (cache/rate-limit)
- 3 for Queue instances (one per queue)
- 1 for Worker instance

That's ~5 connections. Redis Cloud's free tier supports up to 30, so you're fine. Watch for:
- Connection limits on the Redis provider plan
- Redis memory usage (each job is a few KB)
- Network latency between Fly.io (Mumbai) and your Redis region

---

## Summary

| Aspect | Current State | Recommended Next Step |
|--------|--------------|----------------------|
| **Architecture** | Single process (API + Workers) | Keep for now ✅ |
| **Machine count** | 1 machine, can stop to 0 | Set `min_machines_running = 1` |
| **Memory** | 1 GB shared | Add `--max-old-space-size=768` to CMD |
| **Shutdown** | No graceful handler | Add SIGTERM handler (Section 10) |
| **Health check** | Basic `{ status: 'ok' }` | Add worker/queue/memory stats (Section 11) |
| **Worker scaling** | Concurrency = 1 | Sufficient for now, increase per queue as needed |
| **When to split** | N/A | When workers interfere with API latency or need independent scaling |
