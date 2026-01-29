# Node.js Interview Questions

## Part 1: Practical Coding Tasks

### 1. Custom Event Emitter
**Task:** Implement a custom EventEmitter class from scratch.

```javascript
class MyEventEmitter {
  // Implement: on, off, emit, once
}

// Test
const emitter = new MyEventEmitter();

emitter.on('data', (msg) => console.log('Received:', msg));
emitter.emit('data', 'Hello'); // Received: Hello

emitter.once('connect', () => console.log('Connected!'));
emitter.emit('connect'); // Connected!
emitter.emit('connect'); // Nothing
```

<details>
<summary>Solution</summary>

```javascript
class MyEventEmitter {
  constructor() {
    this.events = new Map();
  }

  on(event, listener) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(listener);
    return this;
  }

  off(event, listener) {
    if (!this.events.has(event)) return this;

    const listeners = this.events.get(event);
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    return this;
  }

  emit(event, ...args) {
    if (!this.events.has(event)) return false;

    const listeners = this.events.get(event).slice(); // Clone to handle removal during iteration
    listeners.forEach(listener => {
      listener.apply(this, args);
    });
    return true;
  }

  once(event, listener) {
    const onceWrapper = (...args) => {
      listener.apply(this, args);
      this.off(event, onceWrapper);
    };
    return this.on(event, onceWrapper);
  }

  listenerCount(event) {
    return this.events.has(event) ? this.events.get(event).length : 0;
  }

  removeAllListeners(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }
}
```
</details>

---

### 2. Promise-based File Reader with Concurrency
**Task:** Read multiple files concurrently with a concurrency limit.

```javascript
async function readFilesWithLimit(filePaths, limit) {
  // Your code here
}

// Usage
const contents = await readFilesWithLimit([
  'file1.txt',
  'file2.txt',
  'file3.txt',
  'file4.txt',
  'file5.txt'
], 2); // Max 2 files at a time
```

<details>
<summary>Solution</summary>

```javascript
const fs = require('fs').promises;

async function readFilesWithLimit(filePaths, limit) {
  const results = new Array(filePaths.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < filePaths.length) {
      const index = currentIndex++;
      const filePath = filePaths[index];

      try {
        results[index] = await fs.readFile(filePath, 'utf-8');
      } catch (error) {
        results[index] = { error: error.message, path: filePath };
      }
    }
  }

  // Create worker pool
  const workers = Array(Math.min(limit, filePaths.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}

// Alternative using p-limit pattern
async function readFilesWithLimitAlt(filePaths, limit) {
  const executing = new Set();
  const results = [];

  for (const [index, filePath] of filePaths.entries()) {
    const promise = (async () => {
      try {
        return await fs.readFile(filePath, 'utf-8');
      } catch (error) {
        return { error: error.message };
      }
    })();

    results[index] = promise;
    executing.add(promise);

    const cleanup = () => executing.delete(promise);
    promise.then(cleanup, cleanup);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
}
```
</details>

---

### 3. Rate Limiter Middleware
**Task:** Implement a rate limiter middleware for Express.

```javascript
function rateLimiter(options) {
  // options: { windowMs, maxRequests, keyGenerator }
  // Your code here
}

// Usage
app.use(rateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 100, // 100 requests per window
  keyGenerator: (req) => req.ip
}));
```

<details>
<summary>Solution</summary>

```javascript
function rateLimiter({ windowMs = 60000, maxRequests = 100, keyGenerator = (req) => req.ip }) {
  const store = new Map();

  // Cleanup old entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of store.entries()) {
      if (now - data.windowStart >= windowMs) {
        store.delete(key);
      }
    }
  }, windowMs);

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();

    let record = store.get(key);

    if (!record) {
      record = { count: 0, windowStart: now };
      store.set(key, record);
    }

    // Reset window if expired
    if (now - record.windowStart >= windowMs) {
      record.count = 0;
      record.windowStart = now;
    }

    record.count++;

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - record.count);
    const resetTime = record.windowStart + windowMs;

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

    if (record.count > maxRequests) {
      res.setHeader('Retry-After', Math.ceil((resetTime - now) / 1000));
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((resetTime - now) / 1000)
      });
    }

    next();
  };
}

// Token Bucket Algorithm (more sophisticated)
function tokenBucketRateLimiter({ maxTokens = 100, refillRate = 10, refillInterval = 1000 }) {
  const buckets = new Map();

  setInterval(() => {
    for (const [key, bucket] of buckets.entries()) {
      bucket.tokens = Math.min(maxTokens, bucket.tokens + refillRate);
    }
  }, refillInterval);

  return (req, res, next) => {
    const key = req.ip;

    if (!buckets.has(key)) {
      buckets.set(key, { tokens: maxTokens });
    }

    const bucket = buckets.get(key);

    if (bucket.tokens > 0) {
      bucket.tokens--;
      res.setHeader('X-RateLimit-Remaining', bucket.tokens);
      next();
    } else {
      res.status(429).json({ error: 'Rate limit exceeded' });
    }
  };
}
```
</details>

---

### 4. Streaming File Upload
**Task:** Implement a streaming file upload handler that processes large files without loading them entirely into memory.

```javascript
// Implement endpoint that:
// 1. Accepts multipart file upload
// 2. Streams to disk
// 3. Calculates checksum while streaming
// 4. Returns file info
```

<details>
<summary>Solution</summary>

```javascript
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Busboy = require('busboy');

const app = express();

app.post('/upload', (req, res) => {
  const busboy = Busboy({ headers: req.headers });
  const uploadDir = path.join(__dirname, 'uploads');

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const uploads = [];

  busboy.on('file', (fieldname, file, { filename, encoding, mimeType }) => {
    const hash = crypto.createHash('sha256');
    const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadDir, safeName);
    const writeStream = fs.createWriteStream(filePath);

    let size = 0;

    const uploadPromise = new Promise((resolve, reject) => {
      file.on('data', (chunk) => {
        size += chunk.length;
        hash.update(chunk);
      });

      file.on('end', () => {
        resolve({
          fieldname,
          originalName: filename,
          savedName: safeName,
          path: filePath,
          size,
          mimeType,
          checksum: hash.digest('hex')
        });
      });

      file.on('error', reject);
      writeStream.on('error', reject);
    });

    file.pipe(writeStream);
    uploads.push(uploadPromise);
  });

  busboy.on('finish', async () => {
    try {
      const results = await Promise.all(uploads);
      res.json({
        success: true,
        files: results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  busboy.on('error', (error) => {
    res.status(500).json({
      success: false,
      error: error.message
    });
  });

  req.pipe(busboy);
});

// Alternative: Using streams with progress tracking
app.post('/upload-with-progress', (req, res) => {
  const contentLength = parseInt(req.headers['content-length'], 10);
  let uploaded = 0;

  const busboy = Busboy({ headers: req.headers });

  busboy.on('file', (fieldname, file, { filename }) => {
    const writeStream = fs.createWriteStream(`./uploads/${filename}`);

    // Transform stream for progress
    const progressStream = new require('stream').Transform({
      transform(chunk, encoding, callback) {
        uploaded += chunk.length;
        const progress = ((uploaded / contentLength) * 100).toFixed(2);
        console.log(`Upload progress: ${progress}%`);
        callback(null, chunk);
      }
    });

    file.pipe(progressStream).pipe(writeStream);
  });

  busboy.on('finish', () => {
    res.json({ success: true });
  });

  req.pipe(busboy);
});
```
</details>

---

### 5. Worker Thread Pool
**Task:** Implement a worker thread pool for CPU-intensive tasks.

```javascript
class WorkerPool {
  constructor(workerPath, poolSize) {
    // Your code here
  }

  async execute(data) {
    // Returns promise that resolves with worker result
  }

  async destroy() {
    // Clean up all workers
  }
}

// Usage
const pool = new WorkerPool('./worker.js', 4);
const result = await pool.execute({ task: 'compute', data: [1, 2, 3] });
```

<details>
<summary>Solution</summary>

```javascript
const { Worker } = require('worker_threads');
const path = require('path');

class WorkerPool {
  constructor(workerPath, poolSize) {
    this.workerPath = path.resolve(workerPath);
    this.poolSize = poolSize;
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    this.isDestroyed = false;

    this._initializeWorkers();
  }

  _initializeWorkers() {
    for (let i = 0; i < this.poolSize; i++) {
      this._createWorker();
    }
  }

  _createWorker() {
    const worker = new Worker(this.workerPath);
    const workerWrapper = {
      worker,
      busy: false,
      currentTask: null
    };

    worker.on('message', (result) => {
      const { resolve, reject } = workerWrapper.currentTask;

      if (result.error) {
        reject(new Error(result.error));
      } else {
        resolve(result.data);
      }

      workerWrapper.busy = false;
      workerWrapper.currentTask = null;
      this.availableWorkers.push(workerWrapper);

      this._processQueue();
    });

    worker.on('error', (error) => {
      if (workerWrapper.currentTask) {
        workerWrapper.currentTask.reject(error);
      }
      // Replace dead worker
      this._removeWorker(workerWrapper);
      if (!this.isDestroyed) {
        this._createWorker();
      }
    });

    worker.on('exit', (code) => {
      if (code !== 0 && !this.isDestroyed) {
        this._removeWorker(workerWrapper);
        this._createWorker();
      }
    });

    this.workers.push(workerWrapper);
    this.availableWorkers.push(workerWrapper);
  }

  _removeWorker(workerWrapper) {
    const workerIndex = this.workers.indexOf(workerWrapper);
    if (workerIndex !== -1) {
      this.workers.splice(workerIndex, 1);
    }

    const availableIndex = this.availableWorkers.indexOf(workerWrapper);
    if (availableIndex !== -1) {
      this.availableWorkers.splice(availableIndex, 1);
    }
  }

  _processQueue() {
    while (this.taskQueue.length > 0 && this.availableWorkers.length > 0) {
      const task = this.taskQueue.shift();
      const workerWrapper = this.availableWorkers.shift();

      workerWrapper.busy = true;
      workerWrapper.currentTask = task;
      workerWrapper.worker.postMessage(task.data);
    }
  }

  execute(data) {
    if (this.isDestroyed) {
      return Promise.reject(new Error('Pool is destroyed'));
    }

    return new Promise((resolve, reject) => {
      const task = { data, resolve, reject };
      this.taskQueue.push(task);
      this._processQueue();
    });
  }

  async destroy() {
    this.isDestroyed = true;

    // Reject pending tasks
    for (const task of this.taskQueue) {
      task.reject(new Error('Pool destroyed'));
    }
    this.taskQueue = [];

    // Terminate all workers
    const terminationPromises = this.workers.map(({ worker }) => {
      return new Promise((resolve) => {
        worker.once('exit', resolve);
        worker.terminate();
      });
    });

    await Promise.all(terminationPromises);
    this.workers = [];
    this.availableWorkers = [];
  }

  get stats() {
    return {
      total: this.workers.length,
      busy: this.workers.filter(w => w.busy).length,
      available: this.availableWorkers.length,
      queued: this.taskQueue.length
    };
  }
}

// worker.js
const { parentPort } = require('worker_threads');

parentPort.on('message', (data) => {
  try {
    // Perform CPU-intensive task
    const result = performComputation(data);
    parentPort.postMessage({ data: result });
  } catch (error) {
    parentPort.postMessage({ error: error.message });
  }
});

function performComputation(data) {
  // Example: heavy computation
  let result = 0;
  for (let i = 0; i < data.iterations; i++) {
    result += Math.sqrt(i);
  }
  return result;
}

module.exports = WorkerPool;
```
</details>

---

### 6. Graceful Shutdown Handler
**Task:** Implement graceful shutdown for a Node.js server.

```javascript
// Implement graceful shutdown that:
// 1. Stops accepting new connections
// 2. Waits for existing requests to complete
// 3. Closes database connections
// 4. Has a timeout for forced shutdown
```

<details>
<summary>Solution</summary>

```javascript
const http = require('http');

class GracefulShutdown {
  constructor(server, options = {}) {
    this.server = server;
    this.timeout = options.timeout || 30000;
    this.onShutdown = options.onShutdown || [];
    this.connections = new Set();
    this.isShuttingDown = false;

    this._trackConnections();
    this._setupSignalHandlers();
  }

  _trackConnections() {
    this.server.on('connection', (conn) => {
      this.connections.add(conn);
      conn.on('close', () => {
        this.connections.delete(conn);
      });
    });
  }

  _setupSignalHandlers() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

    signals.forEach(signal => {
      process.on(signal, () => {
        console.log(`Received ${signal}, starting graceful shutdown...`);
        this.shutdown();
      });
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      this.shutdown(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection:', reason);
    });
  }

  addShutdownHook(fn) {
    this.onShutdown.push(fn);
  }

  async shutdown(exitCode = 0) {
    if (this.isShuttingDown) {
      console.log('Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;
    console.log('Graceful shutdown initiated...');

    // Set forced shutdown timeout
    const forceShutdown = setTimeout(() => {
      console.error('Forced shutdown due to timeout');
      process.exit(1);
    }, this.timeout);

    try {
      // Stop accepting new connections
      await new Promise((resolve, reject) => {
        this.server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('Server stopped accepting new connections');

      // Close existing connections gracefully
      for (const conn of this.connections) {
        conn.end();
      }

      // Wait for connections to close (with timeout)
      await this._waitForConnections();
      console.log('All connections closed');

      // Run shutdown hooks (database cleanup, etc.)
      for (const hook of this.onShutdown) {
        await hook();
      }
      console.log('Shutdown hooks completed');

      clearTimeout(forceShutdown);
      console.log('Graceful shutdown complete');
      process.exit(exitCode);

    } catch (error) {
      console.error('Error during shutdown:', error);
      clearTimeout(forceShutdown);
      process.exit(1);
    }
  }

  async _waitForConnections() {
    return new Promise((resolve) => {
      const checkConnections = () => {
        if (this.connections.size === 0) {
          resolve();
        } else {
          console.log(`Waiting for ${this.connections.size} connections to close...`);
          setTimeout(checkConnections, 1000);
        }
      };
      checkConnections();
    });
  }
}

// Usage with Express
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  // Simulate long-running request
  setTimeout(() => {
    res.send('Hello World');
  }, 5000);
});

const server = http.createServer(app);
const graceful = new GracefulShutdown(server, { timeout: 30000 });

// Add cleanup hooks
graceful.addShutdownHook(async () => {
  console.log('Closing database connection...');
  await database.close();
});

graceful.addShutdownHook(async () => {
  console.log('Closing Redis connection...');
  await redis.quit();
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
```
</details>

---

### 7. Custom Readable Stream
**Task:** Implement a custom readable stream that generates data.

```javascript
// Create a stream that generates random numbers
// with back-pressure handling
```

<details>
<summary>Solution</summary>

```javascript
const { Readable, Transform, Writable } = require('stream');

// Custom Readable Stream
class RandomNumberStream extends Readable {
  constructor(options = {}) {
    super(options);
    this.max = options.max || 100;
    this.count = 0;
    this.delay = options.delay || 0;
  }

  _read(size) {
    if (this.count >= this.max) {
      this.push(null); // Signal end of stream
      return;
    }

    const generate = () => {
      const number = Math.random();
      const data = JSON.stringify({ index: this.count++, value: number }) + '\n';

      // push returns false if consumer is overwhelmed (back-pressure)
      const canContinue = this.push(data);

      if (this.count < this.max && canContinue) {
        if (this.delay) {
          setTimeout(generate, this.delay);
        } else {
          setImmediate(generate);
        }
      }
    };

    generate();
  }
}

// Custom Transform Stream
class FilterStream extends Transform {
  constructor(predicate, options = {}) {
    super({ ...options, objectMode: true });
    this.predicate = predicate;
  }

  _transform(chunk, encoding, callback) {
    try {
      const data = typeof chunk === 'string' ? JSON.parse(chunk) : chunk;

      if (this.predicate(data)) {
        this.push(JSON.stringify(data) + '\n');
      }

      callback();
    } catch (error) {
      callback(error);
    }
  }
}

// Custom Writable Stream
class CollectorStream extends Writable {
  constructor(options = {}) {
    super(options);
    this.items = [];
  }

  _write(chunk, encoding, callback) {
    try {
      const data = JSON.parse(chunk.toString().trim());
      this.items.push(data);
      callback();
    } catch (error) {
      callback(error);
    }
  }

  getItems() {
    return this.items;
  }
}

// Usage with pipeline
const { pipeline } = require('stream/promises');

async function main() {
  const source = new RandomNumberStream({ max: 1000, delay: 10 });
  const filter = new FilterStream(item => item.value > 0.5);
  const collector = new CollectorStream();

  await pipeline(source, filter, collector);

  console.log(`Collected ${collector.getItems().length} items`);
}

// Async Generator as Readable Stream
const { Readable } = require('stream');

async function* generateData() {
  for (let i = 0; i < 100; i++) {
    await new Promise(r => setTimeout(r, 10));
    yield { index: i, timestamp: Date.now() };
  }
}

const stream = Readable.from(generateData(), { objectMode: true });

stream.on('data', (chunk) => console.log(chunk));
stream.on('end', () => console.log('Done'));
```
</details>

---

### 8. Request Queue with Priority
**Task:** Implement a priority queue for API requests.

```javascript
class PriorityRequestQueue {
  // Implement queue with:
  // - Priority levels (high, medium, low)
  // - Concurrency limit
  // - Request timeout
  // - Retry logic
}
```

<details>
<summary>Solution</summary>

```javascript
const EventEmitter = require('events');

class PriorityRequestQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    this.concurrency = options.concurrency || 5;
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;

    this.queues = {
      high: [],
      medium: [],
      low: []
    };

    this.running = 0;
    this.paused = false;
  }

  add(requestFn, options = {}) {
    const priority = options.priority || 'medium';
    const retries = options.retries ?? this.maxRetries;
    const timeout = options.timeout ?? this.timeout;

    return new Promise((resolve, reject) => {
      const task = {
        fn: requestFn,
        resolve,
        reject,
        priority,
        retries,
        timeout,
        attempts: 0,
        addedAt: Date.now()
      };

      this.queues[priority].push(task);
      this.emit('queued', { priority, queueLength: this._getTotalQueued() });
      this._processQueue();
    });
  }

  _getTotalQueued() {
    return Object.values(this.queues).reduce((sum, q) => sum + q.length, 0);
  }

  _getNextTask() {
    // Priority order: high -> medium -> low
    for (const priority of ['high', 'medium', 'low']) {
      if (this.queues[priority].length > 0) {
        return this.queues[priority].shift();
      }
    }
    return null;
  }

  async _processQueue() {
    if (this.paused) return;

    while (this.running < this.concurrency) {
      const task = this._getNextTask();
      if (!task) break;

      this.running++;
      this._executeTask(task);
    }
  }

  async _executeTask(task) {
    task.attempts++;

    try {
      const result = await this._executeWithTimeout(task.fn, task.timeout);
      task.resolve(result);
      this.emit('completed', { attempts: task.attempts });
    } catch (error) {
      if (task.attempts < task.retries) {
        // Exponential backoff
        const delay = Math.pow(2, task.attempts) * 1000;
        this.emit('retry', { attempts: task.attempts, delay, error: error.message });

        setTimeout(() => {
          this.queues[task.priority].unshift(task); // Add back to front
          this._processQueue();
        }, delay);
      } else {
        task.reject(error);
        this.emit('failed', { attempts: task.attempts, error: error.message });
      }
    } finally {
      this.running--;
      this._processQueue();
    }
  }

  _executeWithTimeout(fn, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, timeout);

      Promise.resolve(fn())
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  pause() {
    this.paused = true;
    this.emit('paused');
  }

  resume() {
    this.paused = false;
    this.emit('resumed');
    this._processQueue();
  }

  clear(priority) {
    if (priority) {
      const cleared = this.queues[priority].length;
      this.queues[priority].forEach(task => {
        task.reject(new Error('Queue cleared'));
      });
      this.queues[priority] = [];
      return cleared;
    }

    let total = 0;
    for (const p of Object.keys(this.queues)) {
      total += this.queues[p].length;
      this.queues[p].forEach(task => {
        task.reject(new Error('Queue cleared'));
      });
      this.queues[p] = [];
    }
    return total;
  }

  get stats() {
    return {
      running: this.running,
      queued: {
        high: this.queues.high.length,
        medium: this.queues.medium.length,
        low: this.queues.low.length,
        total: this._getTotalQueued()
      },
      paused: this.paused
    };
  }
}

// Usage
const queue = new PriorityRequestQueue({
  concurrency: 3,
  timeout: 5000,
  maxRetries: 2
});

queue.on('completed', ({ attempts }) => {
  console.log(`Request completed after ${attempts} attempts`);
});

queue.on('retry', ({ attempts, delay }) => {
  console.log(`Retrying (attempt ${attempts}) after ${delay}ms`);
});

// Add requests
async function makeRequest(url) {
  const response = await fetch(url);
  return response.json();
}

queue.add(() => makeRequest('/api/critical'), { priority: 'high' });
queue.add(() => makeRequest('/api/normal'), { priority: 'medium' });
queue.add(() => makeRequest('/api/background'), { priority: 'low' });
```
</details>

---

### 9. Simple Job Scheduler
**Task:** Implement a cron-like job scheduler.

```javascript
class Scheduler {
  // Support:
  // - Schedule jobs at specific intervals
  // - Cron-like expressions
  // - Job persistence across restarts
  // - Concurrent job limits
}
```

<details>
<summary>Solution</summary>

```javascript
const EventEmitter = require('events');
const fs = require('fs').promises;

class Scheduler extends EventEmitter {
  constructor(options = {}) {
    super();
    this.jobs = new Map();
    this.runningJobs = new Set();
    this.maxConcurrent = options.maxConcurrent || 10;
    this.persistPath = options.persistPath;
    this.timers = new Map();
  }

  async init() {
    if (this.persistPath) {
      await this._loadJobs();
    }
  }

  schedule(name, config, handler) {
    if (this.jobs.has(name)) {
      this.cancel(name);
    }

    const job = {
      name,
      handler,
      config: this._parseConfig(config),
      nextRun: null,
      lastRun: null,
      runCount: 0,
      enabled: true
    };

    job.nextRun = this._calculateNextRun(job.config);
    this.jobs.set(name, job);

    this._scheduleJob(job);
    this.emit('scheduled', { name, nextRun: job.nextRun });

    if (this.persistPath) {
      this._saveJobs();
    }

    return this;
  }

  _parseConfig(config) {
    if (typeof config === 'number') {
      return { type: 'interval', interval: config };
    }

    if (typeof config === 'string') {
      return { type: 'cron', expression: config, ...this._parseCron(config) };
    }

    return config;
  }

  _parseCron(expression) {
    // Simple cron parser (minute hour day month weekday)
    const parts = expression.split(' ');
    if (parts.length !== 5) {
      throw new Error('Invalid cron expression');
    }

    return {
      minute: this._parseCronField(parts[0], 0, 59),
      hour: this._parseCronField(parts[1], 0, 23),
      day: this._parseCronField(parts[2], 1, 31),
      month: this._parseCronField(parts[3], 1, 12),
      weekday: this._parseCronField(parts[4], 0, 6)
    };
  }

  _parseCronField(field, min, max) {
    if (field === '*') {
      return Array.from({ length: max - min + 1 }, (_, i) => i + min);
    }

    if (field.includes('/')) {
      const [, step] = field.split('/');
      return Array.from({ length: max - min + 1 }, (_, i) => i + min)
        .filter(v => v % parseInt(step) === 0);
    }

    if (field.includes(',')) {
      return field.split(',').map(v => parseInt(v));
    }

    if (field.includes('-')) {
      const [start, end] = field.split('-').map(v => parseInt(v));
      return Array.from({ length: end - start + 1 }, (_, i) => i + start);
    }

    return [parseInt(field)];
  }

  _calculateNextRun(config) {
    const now = new Date();

    if (config.type === 'interval') {
      return new Date(now.getTime() + config.interval);
    }

    if (config.type === 'cron') {
      // Find next matching time
      const next = new Date(now);
      next.setSeconds(0);
      next.setMilliseconds(0);

      // Simple implementation - check each minute for next 24 hours
      for (let i = 0; i < 24 * 60; i++) {
        next.setMinutes(next.getMinutes() + 1);

        if (
          config.minute.includes(next.getMinutes()) &&
          config.hour.includes(next.getHours()) &&
          config.day.includes(next.getDate()) &&
          config.month.includes(next.getMonth() + 1) &&
          config.weekday.includes(next.getDay())
        ) {
          return next;
        }
      }
    }

    return null;
  }

  _scheduleJob(job) {
    if (!job.enabled || !job.nextRun) return;

    const delay = job.nextRun.getTime() - Date.now();

    if (delay <= 0) {
      setImmediate(() => this._runJob(job));
      return;
    }

    const timer = setTimeout(() => this._runJob(job), delay);
    this.timers.set(job.name, timer);
  }

  async _runJob(job) {
    if (this.runningJobs.size >= this.maxConcurrent) {
      // Queue for later
      setTimeout(() => this._runJob(job), 1000);
      return;
    }

    this.runningJobs.add(job.name);
    job.lastRun = new Date();
    job.runCount++;

    this.emit('jobStart', { name: job.name, runCount: job.runCount });

    try {
      await job.handler();
      this.emit('jobComplete', { name: job.name, runCount: job.runCount });
    } catch (error) {
      this.emit('jobError', { name: job.name, error: error.message });
    } finally {
      this.runningJobs.delete(job.name);

      // Schedule next run
      job.nextRun = this._calculateNextRun(job.config);
      this._scheduleJob(job);

      if (this.persistPath) {
        this._saveJobs();
      }
    }
  }

  cancel(name) {
    const timer = this.timers.get(name);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(name);
    }

    this.jobs.delete(name);
    this.emit('cancelled', { name });

    if (this.persistPath) {
      this._saveJobs();
    }

    return this;
  }

  pause(name) {
    const job = this.jobs.get(name);
    if (job) {
      job.enabled = false;
      const timer = this.timers.get(name);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(name);
      }
    }
    return this;
  }

  resume(name) {
    const job = this.jobs.get(name);
    if (job) {
      job.enabled = true;
      job.nextRun = this._calculateNextRun(job.config);
      this._scheduleJob(job);
    }
    return this;
  }

  async _saveJobs() {
    const data = {};
    for (const [name, job] of this.jobs) {
      data[name] = {
        config: job.config,
        nextRun: job.nextRun,
        lastRun: job.lastRun,
        runCount: job.runCount,
        enabled: job.enabled
      };
    }
    await fs.writeFile(this.persistPath, JSON.stringify(data, null, 2));
  }

  async _loadJobs() {
    try {
      const data = JSON.parse(await fs.readFile(this.persistPath, 'utf-8'));
      // Jobs need to be re-registered with handlers on startup
      this.emit('loaded', data);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  getStatus() {
    const status = {};
    for (const [name, job] of this.jobs) {
      status[name] = {
        enabled: job.enabled,
        nextRun: job.nextRun,
        lastRun: job.lastRun,
        runCount: job.runCount,
        running: this.runningJobs.has(name)
      };
    }
    return status;
  }
}

// Usage
const scheduler = new Scheduler({
  maxConcurrent: 5,
  persistPath: './jobs.json'
});

scheduler.on('jobStart', ({ name }) => console.log(`Job ${name} started`));
scheduler.on('jobComplete', ({ name }) => console.log(`Job ${name} completed`));
scheduler.on('jobError', ({ name, error }) => console.log(`Job ${name} failed: ${error}`));

// Every 5 seconds
scheduler.schedule('heartbeat', 5000, async () => {
  console.log('Heartbeat at', new Date());
});

// Cron: every day at 2:30 AM
scheduler.schedule('cleanup', '30 2 * * *', async () => {
  await cleanupOldFiles();
});

// Cron: every Monday at 9 AM
scheduler.schedule('weekly-report', '0 9 * * 1', async () => {
  await sendWeeklyReport();
});
```
</details>

---

### 10. Circuit Breaker Pattern
**Task:** Implement a circuit breaker for external service calls.

```javascript
class CircuitBreaker {
  // States: CLOSED, OPEN, HALF_OPEN
  // Track failures and automatically prevent calls to failing services
}
```

<details>
<summary>Solution</summary>

```javascript
const EventEmitter = require('events');

const States = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

class CircuitBreaker extends EventEmitter {
  constructor(options = {}) {
    super();

    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 10000;
    this.resetTimeout = options.resetTimeout || 30000;

    this.state = States.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.resetTimer = null;
  }

  async execute(fn) {
    if (this.state === States.OPEN) {
      if (this._shouldAttemptReset()) {
        this._toHalfOpen();
      } else {
        const error = new Error('Circuit breaker is OPEN');
        error.code = 'CIRCUIT_OPEN';
        throw error;
      }
    }

    try {
      const result = await this._executeWithTimeout(fn);
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure(error);
      throw error;
    }
  }

  async _executeWithTimeout(fn) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Circuit breaker timeout'));
      }, this.timeout);

      Promise.resolve(fn())
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  _onSuccess() {
    this.failureCount = 0;

    if (this.state === States.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.successThreshold) {
        this._toClosed();
      }
    }
  }

  _onFailure(error) {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    this.emit('failure', { error: error.message, failureCount: this.failureCount });

    if (this.state === States.HALF_OPEN) {
      this._toOpen();
    } else if (this.failureCount >= this.failureThreshold) {
      this._toOpen();
    }
  }

  _shouldAttemptReset() {
    return Date.now() - this.lastFailureTime >= this.resetTimeout;
  }

  _toOpen() {
    if (this.state === States.OPEN) return;

    this.state = States.OPEN;
    this.successCount = 0;
    this.emit('stateChange', { from: this.state, to: States.OPEN });
    this.emit('open');

    // Schedule automatic half-open attempt
    this.resetTimer = setTimeout(() => {
      this._toHalfOpen();
    }, this.resetTimeout);
  }

  _toHalfOpen() {
    if (this.state === States.HALF_OPEN) return;

    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }

    this.state = States.HALF_OPEN;
    this.successCount = 0;
    this.emit('stateChange', { from: this.state, to: States.HALF_OPEN });
    this.emit('halfOpen');
  }

  _toClosed() {
    if (this.state === States.CLOSED) return;

    this.state = States.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.emit('stateChange', { from: this.state, to: States.CLOSED });
    this.emit('close');
  }

  get status() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  forceOpen() {
    this._toOpen();
  }

  forceClose() {
    this._toClosed();
  }
}

// Circuit Breaker Registry for multiple services
class CircuitBreakerRegistry {
  constructor(defaultOptions = {}) {
    this.breakers = new Map();
    this.defaultOptions = defaultOptions;
  }

  get(name, options = {}) {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker({ ...this.defaultOptions, ...options });
      this.breakers.set(name, breaker);

      // Forward events
      breaker.on('open', () => console.log(`Circuit ${name} OPENED`));
      breaker.on('close', () => console.log(`Circuit ${name} CLOSED`));
      breaker.on('halfOpen', () => console.log(`Circuit ${name} HALF_OPEN`));
    }
    return this.breakers.get(name);
  }

  getAll() {
    const status = {};
    for (const [name, breaker] of this.breakers) {
      status[name] = breaker.status;
    }
    return status;
  }
}

// Usage
const registry = new CircuitBreakerRegistry({
  failureThreshold: 3,
  resetTimeout: 10000
});

async function callExternalService(serviceUrl) {
  const breaker = registry.get('external-api');

  return breaker.execute(async () => {
    const response = await fetch(serviceUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  });
}

// With fallback
async function callWithFallback(serviceUrl, fallbackFn) {
  const breaker = registry.get('external-api');

  try {
    return await breaker.execute(async () => {
      const response = await fetch(serviceUrl);
      return response.json();
    });
  } catch (error) {
    if (error.code === 'CIRCUIT_OPEN') {
      console.log('Circuit open, using fallback');
      return fallbackFn();
    }
    throw error;
  }
}

module.exports = { CircuitBreaker, CircuitBreakerRegistry };
```
</details>

---

## Part 2: Theory Questions

### Node.js Core Concepts

#### 1. Event Loop
**Q: Explain the Node.js event loop and its phases in detail.**

<details>
<summary>Answer</summary>

The Node.js event loop has several phases, each with its own queue:

```
   ┌───────────────────────────┐
┌─>│           timers          │  - setTimeout, setInterval
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │  - I/O callbacks deferred
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │  - internal use
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           poll            │  - retrieve new I/O events
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           check           │  - setImmediate
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──┤      close callbacks      │  - socket.on('close')
   └───────────────────────────┘
```

**Phases Explained:**

1. **Timers**: Executes callbacks scheduled by `setTimeout()` and `setInterval()`

2. **Pending Callbacks**: Executes I/O callbacks deferred to the next loop iteration

3. **Poll**: Retrieves new I/O events; executes I/O related callbacks. Will block here if no timers are scheduled.

4. **Check**: `setImmediate()` callbacks are invoked here

5. **Close Callbacks**: e.g., `socket.on('close', ...)`

**Microtask Queues (between phases):**
- `process.nextTick()` queue (highest priority)
- Promises queue (`Promise.then()`)

```javascript
console.log('1');

setTimeout(() => console.log('2'), 0);

Promise.resolve().then(() => console.log('3'));

process.nextTick(() => console.log('4'));

setImmediate(() => console.log('5'));

console.log('6');

// Output: 1, 6, 4, 3, 2, 5
// (setTimeout vs setImmediate order can vary)
```

**setImmediate vs setTimeout:**
```javascript
// In I/O callback, setImmediate always runs first
const fs = require('fs');

fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
});
// Output: immediate, timeout (always this order)
```

**process.nextTick vs setImmediate:**
- `nextTick` runs immediately after current operation, before any I/O
- `setImmediate` runs in the check phase
- Prefer `setImmediate` to avoid blocking I/O

```javascript
// Can starve I/O
function recursiveNextTick() {
  process.nextTick(recursiveNextTick); // Bad!
}

// Better
function recursiveImmediate() {
  setImmediate(recursiveImmediate); // Allows I/O between calls
}
```
</details>

---

#### 2. Streams
**Q: Explain Node.js streams. What are the different types and when would you use each?**

<details>
<summary>Answer</summary>

Streams are collections of data that might not be available all at once and don't have to fit in memory.

**Types of Streams:**

1. **Readable**: Source of data (e.g., `fs.createReadStream()`)
2. **Writable**: Destination for data (e.g., `fs.createWriteStream()`)
3. **Duplex**: Both readable and writable (e.g., `net.Socket`)
4. **Transform**: Duplex that can modify data (e.g., `zlib.createGzip()`)

**Readable Stream Events:**
```javascript
const readable = fs.createReadStream('file.txt');

readable.on('data', (chunk) => {
  console.log(`Received ${chunk.length} bytes`);
});

readable.on('end', () => {
  console.log('No more data');
});

readable.on('error', (err) => {
  console.error('Error:', err);
});
```

**Readable Stream Modes:**
```javascript
// Flowing mode - data flows automatically
readable.on('data', handler);

// Paused mode - must call read() explicitly
readable.on('readable', () => {
  let chunk;
  while ((chunk = readable.read()) !== null) {
    process.stdout.write(chunk);
  }
});

// Switch modes
readable.pause();
readable.resume();
```

**Writable Stream:**
```javascript
const writable = fs.createWriteStream('output.txt');

writable.write('Hello');
writable.write(' World');
writable.end('!'); // Final write + close

// Back-pressure
const ok = writable.write(data);
if (!ok) {
  // Wait for drain event before writing more
  writable.once('drain', () => {
    continueWriting();
  });
}
```

**Pipe (handles back-pressure automatically):**
```javascript
const readable = fs.createReadStream('input.txt');
const writable = fs.createWriteStream('output.txt');

readable.pipe(writable);

// Pipeline (recommended - handles errors)
const { pipeline } = require('stream/promises');

await pipeline(
  fs.createReadStream('input.txt'),
  zlib.createGzip(),
  fs.createWriteStream('output.txt.gz')
);
```

**Transform Stream:**
```javascript
const { Transform } = require('stream');

const upperCase = new Transform({
  transform(chunk, encoding, callback) {
    this.push(chunk.toString().toUpperCase());
    callback();
  }
});

process.stdin.pipe(upperCase).pipe(process.stdout);
```

**When to use streams:**
- Large files that don't fit in memory
- Real-time data processing
- HTTP request/response bodies
- Data transformation pipelines
- Network communication
</details>

---

#### 3. Cluster & Worker Threads
**Q: Explain the difference between the Cluster module and Worker Threads. When would you use each?**

<details>
<summary>Answer</summary>

**Cluster Module:**
- Creates multiple processes (separate memory)
- Each worker is a full Node.js process
- Good for utilizing multiple CPU cores for I/O-bound tasks
- Workers don't share memory (must use IPC)

```javascript
const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork(); // Replace dead worker
  });
} else {
  http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Hello World\n');
  }).listen(8000);

  console.log(`Worker ${process.pid} started`);
}
```

**Worker Threads:**
- Creates threads within the same process
- Share memory (SharedArrayBuffer)
- Good for CPU-intensive JavaScript tasks
- Lower memory overhead than processes

```javascript
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

if (isMainThread) {
  // Main thread
  const worker = new Worker(__filename, {
    workerData: { num: 42 }
  });

  worker.on('message', (result) => {
    console.log('Result:', result);
  });

  worker.on('error', (error) => {
    console.error('Worker error:', error);
  });

  worker.on('exit', (code) => {
    console.log(`Worker exited with code ${code}`);
  });
} else {
  // Worker thread
  const { num } = workerData;
  const result = heavyComputation(num);
  parentPort.postMessage(result);
}

function heavyComputation(n) {
  let result = 0;
  for (let i = 0; i < 1e9; i++) {
    result += Math.sqrt(n * i);
  }
  return result;
}
```

**Shared Memory:**
```javascript
// Main thread
const { Worker } = require('worker_threads');

const sharedBuffer = new SharedArrayBuffer(4);
const sharedArray = new Int32Array(sharedBuffer);

const worker = new Worker('./worker.js', {
  workerData: { sharedBuffer }
});

// worker.js
const { workerData } = require('worker_threads');
const sharedArray = new Int32Array(workerData.sharedBuffer);

Atomics.add(sharedArray, 0, 1); // Thread-safe increment
```

**When to use which:**

| Cluster | Worker Threads |
|---------|----------------|
| Multiple HTTP servers | CPU-intensive calculations |
| I/O-bound workloads | Image/video processing |
| Process isolation needed | Machine learning |
| Need separate memory | Shared data between threads |
| Utilize all CPUs for servers | Parallel algorithms |

**Comparison:**

```
Cluster:
┌────────────────┐ ┌────────────────┐
│ Process 1      │ │ Process 2      │
│ (Full V8 heap) │ │ (Full V8 heap) │
│ ~30-50MB each  │ │ ~30-50MB each  │
└────────────────┘ └────────────────┘
      ↓ IPC (message passing)

Worker Threads:
┌────────────────────────────────────┐
│ Process (Single V8 heap)           │
│ ┌──────────┐ ┌──────────┐         │
│ │ Thread 1 │ │ Thread 2 │         │
│ └──────────┘ └──────────┘         │
│      ↓ SharedArrayBuffer          │
└────────────────────────────────────┘
```
</details>

---

#### 4. Memory Management
**Q: How does memory management work in Node.js? How do you identify and fix memory leaks?**

<details>
<summary>Answer</summary>

**V8 Memory Structure:**
```
┌─────────────────────────────────────────┐
│             V8 Heap                     │
├──────────────┬──────────────────────────┤
│ New Space    │ Old Space                │
│ (Young Gen)  │ (Old Generation)         │
│ - Short-lived│ - Long-lived objects     │
│ - Scavenge GC│ - Mark-Sweep-Compact GC  │
│ - Fast       │ - Slower, less frequent  │
└──────────────┴──────────────────────────┘
```

**Memory Limits:**
```bash
# Default ~1.5GB on 64-bit
node --max-old-space-size=4096 app.js  # 4GB
```

**Monitoring Memory:**
```javascript
// Process memory usage
const used = process.memoryUsage();
console.log({
  rss: `${Math.round(used.rss / 1024 / 1024)} MB`,       // Resident Set Size
  heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)} MB`,
  heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)} MB`,
  external: `${Math.round(used.external / 1024 / 1024)} MB`
});

// V8 heap statistics
const v8 = require('v8');
const heapStats = v8.getHeapStatistics();
```

**Common Memory Leak Causes:**

1. **Global Variables:**
```javascript
// Leak
function processData(data) {
  results = data.map(transform); // Accidental global!
}

// Fix
function processData(data) {
  const results = data.map(transform);
  return results;
}
```

2. **Closures:**
```javascript
// Leak - closure holds reference to largeData
function createClosure() {
  const largeData = new Array(1000000).fill('x');
  return function() {
    return 'done';
  };
}

// Fix - don't capture unnecessary variables
function createClosure() {
  const largeData = new Array(1000000).fill('x');
  processLargeData(largeData);
  return function() {
    return 'done';
  };
}
```

3. **Event Listeners:**
```javascript
// Leak
class Handler {
  constructor(emitter) {
    emitter.on('data', this.handle.bind(this));
    // Never removed!
  }
}

// Fix
class Handler {
  constructor(emitter) {
    this.boundHandle = this.handle.bind(this);
    emitter.on('data', this.boundHandle);
  }

  destroy(emitter) {
    emitter.removeListener('data', this.boundHandle);
  }
}
```

4. **Caches without bounds:**
```javascript
// Leak
const cache = {};
function getData(key) {
  if (!cache[key]) {
    cache[key] = fetchData(key); // Grows forever!
  }
  return cache[key];
}

// Fix - use LRU cache or WeakMap
const LRU = require('lru-cache');
const cache = new LRU({ max: 500 });

// Or WeakMap for object keys
const cache = new WeakMap();
```

**Debugging Tools:**

```bash
# Heap snapshot
node --inspect app.js
# Connect Chrome DevTools → Memory tab → Heap snapshot

# Heap dump on crash
node --heapsnapshot-signal=SIGUSR2 app.js
kill -USR2 <pid>

# Heap profiler
const v8 = require('v8');
v8.writeHeapSnapshot(); // Creates heap-*.heapsnapshot
```

**Example: Finding Leak with Heap Snapshots:**
1. Take snapshot 1
2. Perform suspected leaky operation
3. Force GC (`global.gc()` with `--expose-gc`)
4. Take snapshot 2
5. Compare - look for objects that shouldn't persist
</details>

---

#### 5. Error Handling
**Q: Explain error handling patterns in Node.js. How do you handle synchronous vs asynchronous errors?**

<details>
<summary>Answer</summary>

**Synchronous Errors:**
```javascript
// Try-catch works
try {
  const data = JSON.parse(invalidJson);
} catch (error) {
  console.error('Parse error:', error.message);
}
```

**Callback Errors (error-first pattern):**
```javascript
fs.readFile('file.txt', (err, data) => {
  if (err) {
    console.error('Error:', err.message);
    return;
  }
  console.log(data);
});
```

**Promise Errors:**
```javascript
// .catch()
fetchData()
  .then(data => process(data))
  .catch(error => console.error(error));

// async/await with try-catch
async function getData() {
  try {
    const data = await fetchData();
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error; // Re-throw if needed
  }
}
```

**Event Emitter Errors:**
```javascript
const emitter = new EventEmitter();

// Must handle 'error' event or process crashes
emitter.on('error', (error) => {
  console.error('Emitter error:', error);
});
```

**Uncaught Exceptions:**
```javascript
process.on('uncaughtException', (error) => {
  console.error('Uncaught:', error);
  // Log error, clean up, then exit
  process.exit(1); // Don't continue!
});
```

**Unhandled Promise Rejections:**
```javascript
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  // In Node.js 15+, this crashes by default
});
```

**Domain Pattern (deprecated but still used):**
```javascript
const domain = require('domain');

const d = domain.create();

d.on('error', (error) => {
  console.error('Domain caught:', error);
});

d.run(() => {
  // Async errors in this context are caught
  setTimeout(() => {
    throw new Error('Async error');
  }, 100);
});
```

**Best Practices:**

1. **Operational vs Programmer Errors:**
```javascript
// Operational - expected, handle gracefully
class OperationalError extends Error {
  constructor(message) {
    super(message);
    this.isOperational = true;
  }
}

// Programmer error - bug, crash and restart
throw new TypeError('Invalid argument');
```

2. **Centralized Error Handling:**
```javascript
// Express error middleware
app.use((error, req, res, next) => {
  console.error(error.stack);

  if (error.isOperational) {
    return res.status(error.statusCode || 500).json({
      error: error.message
    });
  }

  // Programmer error - log and crash
  process.exit(1);
});
```

3. **Async Wrapper:**
```javascript
// Wrap async route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json(users);
}));
```

4. **Global Error Handler:**
```javascript
const errorHandler = {
  async handleError(error) {
    await logger.error(error);

    if (!error.isOperational) {
      // Programmer error - restart needed
      process.exit(1);
    }
  }
};

process.on('uncaughtException', (error) => {
  errorHandler.handleError(error);
});

process.on('unhandledRejection', (reason) => {
  throw reason; // Convert to uncaughtException
});
```
</details>

---

#### 6. Modules
**Q: Explain the Node.js module system. How do CommonJS and ES modules differ?**

<details>
<summary>Answer</summary>

**CommonJS (default in Node.js):**
```javascript
// Exporting
module.exports = { add, subtract };
// or
exports.add = add;
exports.subtract = subtract;

// Importing
const math = require('./math');
const { add } = require('./math');

// Dynamic import
const moduleName = './math';
const math = require(moduleName); // Works!
```

**ES Modules:**
```javascript
// Exporting
export const add = (a, b) => a + b;
export default class Calculator {}

// Importing
import Calculator, { add } from './math.js';
import * as math from './math.js';

// Dynamic import
const moduleName = './math.js';
const math = await import(moduleName);
```

**Key Differences:**

| Feature | CommonJS | ES Modules |
|---------|----------|------------|
| Syntax | require/module.exports | import/export |
| Loading | Synchronous | Asynchronous |
| Parsing | Runtime | Static (at parse time) |
| Top-level await | No | Yes |
| File extension | .js (default) | .mjs or "type": "module" |
| this | module.exports | undefined |
| __dirname | Available | Not available* |

**ES Modules - Getting __dirname:**
```javascript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

**Module Resolution:**
```javascript
// 1. Core modules
const fs = require('fs');

// 2. File modules (starts with ./ or ../)
const myModule = require('./myModule');
// Tries: ./myModule.js, ./myModule.json, ./myModule.node

// 3. node_modules
const express = require('express');
// Searches up the directory tree for node_modules/express

// 4. package.json "main" or "exports"
```

**Interoperability:**
```javascript
// ESM importing CJS
import cjsModule from './cjs-module.cjs';
// Default export = module.exports

// CJS importing ESM
const esmModule = await import('./esm-module.mjs');
// Must use dynamic import
```

**Module Caching:**
```javascript
// Modules are cached after first load
require('./module'); // Loads and caches
require('./module'); // Returns cached

// Clear cache (usually not recommended)
delete require.cache[require.resolve('./module')];
```

**package.json exports (Node.js 12+):**
```json
{
  "name": "my-package",
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js"
    },
    "./feature": {
      "import": "./dist/esm/feature.js",
      "require": "./dist/cjs/feature.js"
    }
  }
}
```
</details>

---

#### 7. Child Processes
**Q: Explain the different ways to create child processes in Node.js.**

<details>
<summary>Answer</summary>

**Four methods to create child processes:**

**1. exec() - Buffered output, shell:**
```javascript
const { exec } = require('child_process');

exec('ls -la', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Stderr: ${stderr}`);
    return;
  }
  console.log(`Output: ${stdout}`);
});

// Promise version
const { promisify } = require('util');
const execPromise = promisify(exec);

const { stdout } = await execPromise('ls -la');
```
- Uses shell
- Buffers output (default 1MB limit)
- Good for simple commands

**2. execFile() - No shell:**
```javascript
const { execFile } = require('child_process');

execFile('node', ['--version'], (error, stdout) => {
  console.log(stdout);
});
```
- No shell (more secure, faster)
- Good for running executables directly
- Buffers output

**3. spawn() - Streaming:**
```javascript
const { spawn } = require('child_process');

const ls = spawn('ls', ['-la']);

ls.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
});

// With options
const child = spawn('npm', ['install'], {
  cwd: '/path/to/project',
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: 'inherit' // Inherit parent's stdio
});
```
- No shell by default
- Streams output (good for large data)
- Most control

**4. fork() - Node.js processes with IPC:**
```javascript
// parent.js
const { fork } = require('child_process');

const child = fork('./child.js');

child.send({ type: 'START', data: [1, 2, 3] });

child.on('message', (message) => {
  console.log('From child:', message);
});

// child.js
process.on('message', (message) => {
  if (message.type === 'START') {
    const result = processData(message.data);
    process.send({ type: 'RESULT', data: result });
  }
});
```
- Specifically for Node.js scripts
- Built-in IPC channel
- Separate V8 instance

**Comparison:**

| Method | Shell | Buffered | IPC | Use Case |
|--------|-------|----------|-----|----------|
| exec | Yes | Yes | No | Simple shell commands |
| execFile | No | Yes | No | Running executables |
| spawn | Optional | No | Optional | Large output, streaming |
| fork | No | No | Yes | Node.js child processes |

**stdio Options:**
```javascript
const child = spawn('cmd', [], {
  stdio: [
    'pipe',    // stdin
    'pipe',    // stdout
    'pipe',    // stderr
    'ipc'      // IPC channel
  ]
});

// Shortcuts
stdio: 'inherit'  // [process.stdin, process.stdout, process.stderr]
stdio: 'pipe'     // ['pipe', 'pipe', 'pipe']
stdio: 'ignore'   // Silence all
```

**Detached Process:**
```javascript
const child = spawn('long-running-script', [], {
  detached: true,
  stdio: 'ignore'
});

child.unref(); // Allow parent to exit independently
```
</details>

---

### Express & HTTP

#### 8. Middleware
**Q: Explain how middleware works in Express. What's the order of execution?**

<details>
<summary>Answer</summary>

**Middleware** are functions that have access to request, response, and next function.

```javascript
function middleware(req, res, next) {
  // Do something
  next(); // Call next middleware
}
```

**Execution Order:**
```javascript
const express = require('express');
const app = express();

// 1. Application-level middleware (runs for all requests)
app.use((req, res, next) => {
  console.log('1. App middleware');
  next();
});

// 2. Router-level middleware
const router = express.Router();
router.use((req, res, next) => {
  console.log('2. Router middleware');
  next();
});

// 3. Route-specific middleware
router.get('/users',
  (req, res, next) => {
    console.log('3. Route middleware');
    next();
  },
  (req, res) => {
    console.log('4. Route handler');
    res.send('Users');
  }
);

app.use('/api', router);

// 4. Error handling middleware (4 parameters)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Error!');
});
```

**Middleware Stack:**
```
Request → Middleware 1 → Middleware 2 → Route Handler
                ↓             ↓              ↓
Response ← Middleware 1 ← Middleware 2 ← Route Handler
```

**Types of Middleware:**

```javascript
// 1. Application-level
app.use(cors());
app.use(express.json());

// 2. Router-level
router.use(authMiddleware);

// 3. Route-specific
app.get('/admin', isAdmin, (req, res) => {});

// 4. Error-handling
app.use((err, req, res, next) => {});

// 5. Built-in
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// 6. Third-party
app.use(helmet());
app.use(morgan('dev'));
```

**Common Patterns:**

```javascript
// Authentication middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Validation middleware
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  next();
};

// Rate limiting
const rateLimit = (limit, window) => {
  const requests = new Map();

  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const windowStart = now - window;

    const requestTimestamps = requests.get(ip) || [];
    const recent = requestTimestamps.filter(t => t > windowStart);

    if (recent.length >= limit) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    recent.push(now);
    requests.set(ip, recent);
    next();
  };
};
```

**Async Middleware:**
```javascript
// Must handle errors manually
app.get('/users', async (req, res, next) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    next(error); // Pass to error handler
  }
});

// Or use wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json(users);
}));
```
</details>

---

#### 9. Security
**Q: What are common security vulnerabilities in Node.js applications and how do you prevent them?**

<details>
<summary>Answer</summary>

**1. Injection Attacks:**

SQL Injection:
```javascript
// Bad
const query = `SELECT * FROM users WHERE id = ${userId}`;

// Good - parameterized queries
const query = 'SELECT * FROM users WHERE id = $1';
await pool.query(query, [userId]);

// With ORM
await User.findOne({ where: { id: userId } });
```

NoSQL Injection:
```javascript
// Bad - user input can be { $gt: '' }
const user = await User.findOne({ username: req.body.username });

// Good - validate input
const username = String(req.body.username);
const user = await User.findOne({ username });
```

Command Injection:
```javascript
// Bad
exec(`ls ${userInput}`);

// Good - use spawn with array args
spawn('ls', [userInput]);

// Or validate input
if (!/^[a-zA-Z0-9]+$/.test(userInput)) {
  throw new Error('Invalid input');
}
```

**2. XSS (Cross-Site Scripting):**
```javascript
// Bad - reflects user input
res.send(`<h1>Hello ${req.query.name}</h1>`);

// Good - escape output
const escapeHtml = require('escape-html');
res.send(`<h1>Hello ${escapeHtml(req.query.name)}</h1>`);

// Use template engines with auto-escaping
// (EJS, Pug, etc.)

// Set CSP headers
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"]
  }
}));
```

**3. CSRF (Cross-Site Request Forgery):**
```javascript
const csrf = require('csurf');

app.use(csrf({ cookie: true }));

app.get('/form', (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});

// In form:
// <input type="hidden" name="_csrf" value="{{csrfToken}}">
```

**4. Security Headers (Helmet):**
```javascript
const helmet = require('helmet');

app.use(helmet()); // Sets many headers

// Equivalent to:
app.use(helmet.contentSecurityPolicy());
app.use(helmet.crossOriginEmbedderPolicy());
app.use(helmet.crossOriginOpenerPolicy());
app.use(helmet.crossOriginResourcePolicy());
app.use(helmet.dnsPrefetchControl());
app.use(helmet.frameguard());
app.use(helmet.hidePoweredBy());
app.use(helmet.hsts());
app.use(helmet.ieNoOpen());
app.use(helmet.noSniff());
app.use(helmet.originAgentCluster());
app.use(helmet.permittedCrossDomainPolicies());
app.use(helmet.referrerPolicy());
app.use(helmet.xssFilter());
```

**5. Rate Limiting:**
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests'
});

app.use('/api/', limiter);
```

**6. Input Validation:**
```javascript
const Joi = require('joi');

const userSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required()
});

app.post('/users', (req, res) => {
  const { error, value } = userSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  // Use validated 'value'
});
```

**7. Secrets Management:**
```javascript
// Bad - hardcoded secrets
const secret = 'my-super-secret';

// Good - environment variables
const secret = process.env.JWT_SECRET;

// Use dotenv for local development
require('dotenv').config();

// Never commit .env files
// .gitignore: .env
```

**8. Dependencies:**
```bash
# Audit for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Check outdated packages
npm outdated
```

**9. HTTPS:**
```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

https.createServer(options, app).listen(443);

// Force HTTPS
app.use((req, res, next) => {
  if (!req.secure) {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});
```
</details>

---

#### 10. Performance
**Q: How do you optimize Node.js application performance?**

<details>
<summary>Answer</summary>

**1. Use Clustering:**
```javascript
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isPrimary) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  app.listen(3000);
}

// Or use PM2
// pm2 start app.js -i max
```

**2. Caching:**
```javascript
// In-memory cache
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 });

app.get('/data', async (req, res) => {
  const cached = cache.get('data');
  if (cached) return res.json(cached);

  const data = await fetchData();
  cache.set('data', data);
  res.json(data);
});

// Redis cache
const Redis = require('ioredis');
const redis = new Redis();

app.get('/data', async (req, res) => {
  const cached = await redis.get('data');
  if (cached) return res.json(JSON.parse(cached));

  const data = await fetchData();
  await redis.setex('data', 600, JSON.stringify(data));
  res.json(data);
});
```

**3. Compression:**
```javascript
const compression = require('compression');

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

**4. Database Optimization:**
```javascript
// Connection pooling
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Indexing (in MongoDB)
await collection.createIndex({ email: 1 });

// Query optimization
// Bad - fetches all fields
const users = await User.find();

// Good - select only needed fields
const users = await User.find().select('name email');

// Pagination
const users = await User.find()
  .skip((page - 1) * limit)
  .limit(limit);
```

**5. Async Operations:**
```javascript
// Parallel operations
const [users, posts, comments] = await Promise.all([
  User.find(),
  Post.find(),
  Comment.find()
]);

// Stream large data
app.get('/export', (req, res) => {
  const cursor = User.find().cursor();
  res.setHeader('Content-Type', 'application/json');

  cursor.pipe(JSONStream.stringify()).pipe(res);
});
```

**6. Worker Threads for CPU Tasks:**
```javascript
const { Worker } = require('worker_threads');

app.get('/heavy-computation', (req, res) => {
  const worker = new Worker('./compute-worker.js', {
    workerData: req.query.data
  });

  worker.on('message', result => res.json(result));
  worker.on('error', err => res.status(500).json({ error: err.message }));
});
```

**7. Monitoring:**
```javascript
// APM tools
require('newrelic'); // or Datadog, Dynatrace

// Custom metrics
const prometheus = require('prom-client');

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path, status_code: res.statusCode });
  });
  next();
});
```

**8. Code Optimization:**
```javascript
// Avoid sync operations
// Bad
const data = fs.readFileSync('file.txt');

// Good
const data = await fs.promises.readFile('file.txt');

// Use efficient data structures
// Bad for large arrays
const index = arr.indexOf(item); // O(n)

// Good
const set = new Set(arr);
const exists = set.has(item); // O(1)

// Avoid memory leaks
// Clear listeners, timers, intervals
// Use WeakMap for caches with object keys
```

**9. HTTP Keep-Alive:**
```javascript
const http = require('http');
const https = require('https');

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

// Use with axios
const axios = require('axios');
axios.defaults.httpAgent = httpAgent;
axios.defaults.httpsAgent = httpsAgent;
```

**10. Load Testing:**
```bash
# With autocannon
npx autocannon -c 100 -d 30 http://localhost:3000/api

# With k6
k6 run script.js
```
</details>

---

## Quick Reference: Common Patterns

### Error Handling Pattern
```javascript
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

// Usage
throw new AppError('User not found', 404);
```

### Repository Pattern
```javascript
class UserRepository {
  async findById(id) {
    return User.findById(id);
  }

  async create(data) {
    return User.create(data);
  }

  async update(id, data) {
    return User.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return User.findByIdAndDelete(id);
  }
}
```

### Factory Pattern
```javascript
class PaymentFactory {
  static create(type) {
    switch (type) {
      case 'stripe':
        return new StripePayment();
      case 'paypal':
        return new PaypalPayment();
      default:
        throw new Error(`Unknown payment type: ${type}`);
    }
  }
}
```

### Singleton Pattern
```javascript
class Database {
  constructor() {
    if (Database.instance) {
      return Database.instance;
    }
    this.connection = null;
    Database.instance = this;
  }

  async connect(uri) {
    if (!this.connection) {
      this.connection = await mongoose.connect(uri);
    }
    return this.connection;
  }
}

module.exports = new Database();
```

### Middleware Chain Pattern
```javascript
const compose = (...middlewares) => {
  return async (req, res) => {
    let index = -1;

    const dispatch = async (i) => {
      if (i <= index) throw new Error('next() called multiple times');
      index = i;

      const fn = middlewares[i];
      if (!fn) return;

      await fn(req, res, () => dispatch(i + 1));
    };

    await dispatch(0);
  };
};

// Usage
const handler = compose(
  authMiddleware,
  validationMiddleware,
  businessLogic
);
```
