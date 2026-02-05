# Node.js Event Loop - Deep Dive

## What is the Event Loop?

The Event Loop is the heart of Node.js - it's what enables non-blocking I/O operations despite JavaScript being single-threaded.

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  "The Event Loop is what allows Node.js to perform non-blocking     │
│   I/O operations by offloading operations to the system kernel      │
│   whenever possible."                                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Event Loop Phases

The Event Loop has **6 phases**, each with its own queue of callbacks.

```
┌─────────────────────────────────────────────────────────────────────┐
│                     EVENT LOOP PHASES                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌───────────────────────────────────────────────────────────┐     │
│   │                                                           │     │
│   │  ┌─────────────────┐                                     │     │
│   │  │   1. TIMERS     │  setTimeout, setInterval            │     │
│   │  └────────┬────────┘                                     │     │
│   │           │                                               │     │
│   │           ▼                                               │     │
│   │  ┌─────────────────┐                                     │     │
│   │  │  2. PENDING     │  I/O callbacks (previous iteration) │     │
│   │  │    CALLBACKS    │                                     │     │
│   │  └────────┬────────┘                                     │     │
│   │           │                                               │     │
│   │           ▼                                               │     │
│   │  ┌─────────────────┐                                     │     │
│   │  │   3. IDLE,      │  Internal use only                  │     │
│   │  │     PREPARE     │                                     │     │
│   │  └────────┬────────┘                                     │     │
│   │           │                                               │     │
│   │           ▼                                               │     │
│   │  ┌─────────────────┐                                     │     │
│   │  │    4. POLL      │  Retrieve new I/O events            │     │
│   │  │                 │  Execute I/O callbacks              │     │
│   │  └────────┬────────┘                                     │     │
│   │           │                                               │     │
│   │           ▼                                               │     │
│   │  ┌─────────────────┐                                     │     │
│   │  │    5. CHECK     │  setImmediate callbacks             │     │
│   │  └────────┬────────┘                                     │     │
│   │           │                                               │     │
│   │           ▼                                               │     │
│   │  ┌─────────────────┐                                     │     │
│   │  │ 6. CLOSE        │  close event callbacks              │     │
│   │  │   CALLBACKS     │  (socket.on('close'))               │     │
│   │  └────────┬────────┘                                     │     │
│   │           │                                               │     │
│   │           └───────────────────────────────────────────┐  │     │
│   │                                                       │  │     │
│   └───────────────────────────────────────────────────────┘  │     │
│                           Loop continues...                   │     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase Details

### 1. Timers Phase

```
┌─────────────────────────────────────────────────────────────────────┐
│                      TIMERS PHASE                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Executes callbacks for:                                            │
│  • setTimeout()                                                     │
│  • setInterval()                                                    │
│                                                                      │
│  IMPORTANT: Timers are NOT guaranteed to execute at exact time!     │
│                                                                      │
│  setTimeout(() => console.log('timer'), 100);                       │
│                                                                      │
│  Timeline:                                                          │
│  ─────────────────────────────────────────────────────────────►    │
│  0ms        100ms       105ms                                       │
│  │          │ (minimum) │ (actual - depends on event loop)         │
│  │          │           │                                           │
│  scheduled  can run     actually runs                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

```typescript
// Timer behavior example
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));

// Output order is NOT deterministic in main module!
// Could be: timeout, immediate
// Or:       immediate, timeout
```

### 2. Pending Callbacks Phase

```
┌─────────────────────────────────────────────────────────────────────┐
│                  PENDING CALLBACKS PHASE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Executes callbacks deferred to the next loop iteration:            │
│                                                                      │
│  • Some TCP errors (ECONNREFUSED)                                   │
│  • Some system operations                                           │
│                                                                      │
│  Rarely interacted with directly                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. Idle, Prepare Phase

```
┌─────────────────────────────────────────────────────────────────────┐
│                  IDLE, PREPARE PHASE                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Internal use only - not directly accessible                        │
│                                                                      │
│  Used by Node.js internals for housekeeping                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4. Poll Phase (Most Important!)

```
┌─────────────────────────────────────────────────────────────────────┐
│                       POLL PHASE                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  The Poll phase has two main functions:                             │
│                                                                      │
│  1. Calculate how long to block and poll for I/O                    │
│  2. Process events in the poll queue                                │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    POLL QUEUE                                │   │
│  │  ┌──────┬──────┬──────┬──────┬──────┐                       │   │
│  │  │ cb1  │ cb2  │ cb3  │ cb4  │ ...  │                       │   │
│  │  └──────┴──────┴──────┴──────┴──────┘                       │   │
│  │                                                              │   │
│  │  Callbacks for:                                              │   │
│  │  • fs.readFile                                               │   │
│  │  • HTTP responses                                            │   │
│  │  • Database queries                                          │   │
│  │  • Most I/O operations                                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Poll Phase Decision Tree:                                          │
│                                                                      │
│          Poll queue empty?                                          │
│              /        \                                              │
│            NO          YES                                           │
│            │            │                                            │
│            ▼            ▼                                            │
│      Execute all    Any setImmediate?                               │
│      callbacks          /     \                                      │
│                       YES      NO                                    │
│                        │        │                                    │
│                        ▼        ▼                                    │
│                   Go to     Any timers ready?                       │
│                   Check        /     \                               │
│                   phase      YES      NO                             │
│                               │        │                             │
│                               ▼        ▼                             │
│                          Go to     Block and                        │
│                          Timers    wait for I/O                     │
│                          phase                                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5. Check Phase

```
┌─────────────────────────────────────────────────────────────────────┐
│                       CHECK PHASE                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Executes setImmediate() callbacks                                  │
│                                                                      │
│  setImmediate() is special:                                         │
│  • Always runs AFTER the poll phase                                 │
│  • Designed to execute after I/O callbacks                          │
│                                                                      │
│  fs.readFile('file.txt', (err, data) => {                          │
│    setTimeout(() => console.log('timeout'), 0);                     │
│    setImmediate(() => console.log('immediate'));                    │
│  });                                                                │
│                                                                      │
│  // Inside I/O callback, setImmediate ALWAYS runs first!           │
│  // Output: immediate, timeout                                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6. Close Callbacks Phase

```
┌─────────────────────────────────────────────────────────────────────┐
│                   CLOSE CALLBACKS PHASE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Executes close event callbacks:                                    │
│                                                                      │
│  • socket.on('close', ...)                                         │
│  • server.on('close', ...)                                         │
│  • Process cleanup                                                  │
│                                                                      │
│  const socket = new net.Socket();                                   │
│  socket.on('close', () => {                                        │
│    console.log('Socket closed');  // Runs in this phase            │
│  });                                                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Microtasks: process.nextTick() and Promises

**Microtasks run BETWEEN every phase!**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MICROTASKS QUEUES                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Two special queues that run between EVERY phase:                   │
│                                                                      │
│  1. nextTick Queue (highest priority)                               │
│     • process.nextTick() callbacks                                  │
│                                                                      │
│  2. Microtask Queue                                                 │
│     • Promise .then(), .catch(), .finally()                         │
│     • queueMicrotask()                                              │
│                                                                      │
│                                                                      │
│     ┌────────┐      ┌────────────┐      ┌────────┐                 │
│     │ Timers │ ──► │ nextTick + │ ──► │Pending │ ──► ...          │
│     │        │      │ Microtasks │      │Callbacks│                 │
│     └────────┘      └────────────┘      └────────┘                 │
│                           ▲                                          │
│                           │                                          │
│                     Runs after                                      │
│                     EVERY phase!                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Priority Order

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EXECUTION PRIORITY                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  HIGHEST PRIORITY                                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  1. process.nextTick()                                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  2. Promise callbacks (.then, .catch, .finally)              │   │
│  │     queueMicrotask()                                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  3. Event Loop Phases (Timers → Poll → Check → etc.)         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  LOWEST PRIORITY                                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Example: Execution Order

```typescript
console.log('1. Script start');

setTimeout(() => console.log('2. setTimeout'), 0);

Promise.resolve()
  .then(() => console.log('3. Promise 1'))
  .then(() => console.log('4. Promise 2'));

process.nextTick(() => console.log('5. nextTick'));

setImmediate(() => console.log('6. setImmediate'));

console.log('7. Script end');
```

**Output:**
```
1. Script start
7. Script end
5. nextTick         <- nextTick runs first (highest priority)
3. Promise 1        <- Then promises
4. Promise 2
2. setTimeout       <- Then timers (or setImmediate, order not guaranteed)
6. setImmediate
```

---

## Complete Event Loop Visualization

```
┌─────────────────────────────────────────────────────────────────────┐
│                 COMPLETE EVENT LOOP FLOW                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    SYNCHRONOUS CODE                           │  │
│  │                    (Call Stack)                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │   process.nextTick queue (drain completely)                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │   Promise microtask queue (drain completely)                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────┼───────────────────────────────────┐ │
│  │                           ▼                    EVENT LOOP     │ │
│  │  ┌─────────────┐    ┌──────────┐    ┌─────────────┐          │ │
│  │  │   TIMERS    │───►│nextTick +│───►│  PENDING    │          │ │
│  │  │             │    │Microtasks│    │  CALLBACKS  │          │ │
│  │  └─────────────┘    └──────────┘    └─────────────┘          │ │
│  │         │                                   │                 │ │
│  │         │                                   ▼                 │ │
│  │         │           ┌──────────┐    ┌─────────────┐          │ │
│  │         │           │nextTick +│◄───│    IDLE     │          │ │
│  │         │           │Microtasks│    │   PREPARE   │          │ │
│  │         │           └──────────┘    └─────────────┘          │ │
│  │         │                 │                                   │ │
│  │         │                 ▼                                   │ │
│  │         │           ┌─────────────┐                          │ │
│  │         │           │    POLL     │◄── Wait for I/O          │ │
│  │         │           │             │                          │ │
│  │         │           └─────────────┘                          │ │
│  │         │                 │                                   │ │
│  │         │                 ▼                                   │ │
│  │         │           ┌──────────┐    ┌─────────────┐          │ │
│  │         │           │nextTick +│───►│   CHECK     │          │ │
│  │         │           │Microtasks│    │ setImmediate│          │ │
│  │         │           └──────────┘    └─────────────┘          │ │
│  │         │                                   │                 │ │
│  │         │                                   ▼                 │ │
│  │         │           ┌──────────┐    ┌─────────────┐          │ │
│  │         └───────────│nextTick +│◄───│   CLOSE     │          │ │
│  │                     │Microtasks│    │  CALLBACKS  │          │ │
│  │                     └──────────┘    └─────────────┘          │ │
│  │                                                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Common Pitfalls

### 1. Starving the Event Loop with nextTick

```typescript
// BAD - This will starve the event loop!
function badRecursion() {
  process.nextTick(badRecursion);
}
badRecursion();

// setTimeout callbacks will NEVER run
// because nextTick queue never empties
```

### 2. Blocking the Event Loop

```typescript
// BAD - Blocks entire event loop
app.get('/compute', (req, res) => {
  // This blocks for seconds!
  const result = heavyComputation();
  res.send(result);
});

// GOOD - Don't block
app.get('/compute', async (req, res) => {
  // Offload to worker
  const result = await workerPool.run(heavyComputation);
  res.send(result);
});
```

### 3. Misunderstanding Timer Precision

```typescript
// This is NOT precise!
setTimeout(() => {
  // May execute at 5ms, 10ms, or later
  // depending on event loop state
}, 5);

// For precise timing, use:
// - Worker threads
// - Native addons
// - External services
```

---

## Practical Examples

### Example 1: I/O vs Timers

```typescript
const fs = require('fs');

// What prints first?
setTimeout(() => console.log('timeout 1'), 0);
setImmediate(() => console.log('immediate 1'));

// Inside I/O callback, setImmediate is ALWAYS first
fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout 2'), 0);
  setImmediate(() => console.log('immediate 2'));
});

/*
Output:
(timeout 1 or immediate 1 - non-deterministic in main)
(timeout 1 or immediate 1)
immediate 2  <- ALWAYS before timeout 2 (inside I/O)
timeout 2
*/
```

### Example 2: Yielding to Event Loop

```typescript
// Process large array without blocking
async function processLargeArray(items: any[]) {
  const results = [];
  const CHUNK_SIZE = 1000;

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);

    // Process chunk
    for (const item of chunk) {
      results.push(processItem(item));
    }

    // Yield to event loop every chunk
    // Allows other callbacks to run
    await new Promise(resolve => setImmediate(resolve));
  }

  return results;
}
```

### Example 3: Understanding Async Order

```typescript
async function asyncExample() {
  console.log('1');

  setTimeout(() => console.log('2'), 0);

  await Promise.resolve();
  console.log('3');

  process.nextTick(() => console.log('4'));

  await Promise.resolve();
  console.log('5');

  setImmediate(() => console.log('6'));
}

asyncExample();
console.log('7');

/*
Output:
1
7
3
4
5
2
6
*/
```

---

## Summary Cheat Sheet

| Function | Queue | When it Runs |
|----------|-------|--------------|
| `process.nextTick()` | nextTick queue | After current operation, before anything else |
| `Promise.then()` | Microtask queue | After nextTick queue drains |
| `queueMicrotask()` | Microtask queue | Same as Promise.then() |
| `setTimeout(fn, 0)` | Timers phase | Next iteration, timers phase |
| `setImmediate()` | Check phase | Next iteration, check phase |
| `setInterval()` | Timers phase | Repeatedly in timers phase |
| I/O callbacks | Poll phase | When I/O completes |

### Quick Rules

1. **nextTick > Promises > Event Loop phases**
2. **Inside I/O: setImmediate always before setTimeout**
3. **Main module: setTimeout vs setImmediate order is non-deterministic**
4. **Never block the poll phase** - it handles most I/O
5. **Microtasks run between EVERY phase**
