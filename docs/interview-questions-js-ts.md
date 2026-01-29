# JavaScript & TypeScript Interview Questions

## Part 1: Practical Coding Tasks

### 1. Debounce Function
**Task:** Implement a debounce function that delays the execution of a function until after a specified wait time has elapsed since the last call.

```javascript
// Implement this function
function debounce(func, wait) {
  // Your code here
}

// Usage
const searchAPI = debounce((query) => {
  console.log('Searching for:', query);
}, 300);

searchAPI('h');
searchAPI('he');
searchAPI('hello'); // Only this should execute after 300ms
```

<details>
<summary>Solution</summary>

```javascript
function debounce(func, wait) {
  let timeoutId = null;

  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}
```
</details>

---

### 2. Throttle Function
**Task:** Implement a throttle function that ensures a function is called at most once in a specified time period.

```javascript
function throttle(func, limit) {
  // Your code here
}

// Usage - scroll handler that fires at most once per 100ms
window.addEventListener('scroll', throttle(() => {
  console.log('Scroll position:', window.scrollY);
}, 100));
```

<details>
<summary>Solution</summary>

```javascript
function throttle(func, limit) {
  let inThrottle = false;

  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
```
</details>

---

### 3. Deep Clone Object
**Task:** Implement a function that creates a deep clone of an object, handling nested objects, arrays, dates, and circular references.

```javascript
function deepClone(obj, seen = new WeakMap()) {
  // Your code here
}

// Test
const original = {
  name: 'John',
  age: 30,
  address: {
    city: 'NYC',
    zip: 10001
  },
  hobbies: ['reading', 'gaming'],
  birthDate: new Date('1990-01-01')
};
original.self = original; // Circular reference

const cloned = deepClone(original);
```

<details>
<summary>Solution</summary>

```javascript
function deepClone(obj, seen = new WeakMap()) {
  // Handle primitives and null
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle circular references
  if (seen.has(obj)) {
    return seen.get(obj);
  }

  // Handle Date
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  // Handle Array
  if (Array.isArray(obj)) {
    const arrCopy = [];
    seen.set(obj, arrCopy);
    obj.forEach((item, index) => {
      arrCopy[index] = deepClone(item, seen);
    });
    return arrCopy;
  }

  // Handle Object
  const objCopy = {};
  seen.set(obj, objCopy);
  Object.keys(obj).forEach(key => {
    objCopy[key] = deepClone(obj[key], seen);
  });

  return objCopy;
}
```
</details>

---

### 4. Promise.all Implementation
**Task:** Implement your own version of `Promise.all`.

```javascript
function promiseAll(promises) {
  // Your code here
}

// Test
const p1 = Promise.resolve(1);
const p2 = new Promise(resolve => setTimeout(() => resolve(2), 100));
const p3 = Promise.resolve(3);

promiseAll([p1, p2, p3]).then(console.log); // [1, 2, 3]
```

<details>
<summary>Solution</summary>

```javascript
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(promises)) {
      return reject(new TypeError('Argument must be an array'));
    }

    if (promises.length === 0) {
      return resolve([]);
    }

    const results = [];
    let completedCount = 0;

    promises.forEach((promise, index) => {
      Promise.resolve(promise)
        .then(value => {
          results[index] = value;
          completedCount++;

          if (completedCount === promises.length) {
            resolve(results);
          }
        })
        .catch(reject);
    });
  });
}
```
</details>

---

### 5. Flatten Nested Array
**Task:** Implement a function to flatten a deeply nested array to a specified depth.

```javascript
function flatten(arr, depth = 1) {
  // Your code here
}

// Test
const nested = [1, [2, [3, [4, [5]]]]];
console.log(flatten(nested, 1));    // [1, 2, [3, [4, [5]]]]
console.log(flatten(nested, 2));    // [1, 2, 3, [4, [5]]]
console.log(flatten(nested, Infinity)); // [1, 2, 3, 4, 5]
```

<details>
<summary>Solution</summary>

```javascript
function flatten(arr, depth = 1) {
  if (depth < 1) return arr.slice();

  return arr.reduce((acc, val) => {
    if (Array.isArray(val)) {
      acc.push(...flatten(val, depth - 1));
    } else {
      acc.push(val);
    }
    return acc;
  }, []);
}

// Alternative recursive solution
function flattenRecursive(arr, depth = 1) {
  const result = [];

  function helper(subArr, d) {
    for (const item of subArr) {
      if (Array.isArray(item) && d > 0) {
        helper(item, d - 1);
      } else {
        result.push(item);
      }
    }
  }

  helper(arr, depth);
  return result;
}
```
</details>

---

### 6. Event Emitter
**Task:** Implement an EventEmitter class with `on`, `off`, `emit`, and `once` methods.

```javascript
class EventEmitter {
  // Your code here
}

// Test
const emitter = new EventEmitter();

const handler = (data) => console.log('Received:', data);
emitter.on('message', handler);
emitter.emit('message', 'Hello'); // Received: Hello

emitter.once('connect', () => console.log('Connected!'));
emitter.emit('connect'); // Connected!
emitter.emit('connect'); // Nothing happens

emitter.off('message', handler);
emitter.emit('message', 'World'); // Nothing happens
```

<details>
<summary>Solution</summary>

```javascript
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }

  off(event, listener) {
    if (!this.events[event]) return this;

    this.events[event] = this.events[event].filter(l => l !== listener);
    return this;
  }

  emit(event, ...args) {
    if (!this.events[event]) return false;

    this.events[event].forEach(listener => {
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
}
```
</details>

---

### 7. LRU Cache
**Task:** Implement a Least Recently Used (LRU) cache with O(1) get and put operations.

```typescript
class LRUCache {
  constructor(capacity: number) {
    // Your code here
  }

  get(key: string): number | undefined {
    // Your code here
  }

  put(key: string, value: number): void {
    // Your code here
  }
}

// Test
const cache = new LRUCache(2);
cache.put('a', 1);
cache.put('b', 2);
console.log(cache.get('a')); // 1
cache.put('c', 3); // Evicts 'b'
console.log(cache.get('b')); // undefined
```

<details>
<summary>Solution</summary>

```typescript
class LRUCache {
  private capacity: number;
  private cache: Map<string, number>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key: string): number | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  put(key: string, value: number): void {
    // If key exists, delete it first
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // If at capacity, delete oldest (first item)
    else if (this.cache.size >= this.capacity) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }
}
```
</details>

---

### 8. Curry Function
**Task:** Implement a curry function that transforms a function with multiple arguments into a sequence of functions.

```javascript
function curry(fn) {
  // Your code here
}

// Test
function add(a, b, c) {
  return a + b + c;
}

const curriedAdd = curry(add);
console.log(curriedAdd(1)(2)(3)); // 6
console.log(curriedAdd(1, 2)(3)); // 6
console.log(curriedAdd(1)(2, 3)); // 6
console.log(curriedAdd(1, 2, 3)); // 6
```

<details>
<summary>Solution</summary>

```javascript
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return function(...nextArgs) {
      return curried.apply(this, args.concat(nextArgs));
    };
  };
}
```
</details>

---

### 9. Async Retry with Exponential Backoff
**Task:** Implement a function that retries an async operation with exponential backoff.

```typescript
interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  // Your code here
}

// Test
let attempts = 0;
const flakeyAPI = async () => {
  attempts++;
  if (attempts < 3) throw new Error('Failed');
  return 'Success!';
};

const result = await retryWithBackoff(flakeyAPI, {
  maxRetries: 5,
  baseDelayMs: 100,
  maxDelayMs: 2000
});
```

<details>
<summary>Solution</summary>

```typescript
interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt),
        maxDelayMs
      );

      // Add jitter to prevent thundering herd
      const jitter = delay * 0.1 * Math.random();

      await new Promise(resolve =>
        setTimeout(resolve, delay + jitter)
      );
    }
  }

  throw lastError!;
}
```
</details>

---

### 10. Object Path Get/Set
**Task:** Implement functions to safely get and set nested object properties using a path string.

```typescript
function get(obj: any, path: string, defaultValue?: any): any {
  // Your code here
}

function set(obj: any, path: string, value: any): void {
  // Your code here
}

// Test
const user = {
  name: 'John',
  address: {
    city: 'NYC',
    coordinates: {
      lat: 40.7128,
      lng: -74.0060
    }
  },
  friends: [{ name: 'Jane' }, { name: 'Bob' }]
};

console.log(get(user, 'address.city')); // 'NYC'
console.log(get(user, 'address.country', 'USA')); // 'USA'
console.log(get(user, 'friends[0].name')); // 'Jane'

set(user, 'address.country', 'USA');
set(user, 'settings.theme', 'dark');
console.log(user.settings.theme); // 'dark'
```

<details>
<summary>Solution</summary>

```typescript
function get(obj: any, path: string, defaultValue?: any): any {
  const keys = path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);

  let result = obj;

  for (const key of keys) {
    if (result == null) {
      return defaultValue;
    }
    result = result[key];
  }

  return result === undefined ? defaultValue : result;
}

function set(obj: any, path: string, value: any): void {
  const keys = path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);

  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const nextKey = keys[i + 1];

    if (current[key] == null) {
      // Create array if next key is numeric, otherwise object
      current[key] = /^\d+$/.test(nextKey) ? [] : {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}
```
</details>

---

### 11. Parallel Task Limiter
**Task:** Implement a function that runs async tasks with a concurrency limit.

```typescript
async function parallelLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  // Your code here
}

// Test
const delay = (ms: number, val: number) =>
  new Promise(resolve => setTimeout(() => resolve(val), ms));

const tasks = [
  () => delay(100, 1),
  () => delay(50, 2),
  () => delay(200, 3),
  () => delay(80, 4),
  () => delay(150, 5)
];

// Should run max 2 tasks at a time
const results = await parallelLimit(tasks, 2);
console.log(results); // [1, 2, 3, 4, 5]
```

<details>
<summary>Solution</summary>

```typescript
async function parallelLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];

    const promise = Promise.resolve().then(async () => {
      results[i] = await task();
    });

    executing.push(promise);

    if (executing.length >= limit) {
      await Promise.race(executing);
      // Remove completed promises
      const completedIndex = executing.findIndex(p =>
        p.then(() => true).catch(() => true)
      );
      if (completedIndex !== -1) {
        executing.splice(completedIndex, 1);
      }
    }
  }

  await Promise.all(executing);
  return results;
}

// Alternative cleaner solution
async function parallelLimitAlt<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < tasks.length) {
      const index = currentIndex++;
      results[index] = await tasks[index]();
    }
  }

  const workers = Array(Math.min(limit, tasks.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}
```
</details>

---

### 12. Memoize with TTL
**Task:** Implement a memoization function with time-to-live (TTL) cache expiration.

```typescript
interface MemoizeOptions {
  ttl: number; // milliseconds
  maxSize?: number;
}

function memoizeWithTTL<T extends (...args: any[]) => any>(
  fn: T,
  options: MemoizeOptions
): T {
  // Your code here
}

// Test
let callCount = 0;
const expensiveCalc = (x: number) => {
  callCount++;
  return x * 2;
};

const memoized = memoizeWithTTL(expensiveCalc, { ttl: 1000 });

console.log(memoized(5)); // 10, callCount = 1
console.log(memoized(5)); // 10, callCount = 1 (cached)
await new Promise(r => setTimeout(r, 1100));
console.log(memoized(5)); // 10, callCount = 2 (cache expired)
```

<details>
<summary>Solution</summary>

```typescript
interface MemoizeOptions {
  ttl: number;
  maxSize?: number;
}

interface CacheEntry<T> {
  value: T;
  expiry: number;
}

function memoizeWithTTL<T extends (...args: any[]) => any>(
  fn: T,
  options: MemoizeOptions
): T {
  const { ttl, maxSize = 100 } = options;
  const cache = new Map<string, CacheEntry<ReturnType<T>>>();

  function memoized(...args: Parameters<T>): ReturnType<T> {
    const key = JSON.stringify(args);
    const now = Date.now();

    // Check if cached and not expired
    if (cache.has(key)) {
      const entry = cache.get(key)!;
      if (now < entry.expiry) {
        return entry.value;
      }
      cache.delete(key);
    }

    // Evict oldest if at max size
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    // Compute and cache
    const result = fn(...args);
    cache.set(key, {
      value: result,
      expiry: now + ttl
    });

    return result;
  }

  return memoized as T;
}
```
</details>

---

### 13. TypeScript: Type-Safe API Response Handler
**Task:** Create a type-safe API response handler that properly types success and error responses.

```typescript
// Implement these types and function
type ApiResponse<T> = // Your code here

interface User {
  id: number;
  name: string;
  email: string;
}

async function fetchUser(id: number): Promise<ApiResponse<User>> {
  // Your code here
}

// Usage should work like:
const response = await fetchUser(1);
if (response.success) {
  console.log(response.data.name); // TypeScript knows data exists
} else {
  console.log(response.error); // TypeScript knows error exists
}
```

<details>
<summary>Solution</summary>

```typescript
type ApiResponse<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never };

interface User {
  id: number;
  name: string;
  email: string;
}

async function fetchUser(id: number): Promise<ApiResponse<User>> {
  try {
    const response = await fetch(`/api/users/${id}`);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error: ${response.status}`
      };
    }

    const data: User = await response.json();
    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// More advanced: Generic Result type with error typing
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok;
}

function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok;
}
```
</details>

---

### 14. TypeScript: Builder Pattern with Type Safety
**Task:** Implement a type-safe builder pattern for creating configuration objects.

```typescript
// Implement QueryBuilder with method chaining
// Each method should return a new type that tracks what's been set

interface QueryConfig {
  table: string;
  columns: string[];
  where?: string;
  orderBy?: string;
  limit?: number;
}

class QueryBuilder {
  // Your implementation
}

// Usage - should have type errors if required fields are missing
const query = new QueryBuilder()
  .table('users')
  .select(['id', 'name', 'email'])
  .where('active = true')
  .orderBy('created_at DESC')
  .limit(10)
  .build(); // Should only be callable when table and columns are set
```

<details>
<summary>Solution</summary>

```typescript
interface QueryConfig {
  table: string;
  columns: string[];
  where?: string;
  orderBy?: string;
  limit?: number;
}

type BuilderState = {
  hasTable: boolean;
  hasColumns: boolean;
};

class QueryBuilder<State extends BuilderState = { hasTable: false; hasColumns: false }> {
  private config: Partial<QueryConfig> = {};

  table(name: string): QueryBuilder<State & { hasTable: true }> {
    const builder = new QueryBuilder<State & { hasTable: true }>();
    builder.config = { ...this.config, table: name };
    return builder;
  }

  select(columns: string[]): QueryBuilder<State & { hasColumns: true }> {
    const builder = new QueryBuilder<State & { hasColumns: true }>();
    builder.config = { ...this.config, columns };
    return builder;
  }

  where(condition: string): QueryBuilder<State> {
    const builder = new QueryBuilder<State>();
    builder.config = { ...this.config, where: condition };
    return builder;
  }

  orderBy(order: string): QueryBuilder<State> {
    const builder = new QueryBuilder<State>();
    builder.config = { ...this.config, orderBy: order };
    return builder;
  }

  limit(count: number): QueryBuilder<State> {
    const builder = new QueryBuilder<State>();
    builder.config = { ...this.config, limit: count };
    return builder;
  }

  build(
    this: QueryBuilder<{ hasTable: true; hasColumns: true }>
  ): QueryConfig {
    return this.config as QueryConfig;
  }
}

// Usage
const query = new QueryBuilder()
  .table('users')
  .select(['id', 'name'])
  .where('active = true')
  .build(); // Works!

// const invalid = new QueryBuilder()
//   .table('users')
//   .build(); // Error: Property 'build' does not exist
```
</details>

---

### 15. Implement Observable Pattern
**Task:** Create a simple Observable implementation with map, filter, and subscribe.

```typescript
class Observable<T> {
  constructor(private producer: (observer: Observer<T>) => void) {}

  // Implement: subscribe, map, filter
}

interface Observer<T> {
  next: (value: T) => void;
  error?: (err: Error) => void;
  complete?: () => void;
}

// Test
const numbers$ = new Observable<number>(observer => {
  observer.next(1);
  observer.next(2);
  observer.next(3);
  observer.complete?.();
});

numbers$
  .filter(x => x > 1)
  .map(x => x * 10)
  .subscribe({
    next: console.log, // 20, 30
    complete: () => console.log('Done!')
  });
```

<details>
<summary>Solution</summary>

```typescript
interface Observer<T> {
  next: (value: T) => void;
  error?: (err: Error) => void;
  complete?: () => void;
}

interface Subscription {
  unsubscribe: () => void;
}

class Observable<T> {
  constructor(
    private producer: (observer: Observer<T>) => (() => void) | void
  ) {}

  subscribe(observer: Observer<T>): Subscription {
    let isUnsubscribed = false;

    const safeObserver: Observer<T> = {
      next: (value) => {
        if (!isUnsubscribed) {
          observer.next(value);
        }
      },
      error: (err) => {
        if (!isUnsubscribed) {
          observer.error?.(err);
          isUnsubscribed = true;
        }
      },
      complete: () => {
        if (!isUnsubscribed) {
          observer.complete?.();
          isUnsubscribed = true;
        }
      }
    };

    const cleanup = this.producer(safeObserver);

    return {
      unsubscribe: () => {
        isUnsubscribed = true;
        cleanup?.();
      }
    };
  }

  map<U>(fn: (value: T) => U): Observable<U> {
    return new Observable<U>(observer => {
      const subscription = this.subscribe({
        next: (value) => observer.next(fn(value)),
        error: observer.error,
        complete: observer.complete
      });
      return () => subscription.unsubscribe();
    });
  }

  filter(predicate: (value: T) => boolean): Observable<T> {
    return new Observable<T>(observer => {
      const subscription = this.subscribe({
        next: (value) => {
          if (predicate(value)) {
            observer.next(value);
          }
        },
        error: observer.error,
        complete: observer.complete
      });
      return () => subscription.unsubscribe();
    });
  }
}
```
</details>

---

## Part 2: Theory Questions

### JavaScript Core Concepts

#### 1. Event Loop & Concurrency
**Q: Explain the JavaScript event loop. What is the difference between the call stack, task queue, and microtask queue?**

<details>
<summary>Answer</summary>

The JavaScript event loop is the mechanism that handles asynchronous operations:

1. **Call Stack**: Executes synchronous code. Functions are pushed when called and popped when they return.

2. **Task Queue (Macrotask Queue)**: Holds callbacks from `setTimeout`, `setInterval`, I/O operations, and UI rendering. Processed one at a time after the call stack is empty.

3. **Microtask Queue**: Holds callbacks from `Promise.then()`, `queueMicrotask()`, and `MutationObserver`. Has higher priority than the task queue - ALL microtasks are processed before the next macrotask.

**Execution Order:**
```javascript
console.log('1'); // Sync

setTimeout(() => console.log('2'), 0); // Macrotask

Promise.resolve().then(() => console.log('3')); // Microtask

console.log('4'); // Sync

// Output: 1, 4, 3, 2
```

The event loop continuously checks if the call stack is empty. If empty, it first processes ALL microtasks, then ONE macrotask, then renders (if needed), and repeats.
</details>

---

#### 2. Closures
**Q: What is a closure? Provide an example where closures are useful and explain potential memory implications.**

<details>
<summary>Answer</summary>

A **closure** is a function that retains access to variables from its outer (enclosing) scope even after the outer function has returned.

**How it works**: When a function is created, it captures a reference to its lexical environment (all variables in scope at creation time).

**Practical Example - Private State:**
```javascript
function createCounter() {
  let count = 0; // Private variable

  return {
    increment() { return ++count; },
    decrement() { return --count; },
    getCount() { return count; }
  };
}

const counter = createCounter();
counter.increment(); // 1
counter.increment(); // 2
// count is not accessible directly - it's private
```

**Memory Implications:**
- Closures keep their outer scope alive, preventing garbage collection
- Can cause memory leaks if not careful:

```javascript
function createLeak() {
  const largeData = new Array(1000000).fill('x');

  return function() {
    // Even if we don't use largeData, it's still in scope
    console.log('Hello');
  };
}

const leakyFn = createLeak(); // largeData stays in memory
```

**Best Practice**: Only capture what you need, and set references to null when done if dealing with large data.
</details>

---

#### 3. Prototypal Inheritance
**Q: Explain prototypal inheritance in JavaScript. How does it differ from classical inheritance?**

<details>
<summary>Answer</summary>

**Prototypal Inheritance**: Objects inherit directly from other objects through a prototype chain.

Every JavaScript object has an internal `[[Prototype]]` link to another object. When accessing a property, JavaScript first looks on the object itself, then traverses up the prototype chain.

```javascript
const animal = {
  speak() {
    console.log(`${this.name} makes a sound`);
  }
};

const dog = Object.create(animal);
dog.name = 'Rex';
dog.bark = function() {
  console.log('Woof!');
};

dog.speak(); // "Rex makes a sound" - inherited from animal
dog.bark();  // "Woof!" - own method
```

**Key Differences from Classical Inheritance:**

| Classical (Java, C++) | Prototypal (JavaScript) |
|----------------------|------------------------|
| Classes are blueprints | Objects inherit from objects |
| Inheritance at compile time | Inheritance at runtime |
| Rigid hierarchy | Flexible, can change at runtime |
| Instances are copies | Instances share prototype |

**Modern JS Classes** are syntactic sugar over prototypal inheritance:

```javascript
class Animal {
  speak() { console.log('Sound'); }
}

class Dog extends Animal {
  bark() { console.log('Woof'); }
}

// Under the hood, Dog.prototype.__proto__ === Animal.prototype
```
</details>

---

#### 4. this Keyword
**Q: Explain how `this` works in different contexts in JavaScript.**

<details>
<summary>Answer</summary>

The value of `this` depends on HOW a function is called, not where it's defined:

**1. Global Context:**
```javascript
console.log(this); // Window (browser) or globalThis (Node.js)
// In strict mode: undefined
```

**2. Object Method:**
```javascript
const obj = {
  name: 'Object',
  getName() {
    return this.name; // 'this' is obj
  }
};
obj.getName(); // 'Object'
```

**3. Constructor/Class:**
```javascript
function Person(name) {
  this.name = name; // 'this' is the new instance
}
new Person('John');
```

**4. Explicit Binding (call, apply, bind):**
```javascript
function greet() {
  console.log(this.name);
}
greet.call({ name: 'Alice' }); // 'Alice'
```

**5. Arrow Functions:**
```javascript
const obj = {
  name: 'Object',
  getName: () => {
    return this.name; // 'this' is lexically inherited (NOT obj!)
  },
  getNameCorrect() {
    const arrow = () => this.name; // 'this' is obj
    return arrow();
  }
};
```

**6. Event Handlers:**
```javascript
button.addEventListener('click', function() {
  console.log(this); // The button element
});

button.addEventListener('click', () => {
  console.log(this); // Lexical 'this' (probably Window)
});
```

**Common Pitfall:**
```javascript
const obj = {
  name: 'Object',
  greet() { console.log(this.name); }
};

const greet = obj.greet;
greet(); // undefined - 'this' is lost!
```
</details>

---

#### 5. Hoisting
**Q: Explain hoisting in JavaScript. How do `var`, `let`, `const`, and function declarations behave differently?**

<details>
<summary>Answer</summary>

**Hoisting** is JavaScript's behavior of moving declarations to the top of their scope during the compilation phase.

**var - Hoisted and initialized to undefined:**
```javascript
console.log(x); // undefined (not ReferenceError)
var x = 5;

// Behaves as:
var x;
console.log(x); // undefined
x = 5;
```

**let/const - Hoisted but NOT initialized (Temporal Dead Zone):**
```javascript
console.log(y); // ReferenceError: Cannot access 'y' before initialization
let y = 5;

// TDZ exists from start of block until declaration
{
  // TDZ starts
  console.log(z); // ReferenceError
  const z = 10; // TDZ ends
}
```

**Function Declarations - Fully hoisted:**
```javascript
sayHello(); // "Hello!" - works!

function sayHello() {
  console.log("Hello!");
}
```

**Function Expressions - Variable hoisting rules apply:**
```javascript
sayHi(); // TypeError: sayHi is not a function

var sayHi = function() {
  console.log("Hi!");
};

// With let:
sayBye(); // ReferenceError
let sayBye = () => console.log("Bye!");
```

**Best Practices:**
- Use `const` by default, `let` when reassignment is needed
- Avoid `var`
- Declare variables at the top of their scope for clarity
</details>

---

#### 6. == vs ===
**Q: Explain the difference between `==` and `===`. When would you use each?**

<details>
<summary>Answer</summary>

**`===` (Strict Equality):**
- Compares both value AND type
- No type coercion
- Returns true only if operands are the same type and value

```javascript
5 === 5      // true
5 === '5'    // false (different types)
null === undefined // false
NaN === NaN  // false (NaN is never equal to itself)
```

**`==` (Loose Equality):**
- Performs type coercion before comparison
- Complex coercion rules

```javascript
5 == '5'     // true (string converted to number)
null == undefined // true (special case)
0 == false   // true
'' == false  // true
[] == false  // true
[] == ![]    // true (wat!)
```

**Coercion Rules (simplified):**
1. null == undefined is true
2. Number vs String: String → Number
3. Boolean vs anything: Boolean → Number first
4. Object vs primitive: Object → primitive (valueOf/toString)

**When to use each:**

**Use `===` (almost always):**
```javascript
if (user.role === 'admin') { ... }
if (items.length === 0) { ... }
```

**Acceptable uses of `==`:**
```javascript
// Checking for null OR undefined
if (value == null) { ... }
// Same as: if (value === null || value === undefined)
```

**Best Practice:** Use `===` by default. The only common exception is `== null` for checking null/undefined together.
</details>

---

### TypeScript

#### 7. Type vs Interface
**Q: What are the differences between `type` and `interface` in TypeScript? When would you use each?**

<details>
<summary>Answer</summary>

**Similarities:**
Both can describe object shapes and be extended.

```typescript
// Both work for objects
interface IUser {
  name: string;
}

type TUser = {
  name: string;
};
```

**Key Differences:**

**1. Declaration Merging (interface only):**
```typescript
interface User {
  name: string;
}
interface User {
  age: number;
}
// User now has both name and age

type User = { name: string };
type User = { age: number }; // Error: Duplicate identifier
```

**2. Types can represent more:**
```typescript
// Primitives
type ID = string | number;

// Union types
type Status = 'pending' | 'active' | 'inactive';

// Tuples
type Point = [number, number];

// Mapped types
type Readonly<T> = { readonly [K in keyof T]: T[K] };
```

**3. Extension syntax:**
```typescript
// Interface extends
interface Animal { name: string }
interface Dog extends Animal { breed: string }

// Type intersection
type Animal = { name: string }
type Dog = Animal & { breed: string }
```

**4. Computed properties:**
```typescript
type Keys = 'firstName' | 'lastName';
type Person = { [K in Keys]: string }; // Works

interface Person { [K in Keys]: string } // Error
```

**When to use:**
- **interface**: For object shapes, especially in libraries (allows consumers to extend), class implementations
- **type**: For unions, tuples, mapped types, complex type operations, when you need a specific type (not just shape)
</details>

---

#### 8. Generics
**Q: Explain generics in TypeScript. Provide examples of generic functions, classes, and constraints.**

<details>
<summary>Answer</summary>

**Generics** allow you to write reusable code that works with multiple types while maintaining type safety.

**Generic Functions:**
```typescript
// Without generics - loses type info
function identity(arg: any): any {
  return arg;
}

// With generics - preserves type
function identity<T>(arg: T): T {
  return arg;
}

const num = identity(42);        // type: number
const str = identity("hello");   // type: string
```

**Generic Constraints:**
```typescript
// Constraint: T must have a length property
function logLength<T extends { length: number }>(arg: T): void {
  console.log(arg.length);
}

logLength("hello");     // OK
logLength([1, 2, 3]);   // OK
logLength(123);         // Error: number doesn't have length
```

**Generic Interfaces:**
```typescript
interface Repository<T> {
  find(id: string): T | null;
  save(item: T): void;
  delete(id: string): boolean;
}

interface User { id: string; name: string; }

class UserRepository implements Repository<User> {
  find(id: string): User | null { /* ... */ }
  save(user: User): void { /* ... */ }
  delete(id: string): boolean { /* ... */ }
}
```

**Generic Classes:**
```typescript
class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }
}

const numberStack = new Stack<number>();
numberStack.push(1);
numberStack.push("hello"); // Error!
```

**Multiple Type Parameters:**
```typescript
function map<T, U>(arr: T[], fn: (item: T) => U): U[] {
  return arr.map(fn);
}

const lengths = map(["a", "bb", "ccc"], s => s.length);
// type: number[]
```

**Default Type Parameters:**
```typescript
interface ApiResponse<T = any> {
  data: T;
  status: number;
}

const response: ApiResponse = { data: {}, status: 200 }; // T defaults to any
```
</details>

---

#### 9. Utility Types
**Q: Explain commonly used TypeScript utility types: `Partial`, `Required`, `Pick`, `Omit`, `Record`, `Readonly`.**

<details>
<summary>Answer</summary>

**Partial<T>** - Makes all properties optional:
```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

type PartialUser = Partial<User>;
// { id?: number; name?: string; email?: string; }

// Useful for updates
function updateUser(id: number, updates: Partial<User>) { ... }
```

**Required<T>** - Makes all properties required:
```typescript
interface Config {
  host?: string;
  port?: number;
}

type RequiredConfig = Required<Config>;
// { host: string; port: number; }
```

**Pick<T, K>** - Select specific properties:
```typescript
type UserPreview = Pick<User, 'id' | 'name'>;
// { id: number; name: string; }
```

**Omit<T, K>** - Exclude specific properties:
```typescript
type UserWithoutEmail = Omit<User, 'email'>;
// { id: number; name: string; }
```

**Record<K, V>** - Create object type with specific key and value types:
```typescript
type UserRoles = Record<string, 'admin' | 'user' | 'guest'>;
// { [key: string]: 'admin' | 'user' | 'guest' }

const roles: UserRoles = {
  'john': 'admin',
  'jane': 'user'
};

// With union keys
type Role = 'admin' | 'user';
type RolePermissions = Record<Role, string[]>;
// { admin: string[]; user: string[]; }
```

**Readonly<T>** - Makes all properties readonly:
```typescript
type ReadonlyUser = Readonly<User>;
// { readonly id: number; readonly name: string; readonly email: string; }

const user: ReadonlyUser = { id: 1, name: 'John', email: 'j@j.com' };
user.name = 'Jane'; // Error: Cannot assign to 'name'
```

**Combining Utility Types:**
```typescript
// Create type and make it readonly
type UserDTO = Readonly<Pick<User, 'id' | 'name'>>;
```
</details>

---

#### 10. Type Guards
**Q: What are type guards in TypeScript? Explain different ways to narrow types.**

<details>
<summary>Answer</summary>

**Type guards** are expressions that narrow the type of a variable within a conditional block.

**1. typeof Guard:**
```typescript
function process(value: string | number) {
  if (typeof value === 'string') {
    // value is string here
    return value.toUpperCase();
  }
  // value is number here
  return value.toFixed(2);
}
```

**2. instanceof Guard:**
```typescript
class Dog { bark() {} }
class Cat { meow() {} }

function speak(animal: Dog | Cat) {
  if (animal instanceof Dog) {
    animal.bark(); // TypeScript knows it's Dog
  } else {
    animal.meow(); // TypeScript knows it's Cat
  }
}
```

**3. in Operator:**
```typescript
interface Bird { fly(): void; }
interface Fish { swim(): void; }

function move(animal: Bird | Fish) {
  if ('fly' in animal) {
    animal.fly();
  } else {
    animal.swim();
  }
}
```

**4. Custom Type Guard (is keyword):**
```typescript
interface User { type: 'user'; name: string; }
interface Admin { type: 'admin'; permissions: string[]; }

function isAdmin(person: User | Admin): person is Admin {
  return person.type === 'admin';
}

function getPermissions(person: User | Admin) {
  if (isAdmin(person)) {
    return person.permissions; // TypeScript knows it's Admin
  }
  return [];
}
```

**5. Discriminated Unions:**
```typescript
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rectangle'; width: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'rectangle':
      return shape.width * shape.height;
  }
}
```

**6. Assertion Functions (TypeScript 3.7+):**
```typescript
function assertIsString(val: unknown): asserts val is string {
  if (typeof val !== 'string') {
    throw new Error('Not a string!');
  }
}

function process(value: unknown) {
  assertIsString(value);
  // value is string after this point
  console.log(value.toUpperCase());
}
```
</details>

---

### Async JavaScript

#### 11. Promises
**Q: Explain how Promises work. What are the three states of a Promise?**

<details>
<summary>Answer</summary>

A **Promise** is an object representing the eventual completion or failure of an asynchronous operation.

**Three States:**
1. **Pending**: Initial state, neither fulfilled nor rejected
2. **Fulfilled**: Operation completed successfully (resolved with a value)
3. **Rejected**: Operation failed (rejected with a reason/error)

```javascript
const promise = new Promise((resolve, reject) => {
  // Async operation
  setTimeout(() => {
    const success = true;
    if (success) {
      resolve('Data loaded'); // → Fulfilled
    } else {
      reject(new Error('Failed')); // → Rejected
    }
  }, 1000);
});

// Consuming
promise
  .then(data => console.log(data))
  .catch(err => console.error(err))
  .finally(() => console.log('Done'));
```

**Key Characteristics:**
- State changes are **irreversible** (once fulfilled/rejected, can't change)
- Promises are **eager** (executor runs immediately)
- `.then()` returns a new Promise (enables chaining)

**Promise Chaining:**
```javascript
fetchUser(id)
  .then(user => fetchPosts(user.id))
  .then(posts => renderPosts(posts))
  .catch(err => handleError(err));
```

**Static Methods:**
```javascript
Promise.all([p1, p2, p3])     // All must succeed
Promise.allSettled([p1, p2])  // Wait for all, get all results
Promise.race([p1, p2])        // First to settle wins
Promise.any([p1, p2])         // First to fulfill wins
Promise.resolve(value)         // Create fulfilled promise
Promise.reject(error)          // Create rejected promise
```

**Common Mistake:**
```javascript
// Wrong - no return
promise.then(data => {
  fetchMore(data); // Returns undefined, chain breaks
});

// Correct
promise.then(data => {
  return fetchMore(data);
});
```
</details>

---

#### 12. async/await
**Q: How does async/await work under the hood? What are common pitfalls?**

<details>
<summary>Answer</summary>

**async/await** is syntactic sugar over Promises, making asynchronous code look synchronous.

**How it works:**
- `async` functions always return a Promise
- `await` pauses execution until the Promise resolves
- Under the hood, it uses generators and Promises

```javascript
// This async function:
async function fetchData() {
  const response = await fetch('/api');
  const data = await response.json();
  return data;
}

// Is roughly equivalent to:
function fetchData() {
  return fetch('/api')
    .then(response => response.json())
    .then(data => data);
}
```

**Common Pitfalls:**

**1. Sequential instead of parallel:**
```javascript
// Bad - sequential (slow)
async function slow() {
  const a = await fetchA(); // Wait...
  const b = await fetchB(); // Then wait...
  return [a, b];
}

// Good - parallel (fast)
async function fast() {
  const [a, b] = await Promise.all([fetchA(), fetchB()]);
  return [a, b];
}
```

**2. Forgetting error handling:**
```javascript
// Bad - unhandled rejection
async function risky() {
  const data = await mightFail();
}

// Good - with try/catch
async function safe() {
  try {
    const data = await mightFail();
  } catch (error) {
    handleError(error);
  }
}
```

**3. await in loops:**
```javascript
// Bad - sequential
for (const url of urls) {
  const data = await fetch(url); // One at a time
}

// Good - parallel
const promises = urls.map(url => fetch(url));
const results = await Promise.all(promises);
```

**4. Top-level await (ES2022):**
```javascript
// Now valid in modules
const config = await loadConfig();
```

**5. Mixing async/await with .then():**
```javascript
// Confusing - pick one style
async function mixed() {
  const data = await fetch('/api')
    .then(r => r.json())
    .then(d => d.items);
  return data;
}

// Cleaner
async function clean() {
  const response = await fetch('/api');
  const data = await response.json();
  return data.items;
}
```
</details>

---

### Memory & Performance

#### 13. Memory Leaks
**Q: What causes memory leaks in JavaScript? How do you identify and fix them?**

<details>
<summary>Answer</summary>

**Common Causes:**

**1. Global Variables:**
```javascript
// Accidental global
function leak() {
  leakedVar = 'oops'; // No var/let/const - becomes global
}

// Fix: Use strict mode and always declare variables
'use strict';
function noLeak() {
  const localVar = 'safe';
}
```

**2. Forgotten Event Listeners:**
```javascript
// Leak: listener keeps component in memory
class Component {
  constructor() {
    window.addEventListener('resize', this.handleResize);
  }
  // No cleanup!
}

// Fix: Remove listeners
class Component {
  constructor() {
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
  }
  destroy() {
    window.removeEventListener('resize', this.handleResize);
  }
}
```

**3. Closures Holding References:**
```javascript
// Leak: closure keeps largeData alive
function createProcessor() {
  const largeData = new Array(1000000).fill('x');

  return function process() {
    // Even if largeData isn't used, it's in scope
    return 'processed';
  };
}

// Fix: Don't capture unnecessary variables
function createProcessor() {
  const largeData = new Array(1000000).fill('x');
  const result = processData(largeData);

  return function process() {
    return result; // Only capture what's needed
  };
}
```

**4. Detached DOM Nodes:**
```javascript
// Leak: removed element still referenced
const elements = [];
function addElement() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  elements.push(el); // Reference kept
  document.body.removeChild(el); // Removed from DOM but still in memory
}

// Fix: Clear references
function removeElement(index) {
  const el = elements[index];
  el.remove();
  elements.splice(index, 1); // Remove reference
}
```

**5. Timers:**
```javascript
// Leak: interval never cleared
function startPolling() {
  setInterval(() => {
    fetchData();
  }, 1000);
}

// Fix: Store and clear
let intervalId;
function startPolling() {
  intervalId = setInterval(() => fetchData(), 1000);
}
function stopPolling() {
  clearInterval(intervalId);
}
```

**Identifying Leaks:**
- Chrome DevTools Memory tab
- Heap snapshots (compare over time)
- Performance monitor
- Node.js: `process.memoryUsage()`, `--inspect` flag
</details>

---

#### 14. JavaScript Engine
**Q: Explain how JavaScript engines optimize code execution (V8 JIT compilation, hidden classes, inline caching).**

<details>
<summary>Answer</summary>

**JIT (Just-In-Time) Compilation:**

V8 uses multiple compilation tiers:
1. **Parser** → AST (Abstract Syntax Tree)
2. **Ignition** (Interpreter) → Bytecode (fast startup)
3. **TurboFan** (Optimizing Compiler) → Machine code (fast execution)

```javascript
// Cold code: interpreted
function add(a, b) { return a + b; }

// After many calls with same types: JIT compiled to optimized machine code
for (let i = 0; i < 10000; i++) {
  add(1, 2); // Becomes highly optimized
}
```

**Hidden Classes (Shapes/Maps):**

V8 creates internal "hidden classes" for object shapes:

```javascript
// Efficient: same shape, same hidden class
function Point(x, y) {
  this.x = x;
  this.y = y;
}
const p1 = new Point(1, 2);
const p2 = new Point(3, 4);
// Both share the same hidden class → fast property access

// Inefficient: different shapes
const obj1 = { a: 1, b: 2 };
const obj2 = { b: 2, a: 1 }; // Different hidden class!
```

**Best Practice:**
```javascript
// Always initialize properties in the same order
class User {
  constructor(name, age) {
    this.name = name;  // Always first
    this.age = age;    // Always second
  }
}

// Avoid adding properties later
const user = new User('John', 30);
user.email = 'j@j.com'; // Creates new hidden class - slow!
```

**Inline Caching:**

V8 caches property lookup locations:

```javascript
function getName(obj) {
  return obj.name; // IC remembers where 'name' is
}

// Monomorphic (one shape) - fastest
getName({ name: 'A' });
getName({ name: 'B' });

// Polymorphic (few shapes) - slower
getName({ name: 'A' });
getName({ name: 'B', age: 1 });

// Megamorphic (many shapes) - slowest, IC disabled
```

**Deoptimization Triggers:**
- Changing object shape after creation
- Using `delete` operator
- Using `arguments` object in certain ways
- try/catch in hot loops (improved in modern V8)
- Changing variable types
</details>

---

### ES6+ Features

#### 15. Destructuring & Spread
**Q: Explain destructuring and spread operators with advanced examples.**

<details>
<summary>Answer</summary>

**Destructuring - Arrays:**
```javascript
const [first, second, ...rest] = [1, 2, 3, 4, 5];
// first = 1, second = 2, rest = [3, 4, 5]

// Skipping elements
const [, , third] = [1, 2, 3];
// third = 3

// Default values
const [a = 10, b = 20] = [1];
// a = 1, b = 20

// Swapping
let x = 1, y = 2;
[x, y] = [y, x];
// x = 2, y = 1
```

**Destructuring - Objects:**
```javascript
const { name, age } = { name: 'John', age: 30 };

// Renaming
const { name: userName } = { name: 'John' };
// userName = 'John'

// Defaults with renaming
const { name: n = 'Anonymous' } = {};
// n = 'Anonymous'

// Nested destructuring
const { address: { city } } = {
  address: { city: 'NYC', zip: 10001 }
};
// city = 'NYC'

// Rest in objects
const { id, ...userData } = { id: 1, name: 'John', age: 30 };
// id = 1, userData = { name: 'John', age: 30 }
```

**Function Parameters:**
```javascript
// Object destructuring in params
function createUser({ name, age = 18, role = 'user' }) {
  return { name, age, role };
}

// With default empty object
function greet({ name = 'Guest' } = {}) {
  console.log(`Hello, ${name}`);
}
greet(); // "Hello, Guest"
```

**Spread Operator:**
```javascript
// Array spreading
const arr1 = [1, 2];
const arr2 = [...arr1, 3, 4]; // [1, 2, 3, 4]

// Object spreading (shallow copy)
const obj1 = { a: 1, b: 2 };
const obj2 = { ...obj1, c: 3 }; // { a: 1, b: 2, c: 3 }

// Override properties
const defaults = { theme: 'light', lang: 'en' };
const userSettings = { theme: 'dark' };
const settings = { ...defaults, ...userSettings };
// { theme: 'dark', lang: 'en' }

// Function arguments
const numbers = [1, 2, 3];
Math.max(...numbers); // 3
```

**Advanced Patterns:**
```javascript
// Conditional spreading
const config = {
  name: 'app',
  ...(process.env.DEBUG && { debug: true }),
};

// Deep clone (one level)
const clone = { ...obj, nested: { ...obj.nested } };

// Merging with transformation
const merged = Object.fromEntries(
  [...Object.entries(obj1), ...Object.entries(obj2)]
    .filter(([key]) => key !== 'excluded')
);
```
</details>

---

#### 16. Modules
**Q: Explain the differences between CommonJS and ES Modules. How does tree-shaking work?**

<details>
<summary>Answer</summary>

**CommonJS (CJS):**
```javascript
// Export
module.exports = { add, subtract };
// or
exports.add = function(a, b) { return a + b; };

// Import
const math = require('./math');
const { add } = require('./math');
```

**ES Modules (ESM):**
```javascript
// Named exports
export const add = (a, b) => a + b;
export function subtract(a, b) { return a - b; }

// Default export
export default class Calculator { }

// Import
import Calculator, { add, subtract } from './math.js';
import * as math from './math.js';
```

**Key Differences:**

| Feature | CommonJS | ES Modules |
|---------|----------|------------|
| Loading | Synchronous | Asynchronous |
| Evaluation | Runtime | Compile time (static) |
| Binding | Value copy | Live bindings |
| Top-level await | No | Yes (ES2022) |
| Tree-shaking | Limited | Full support |
| Browser support | No (needs bundler) | Yes (native) |

**Live Bindings Example:**
```javascript
// counter.js (ESM)
export let count = 0;
export function increment() { count++; }

// main.js
import { count, increment } from './counter.js';
console.log(count); // 0
increment();
console.log(count); // 1 (live binding!)

// With CommonJS, count would still be 0
```

**Tree-Shaking:**

Tree-shaking removes unused code during bundling. Works because ESM is statically analyzable:

```javascript
// utils.js
export function used() { return 'used'; }
export function unused() { return 'unused'; }

// main.js
import { used } from './utils.js';
console.log(used());

// After bundling with tree-shaking:
// 'unused' function is removed from final bundle
```

**Why CommonJS can't tree-shake well:**
```javascript
// Dynamic - can't analyze at build time
const module = require(condition ? './a' : './b');
const { [dynamicKey]: fn } = require('./utils');
```

**ESM in Node.js:**
- Use `.mjs` extension, or
- Set `"type": "module"` in package.json
- Import CJS: `import pkg from 'cjs-package'`
- Require ESM: Use dynamic `import()`
</details>

---

### Miscellaneous

#### 17. WeakMap/WeakSet
**Q: What are WeakMap and WeakSet? When would you use them?**

<details>
<summary>Answer</summary>

**WeakMap** and **WeakSet** hold "weak" references to objects, allowing garbage collection when no other references exist.

**WeakMap:**
```javascript
const weakMap = new WeakMap();

let obj = { data: 'secret' };
weakMap.set(obj, 'metadata');

console.log(weakMap.get(obj)); // 'metadata'

obj = null; // Object can now be garbage collected
// The entry in weakMap is automatically removed
```

**Key Differences from Map:**

| Feature | Map | WeakMap |
|---------|-----|---------|
| Key types | Any | Objects only |
| Enumerable | Yes (forEach, entries) | No |
| Size property | Yes | No |
| GC | Prevents | Allows |

**Use Cases:**

**1. Private Data:**
```javascript
const privateData = new WeakMap();

class User {
  constructor(name, password) {
    this.name = name;
    privateData.set(this, { password });
  }

  checkPassword(pw) {
    return privateData.get(this).password === pw;
  }
}

const user = new User('John', 'secret');
// No way to access password directly
// When user is GC'd, private data is too
```

**2. DOM Element Metadata:**
```javascript
const elementData = new WeakMap();

function trackElement(element, data) {
  elementData.set(element, data);
}

function getElementData(element) {
  return elementData.get(element);
}

// When element is removed from DOM and dereferenced,
// the metadata is automatically cleaned up
```

**3. Caching:**
```javascript
const cache = new WeakMap();

function expensiveOperation(obj) {
  if (cache.has(obj)) {
    return cache.get(obj);
  }

  const result = /* expensive computation */;
  cache.set(obj, result);
  return result;
}

// Cache entries are automatically cleaned when objects are GC'd
```

**WeakSet:**
```javascript
const visited = new WeakSet();

function visit(obj) {
  if (visited.has(obj)) {
    console.log('Already visited');
    return;
  }
  visited.add(obj);
  // Process object
}
```

**Important Limitations:**
- Cannot iterate (no forEach, keys, values, entries)
- Cannot check size
- Cannot clear()
- Only objects as keys (no primitives)
</details>

---

#### 18. Proxy and Reflect
**Q: Explain Proxy and Reflect in JavaScript. Provide practical examples.**

<details>
<summary>Answer</summary>

**Proxy** creates a wrapper that intercepts operations on an object.
**Reflect** provides methods for interceptable operations.

**Basic Syntax:**
```javascript
const proxy = new Proxy(target, handler);
```

**Common Traps:**

**1. Property Access (get/set):**
```javascript
const user = { name: 'John', _password: 'secret' };

const secureUser = new Proxy(user, {
  get(target, prop, receiver) {
    if (prop.startsWith('_')) {
      throw new Error('Access denied');
    }
    return Reflect.get(target, prop, receiver);
  },

  set(target, prop, value, receiver) {
    if (prop.startsWith('_')) {
      throw new Error('Cannot modify private property');
    }
    return Reflect.set(target, prop, value, receiver);
  }
});

console.log(secureUser.name);     // 'John'
console.log(secureUser._password); // Error!
```

**2. Validation:**
```javascript
const validator = {
  set(target, prop, value) {
    if (prop === 'age' && typeof value !== 'number') {
      throw new TypeError('Age must be a number');
    }
    if (prop === 'age' && value < 0) {
      throw new RangeError('Age must be positive');
    }
    target[prop] = value;
    return true;
  }
};

const person = new Proxy({}, validator);
person.age = 25;  // OK
person.age = -1;  // RangeError!
```

**3. Observable/Reactive:**
```javascript
function reactive(obj, onChange) {
  return new Proxy(obj, {
    set(target, prop, value) {
      const oldValue = target[prop];
      target[prop] = value;
      onChange(prop, value, oldValue);
      return true;
    }
  });
}

const state = reactive({ count: 0 }, (prop, newVal, oldVal) => {
  console.log(`${prop} changed: ${oldVal} → ${newVal}`);
});

state.count = 1; // "count changed: 0 → 1"
```

**4. Default Values:**
```javascript
const withDefaults = (target, defaults) => new Proxy(target, {
  get(obj, prop) {
    return prop in obj ? obj[prop] : defaults[prop];
  }
});

const config = withDefaults({}, { port: 3000, host: 'localhost' });
console.log(config.port); // 3000
config.port = 8080;
console.log(config.port); // 8080
```

**5. Logging/Debugging:**
```javascript
function createLogger(obj, name) {
  return new Proxy(obj, {
    get(target, prop) {
      console.log(`GET ${name}.${String(prop)}`);
      return target[prop];
    },
    set(target, prop, value) {
      console.log(`SET ${name}.${String(prop)} = ${value}`);
      target[prop] = value;
      return true;
    }
  });
}
```

**Why use Reflect?**
- Returns boolean for success/failure (vs throwing)
- Same method names as Proxy traps
- Proper `this` handling with receiver
- Future-proof for new operations

```javascript
// Without Reflect (can throw)
target[prop] = value;

// With Reflect (returns boolean)
const success = Reflect.set(target, prop, value, receiver);
```

**All Proxy Traps:**
- get, set, has, deleteProperty
- getOwnPropertyDescriptor, defineProperty
- ownKeys, getPrototypeOf, setPrototypeOf
- isExtensible, preventExtensions
- apply (for functions), construct (for new)
</details>

---

#### 19. Symbol
**Q: What are Symbols in JavaScript? Explain well-known Symbols.**

<details>
<summary>Answer</summary>

**Symbol** is a primitive type that creates unique identifiers:

```javascript
const sym1 = Symbol('description');
const sym2 = Symbol('description');

console.log(sym1 === sym2); // false - always unique

// Use as object keys
const ID = Symbol('id');
const user = {
  name: 'John',
  [ID]: 123
};

console.log(user[ID]); // 123
console.log(Object.keys(user)); // ['name'] - symbols not included
```

**Use Cases:**

**1. Private-like Properties:**
```javascript
const _private = Symbol('private');

class MyClass {
  constructor() {
    this[_private] = 'hidden';
  }

  getPrivate() {
    return this[_private];
  }
}
```

**2. Avoid Name Collisions:**
```javascript
// Library A
const libAKey = Symbol('key');
obj[libAKey] = 'A';

// Library B - no collision
const libBKey = Symbol('key');
obj[libBKey] = 'B';
```

**Global Symbol Registry:**
```javascript
const globalSym = Symbol.for('app.global');
const sameSym = Symbol.for('app.global');

console.log(globalSym === sameSym); // true

console.log(Symbol.keyFor(globalSym)); // 'app.global'
```

**Well-Known Symbols:**

**Symbol.iterator:**
```javascript
const range = {
  start: 1,
  end: 5,
  [Symbol.iterator]() {
    let current = this.start;
    const end = this.end;
    return {
      next() {
        if (current <= end) {
          return { value: current++, done: false };
        }
        return { done: true };
      }
    };
  }
};

for (const num of range) {
  console.log(num); // 1, 2, 3, 4, 5
}
```

**Symbol.toStringTag:**
```javascript
class MyClass {
  get [Symbol.toStringTag]() {
    return 'MyClass';
  }
}

console.log(Object.prototype.toString.call(new MyClass()));
// '[object MyClass]'
```

**Symbol.toPrimitive:**
```javascript
const money = {
  amount: 100,
  currency: 'USD',
  [Symbol.toPrimitive](hint) {
    if (hint === 'number') return this.amount;
    if (hint === 'string') return `${this.amount} ${this.currency}`;
    return this.amount;
  }
};

console.log(+money);     // 100
console.log(`${money}`); // '100 USD'
```

**Other Well-Known Symbols:**
- `Symbol.hasInstance` - customize instanceof
- `Symbol.species` - constructor for derived objects
- `Symbol.match/replace/search/split` - string methods
- `Symbol.asyncIterator` - for-await-of support
</details>

---

#### 20. Generators
**Q: Explain generators and iterators. Provide practical use cases.**

<details>
<summary>Answer</summary>

**Generators** are functions that can pause and resume, yielding multiple values:

```javascript
function* numberGenerator() {
  yield 1;
  yield 2;
  yield 3;
}

const gen = numberGenerator();
console.log(gen.next()); // { value: 1, done: false }
console.log(gen.next()); // { value: 2, done: false }
console.log(gen.next()); // { value: 3, done: false }
console.log(gen.next()); // { value: undefined, done: true }

// Iterable
for (const num of numberGenerator()) {
  console.log(num); // 1, 2, 3
}
```

**Two-Way Communication:**
```javascript
function* conversation() {
  const name = yield 'What is your name?';
  const age = yield `Hello ${name}! How old are you?`;
  return `${name} is ${age} years old`;
}

const chat = conversation();
console.log(chat.next().value);      // 'What is your name?'
console.log(chat.next('John').value); // 'Hello John! How old are you?'
console.log(chat.next(30).value);     // 'John is 30 years old'
```

**Practical Use Cases:**

**1. Infinite Sequences:**
```javascript
function* idGenerator() {
  let id = 1;
  while (true) {
    yield id++;
  }
}

const getId = idGenerator();
console.log(getId.next().value); // 1
console.log(getId.next().value); // 2
// Never runs out!
```

**2. Pagination:**
```javascript
async function* fetchPages(url) {
  let page = 1;
  while (true) {
    const response = await fetch(`${url}?page=${page}`);
    const data = await response.json();

    if (data.items.length === 0) return;

    yield data.items;
    page++;
  }
}

// Usage
for await (const items of fetchPages('/api/users')) {
  console.log(items);
}
```

**3. Tree Traversal:**
```javascript
function* traverse(node) {
  yield node.value;
  for (const child of node.children || []) {
    yield* traverse(child); // Delegate to another generator
  }
}

const tree = {
  value: 1,
  children: [
    { value: 2, children: [{ value: 4 }, { value: 5 }] },
    { value: 3 }
  ]
};

console.log([...traverse(tree)]); // [1, 2, 4, 5, 3]
```

**4. Controlled Iteration:**
```javascript
function* controlledLoop(items) {
  for (const item of items) {
    const command = yield item;
    if (command === 'skip') continue;
    if (command === 'stop') return;
    // Process item
  }
}
```

**5. State Machine:**
```javascript
function* trafficLight() {
  while (true) {
    yield 'green';
    yield 'yellow';
    yield 'red';
  }
}

const light = trafficLight();
console.log(light.next().value); // green
console.log(light.next().value); // yellow
console.log(light.next().value); // red
console.log(light.next().value); // green (cycles)
```

**Error Handling:**
```javascript
function* errorDemo() {
  try {
    yield 1;
    yield 2;
  } catch (e) {
    console.log('Caught:', e);
  }
}

const gen = errorDemo();
gen.next();
gen.throw(new Error('Oops!')); // 'Caught: Error: Oops!'
```

**Generator Delegation (yield*):**
```javascript
function* inner() {
  yield 'a';
  yield 'b';
}

function* outer() {
  yield 1;
  yield* inner(); // Delegates
  yield 2;
}

console.log([...outer()]); // [1, 'a', 'b', 2]
```
</details>

---

## Quick Reference: Output Predictions

### What does this output?

```javascript
// 1.
console.log(typeof null);
// Answer: "object" (historical bug)

// 2.
console.log(0.1 + 0.2 === 0.3);
// Answer: false (floating point precision)

// 3.
console.log([1, 2, 3] + [4, 5, 6]);
// Answer: "1,2,34,5,6" (arrays converted to strings)

// 4.
console.log([] == ![]);
// Answer: true (type coercion madness)

// 5.
console.log('b' + 'a' + + 'a' + 'a');
// Answer: "baNaNa" (+'a' is NaN)

// 6.
console.log(!!'false' == !!'true');
// Answer: true (both are truthy strings)

// 7.
const a = {};
const b = { key: 'b' };
const c = { key: 'c' };
a[b] = 123;
a[c] = 456;
console.log(a[b]);
// Answer: 456 (objects as keys become "[object Object]")

// 8.
let x = 1;
let y = x++;
console.log(x, y);
// Answer: 2, 1

// 9.
console.log(1 < 2 < 3);
console.log(3 > 2 > 1);
// Answer: true, false
// (1 < 2) = true = 1, 1 < 3 = true
// (3 > 2) = true = 1, 1 > 1 = false

// 10.
const arr = [1, 2, 3];
arr[10] = 11;
console.log(arr.length);
// Answer: 11 (sparse array)
```
