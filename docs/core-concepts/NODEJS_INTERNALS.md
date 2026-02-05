# Node.js Internals: How It Works

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NODE.JS ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    YOUR JAVASCRIPT CODE                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     NODE.JS BINDINGS                         │   │
│  │              (C++ bindings between JS and C)                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│            ┌─────────────────┴─────────────────┐                    │
│            ▼                                   ▼                    │
│  ┌──────────────────┐              ┌──────────────────────┐        │
│  │    V8 ENGINE     │              │       LIBUV          │        │
│  │  (JavaScript     │              │  (Async I/O,         │        │
│  │   Execution)     │              │   Thread Pool,       │        │
│  │                  │              │   Event Loop)        │        │
│  └──────────────────┘              └──────────────────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## The Two Main Components

### 1. V8 Engine (Google's JavaScript Engine)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          V8 ENGINE                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  JavaScript Code                                                     │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐           │
│  │   Parser    │ ──► │  Ignition   │ ──► │  TurboFan   │           │
│  │ (AST Gen)   │     │(Interpreter)│     │ (Compiler)  │           │
│  └─────────────┘     └─────────────┘     └─────────────┘           │
│                                                 │                    │
│                                                 ▼                    │
│                                          Machine Code                │
│                                                                      │
│  Memory Management:                                                  │
│  ┌─────────────────────────────────────────────────────┐           │
│  │  Heap (Objects, Strings, Closures)                  │           │
│  │  Stack (Primitive values, References)               │           │
│  │  Garbage Collector (Mark & Sweep, Scavenger)        │           │
│  └─────────────────────────────────────────────────────┘           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**V8 Responsibilities:**
- Parse JavaScript code
- Compile to machine code (JIT compilation)
- Execute JavaScript
- Manage memory (garbage collection)
- Handle call stack

### 2. libuv (Async I/O Library)

```
┌─────────────────────────────────────────────────────────────────────┐
│                            LIBUV                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      EVENT LOOP                              │   │
│  │  (Single Thread - Orchestrates all async operations)         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│         ┌────────────────────┼────────────────────┐                 │
│         ▼                    ▼                    ▼                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐           │
│  │  Thread     │     │   Kernel    │     │  Network    │           │
│  │   Pool      │     │   Async     │     │    I/O      │           │
│  │ (4 threads) │     │  (epoll,    │     │  (sockets)  │           │
│  │             │     │  kqueue)    │     │             │           │
│  └─────────────┘     └─────────────┘     └─────────────┘           │
│        │                    │                    │                   │
│        ▼                    ▼                    ▼                   │
│   • File I/O           • TCP/UDP             • HTTP                 │
│   • DNS lookup         • Pipes               • WebSocket            │
│   • Compression        • TTY                 • TLS                  │
│   • Crypto             • Signals                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**libuv Responsibilities:**
- Event loop management
- Asynchronous I/O operations
- Thread pool for blocking operations
- Cross-platform abstraction

---

## Single-Threaded vs Multi-Threaded

### The Common Misconception

> "Node.js is single-threaded"

**Partially true.** Your JavaScript runs on ONE thread, but Node.js uses MULTIPLE threads internally.

### The Reality

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NODE.JS THREAD MODEL                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  MAIN THREAD (Single)                                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  • Your JavaScript code                                      │   │
│  │  • V8 execution                                              │   │
│  │  • Event loop                                                │   │
│  │  • Callbacks execution                                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  LIBUV THREAD POOL (4 threads by default)                          │
│  ┌──────────┬──────────┬──────────┬──────────┐                     │
│  │ Thread 1 │ Thread 2 │ Thread 3 │ Thread 4 │                     │
│  │ File I/O │ DNS      │ Crypto   │ Compress │                     │
│  └──────────┴──────────┴──────────┴──────────┘                     │
│                                                                      │
│  V8 THREADS (Background)                                            │
│  ┌──────────┬──────────┬──────────┐                                │
│  │ GC       │ Compiler │ Profiler │                                │
│  └──────────┴──────────┴──────────┘                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### What Runs Where?

| Operation | Thread | Blocking? |
|-----------|--------|-----------|
| Your JS code | Main | Can block |
| `setTimeout`, `setInterval` | Main | No |
| HTTP request handling | Main | No |
| `fs.readFile` | Thread Pool | No (async) |
| `fs.readFileSync` | Main | YES! |
| DNS lookup | Thread Pool | No (async) |
| Crypto operations | Thread Pool | No (async) |
| Network I/O | OS Kernel | No |
| `JSON.parse` (large) | Main | Can block |
| Heavy computation | Main | YES! |

---

## Thread Pool Deep Dive

### Default Configuration

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LIBUV THREAD POOL                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Default: 4 threads                                                 │
│  Max: 1024 threads                                                  │
│  Set via: UV_THREADPOOL_SIZE environment variable                   │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ Thread 1 │  │ Thread 2 │  │ Thread 3 │  │ Thread 4 │           │
│  │          │  │          │  │          │  │          │           │
│  │ [Task A] │  │ [Task B] │  │ [Task C] │  │ [Task D] │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
│       ▲             ▲             ▲             ▲                   │
│       └─────────────┴─────────────┴─────────────┘                   │
│                           │                                          │
│                    ┌──────┴──────┐                                  │
│                    │ Task Queue  │                                  │
│                    │ [E][F][G].. │                                  │
│                    └─────────────┘                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Operations Using Thread Pool

```typescript
// These use the thread pool (non-blocking)
const fs = require('fs');
const crypto = require('crypto');
const zlib = require('zlib');
const dns = require('dns');

// File operations
fs.readFile('large.txt', callback);     // Thread pool
fs.readFileSync('large.txt');           // BLOCKS main thread!

// Crypto
crypto.pbkdf2('password', 'salt', 100000, 64, 'sha512', callback);  // Thread pool
crypto.pbkdf2Sync('password', 'salt', 100000, 64, 'sha512');        // BLOCKS!

// Compression
zlib.gzip(buffer, callback);            // Thread pool

// DNS (not all operations)
dns.lookup('google.com', callback);     // Thread pool
```

### Increasing Thread Pool Size

```bash
# For I/O heavy applications
UV_THREADPOOL_SIZE=8 node server.js

# Or in code (must be BEFORE any async operation)
process.env.UV_THREADPOOL_SIZE = '8';
```

### Recommended Thread Pool Size

```
┌──────────────────────────────────────────────────────────┐
│  Formula: UV_THREADPOOL_SIZE = Number of CPU cores       │
│                                                          │
│  For 8 vCPU Railway:                                    │
│  UV_THREADPOOL_SIZE=8                                   │
│                                                          │
│  Note: More threads ≠ always better                     │
│  Context switching has overhead                         │
└──────────────────────────────────────────────────────────┘
```

---

## Worker Threads (True Multi-Threading)

### When to Use Worker Threads

```
┌─────────────────────────────────────────────────────────────────────┐
│                     WORKER THREADS                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Use for CPU-intensive tasks that would block the main thread:      │
│                                                                      │
│  • Image/video processing                                           │
│  • Complex calculations                                             │
│  • Data parsing (large JSON/XML)                                    │
│  • Compression                                                      │
│  • Encryption                                                       │
│                                                                      │
│  DON'T use for:                                                     │
│  • I/O operations (use async/await instead)                         │
│  • Simple operations (overhead not worth it)                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Worker Thread Example

```typescript
// main.ts
import { Worker } from 'worker_threads';

function runWorker(data: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./worker.js', {
      workerData: data
    });

    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

// Process heavy task without blocking main thread
const result = await runWorker({ numbers: [1, 2, 3, ...] });
```

```typescript
// worker.ts
import { parentPort, workerData } from 'worker_threads';

// Heavy computation
function processData(data: number[]): number {
  return data.reduce((sum, n) => sum + Math.pow(n, 2), 0);
}

const result = processData(workerData.numbers);
parentPort?.postMessage(result);
```

### Worker Threads vs Cluster

```
┌─────────────────────────────────────────────────────────────────────┐
│              WORKER THREADS vs CLUSTER                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  CLUSTER (cluster module)                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  • Separate processes (own memory)                           │   │
│  │  • Each process runs entire Node.js instance                 │   │
│  │  • Communication via IPC (slow)                              │   │
│  │  • Best for: Scaling HTTP servers                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  WORKER THREADS (worker_threads module)                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  • Threads within same process                               │   │
│  │  • Can share memory (SharedArrayBuffer)                      │   │
│  │  • Lighter weight than processes                             │   │
│  │  • Best for: CPU-intensive tasks                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Memory Model

### V8 Memory Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│                      V8 MEMORY LAYOUT                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STACK (Fixed size, ~1MB per thread)                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  • Primitive values (numbers, booleans)                      │   │
│  │  • References to heap objects                                │   │
│  │  • Function call frames                                      │   │
│  │  • LIFO (Last In, First Out)                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  HEAP (Dynamic, limited by --max-old-space-size)                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  NEW SPACE (Young Generation) - ~1-8 MB                     │   │
│  │  ┌────────────────────┬────────────────────┐               │   │
│  │  │    From Space      │     To Space       │               │   │
│  │  │  (Active objects)  │   (GC survivor)    │               │   │
│  │  └────────────────────┴────────────────────┘               │   │
│  │                                                              │   │
│  │  OLD SPACE (Old Generation) - Most of heap                  │   │
│  │  ┌─────────────────────────────────────────────────────┐   │   │
│  │  │  Objects that survived multiple GC cycles            │   │   │
│  │  │  Long-lived objects (cached data, globals)           │   │   │
│  │  └─────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  │  LARGE OBJECT SPACE                                         │   │
│  │  ┌─────────────────────────────────────────────────────┐   │   │
│  │  │  Objects > 512KB (arrays, buffers)                   │   │   │
│  │  └─────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Garbage Collection

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GARBAGE COLLECTION                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  SCAVENGER (Minor GC) - Fast, frequent                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  • Cleans New Space                                          │   │
│  │  • Runs every few milliseconds                               │   │
│  │  • Pause: ~1-10ms                                            │   │
│  │  • Moves survivors to Old Space                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  MARK-SWEEP-COMPACT (Major GC) - Slow, infrequent                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  • Cleans Old Space                                          │   │
│  │  • Runs when Old Space fills up                              │   │
│  │  • Pause: ~50-100ms (can be longer!)                         │   │
│  │  • Three phases: Mark → Sweep → Compact                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  INCREMENTAL MARKING                                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  • Breaks major GC into smaller chunks                       │   │
│  │  • Reduces pause times                                       │   │
│  │  • Runs between JS execution                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Blocking vs Non-Blocking

### Blocking Example (BAD)

```typescript
// This blocks the entire event loop!
app.get('/process', (req, res) => {
  // CPU-intensive operation
  let result = 0;
  for (let i = 0; i < 1000000000; i++) {
    result += Math.sqrt(i);
  }
  res.send({ result });
});

// While the above runs, ALL other requests wait!
```

### Non-Blocking Example (GOOD)

```typescript
// Option 1: Break into chunks
app.get('/process', async (req, res) => {
  let result = 0;
  const chunkSize = 1000000;

  for (let i = 0; i < 1000000000; i += chunkSize) {
    // Process chunk
    for (let j = i; j < Math.min(i + chunkSize, 1000000000); j++) {
      result += Math.sqrt(j);
    }
    // Yield to event loop
    await setImmediate(() => {});
  }

  res.send({ result });
});

// Option 2: Use Worker Thread
app.get('/process', async (req, res) => {
  const result = await runInWorker(heavyComputation);
  res.send({ result });
});
```

---

## Summary Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NODE.JS COMPLETE PICTURE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                      ┌─────────────────┐                            │
│                      │  Your JS Code   │                            │
│                      └────────┬────────┘                            │
│                               │                                      │
│                               ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     MAIN THREAD                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │   │
│  │  │   V8 (JS)   │  │ Event Loop  │  │  Callbacks  │         │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                               │                                      │
│         ┌─────────────────────┴─────────────────────┐               │
│         ▼                                           ▼               │
│  ┌─────────────────┐                    ┌─────────────────┐        │
│  │  THREAD POOL    │                    │   OS KERNEL     │        │
│  │  (4-128 threads)│                    │   (epoll/kqueue)│        │
│  │                 │                    │                 │        │
│  │  • fs.*         │                    │  • Network I/O  │        │
│  │  • crypto.*     │                    │  • TCP/UDP      │        │
│  │  • zlib.*       │                    │  • Pipes        │        │
│  │  • dns.lookup   │                    │  • Timers       │        │
│  └─────────────────┘                    └─────────────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Takeaways

1. **JavaScript runs on ONE thread** - Don't block it!
2. **I/O is handled by libuv** - Thread pool + OS kernel
3. **Thread pool = 4 threads by default** - Increase for I/O-heavy apps
4. **Worker Threads for CPU tasks** - True parallelism for heavy computation
5. **Cluster for scaling** - Multiple Node.js processes
