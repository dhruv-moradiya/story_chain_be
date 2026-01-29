# Railway Deployment Optimization (8 GB RAM / 8 vCPU)

## Your Resources

```
┌─────────────────────────────────────────────────────────┐
│                 RAILWAY SERVICE                         │
├─────────────────────────────────────────────────────────┤
│  RAM: 8 GB                                              │
│  vCPU: 8 cores                                          │
│  Network: Shared (varies by plan)                       │
└─────────────────────────────────────────────────────────┘
```

---

## The Problem: Node.js is Single-Threaded

By default, Node.js uses **only 1 CPU core**. With 8 vCPUs, you're wasting 87.5% of your compute power!

```
┌─────────────────────────────────────────────────────────┐
│                 DEFAULT NODE.JS                         │
├─────────────────────────────────────────────────────────┤
│  Core 1: [████████████] Node.js (100%)                  │
│  Core 2: [            ] Idle                            │
│  Core 3: [            ] Idle                            │
│  Core 4: [            ] Idle                            │
│  Core 5: [            ] Idle                            │
│  Core 6: [            ] Idle                            │
│  Core 7: [            ] Idle                            │
│  Core 8: [            ] Idle                            │
└─────────────────────────────────────────────────────────┘
```

---

## Solution 1: Node.js Cluster Mode

Use Node's built-in `cluster` module to spawn multiple processes.

### Implementation

```typescript
// src/cluster.ts
import cluster from 'cluster';
import os from 'os';

const numCPUs = process.env.WEB_CONCURRENCY
  ? parseInt(process.env.WEB_CONCURRENCY)
  : os.cpus().length;

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);
  console.log(`Forking ${numCPUs} workers...`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });

} else {
  // Workers run the actual app
  import('./server');
}
```

### Result with Cluster Mode

```
┌─────────────────────────────────────────────────────────┐
│              NODE.JS CLUSTER MODE (8 workers)           │
├─────────────────────────────────────────────────────────┤
│  Core 1: [████████████] Worker 1                        │
│  Core 2: [████████████] Worker 2                        │
│  Core 3: [████████████] Worker 3                        │
│  Core 4: [████████████] Worker 4                        │
│  Core 5: [████████████] Worker 5                        │
│  Core 6: [████████████] Worker 6                        │
│  Core 7: [████████████] Worker 7                        │
│  Core 8: [████████████] Worker 8                        │
└─────────────────────────────────────────────────────────┘
```

---

## Solution 2: PM2 (Recommended for Production)

PM2 is a production process manager that handles clustering automatically.

### Installation

```bash
npm install pm2
```

### Configuration (ecosystem.config.js)

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'storychain-api',
    script: './dist/server.js',

    // Use all available CPUs
    instances: 'max',  // or specific number like 8

    // Cluster mode for load balancing
    exec_mode: 'cluster',

    // Memory limit per instance (8GB / 8 workers = 1GB each)
    max_memory_restart: '900M',

    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },

    // Graceful reload
    wait_ready: true,
    listen_timeout: 10000,
    kill_timeout: 5000,

    // Logging
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    merge_logs: true,
  }]
};
```

### Railway Start Command

```json
// package.json
{
  "scripts": {
    "start:prod": "pm2-runtime start ecosystem.config.js"
  }
}
```

---

## Solution 3: Hybrid Architecture (API + Workers)

For apps with BullMQ, split resources between API and workers.

### Recommended Split for 8 vCPU / 8 GB

```
┌─────────────────────────────────────────────────────────┐
│              HYBRID ARCHITECTURE                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  API Servers (4 cores, 4 GB)                           │
│  ┌─────────┬─────────┬─────────┬─────────┐            │
│  │ API 1   │ API 2   │ API 3   │ API 4   │            │
│  │ 1 GB    │ 1 GB    │ 1 GB    │ 1 GB    │            │
│  └─────────┴─────────┴─────────┴─────────┘            │
│                                                         │
│  BullMQ Workers (4 cores, 4 GB)                        │
│  ┌─────────┬─────────┬─────────┬─────────┐            │
│  │Worker 1 │Worker 2 │Worker 3 │Worker 4 │            │
│  │ 1 GB    │ 1 GB    │ 1 GB    │ 1 GB    │            │
│  └─────────┴─────────┴─────────┴─────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Implementation

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    // API Servers
    {
      name: 'api',
      script: './dist/server.js',
      instances: 4,
      exec_mode: 'cluster',
      max_memory_restart: '900M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    // BullMQ Workers
    {
      name: 'worker',
      script: './dist/worker.js',
      instances: 4,
      exec_mode: 'cluster',
      max_memory_restart: '900M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

---

## Memory Allocation Strategy

### Formula

```
Memory per instance = (Total RAM - OS overhead) / Number of instances
                    = (8 GB - 512 MB) / 8
                    = ~900 MB per instance
```

### Recommended Settings

| Configuration | API Instances | Worker Instances | Memory/Instance |
|---------------|---------------|------------------|-----------------|
| API Only      | 8             | 0                | 900 MB          |
| API + Workers | 4             | 4                | 900 MB          |
| Heavy Workers | 2             | 6                | 900 MB          |
| Single Worker | 6             | 2                | 900 MB          |

---

## Railway Environment Variables

Add these to your Railway service:

```env
# Process Configuration
WEB_CONCURRENCY=8          # Number of cluster workers
NODE_ENV=production

# Memory Configuration
NODE_OPTIONS="--max-old-space-size=900"  # Limit V8 heap to 900MB

# PM2 (if using)
PM2_INSTANCES=max
```

---

## Monitoring Memory Usage

### Add Memory Monitoring

```typescript
// src/utils/memoryMonitor.ts
export function startMemoryMonitor(intervalMs = 30000) {
  setInterval(() => {
    const used = process.memoryUsage();
    console.log({
      rss: `${Math.round(used.rss / 1024 / 1024)} MB`,      // Total memory
      heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(used.external / 1024 / 1024)} MB`,
    });
  }, intervalMs);
}
```

---

## Performance Comparison

| Setup | Requests/sec | CPU Usage | Memory Usage |
|-------|--------------|-----------|--------------|
| Single Process | ~1,000 | 12.5% | 500 MB |
| 4 Workers | ~3,800 | 50% | 2 GB |
| 8 Workers | ~7,200 | 100% | 4 GB |
| 8 Workers + Optimized | ~9,000+ | 100% | 6 GB |

---

## Quick Start for Railway

### 1. Install PM2

```bash
npm install pm2
```

### 2. Create ecosystem.config.js

```javascript
module.exports = {
  apps: [{
    name: 'storychain',
    script: './dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '900M',
  }]
};
```

### 3. Update package.json

```json
{
  "scripts": {
    "start": "pm2-runtime start ecosystem.config.js"
  }
}
```

### 4. Set Railway Variables

```env
NODE_OPTIONS=--max-old-space-size=900
```

### 5. Deploy!

Your app now uses all 8 cores efficiently.

---

## Summary

| What | Default | Optimized |
|------|---------|-----------|
| CPU Usage | 1 core (12.5%) | 8 cores (100%) |
| Throughput | 1x | 7-8x |
| Memory | Unmanaged | 900MB/instance |
| Fault Tolerance | None | Auto-restart |
