# Redis Complete Guide - Unlock Full Potential

A comprehensive guide to mastering Redis for your Node.js/TypeScript application.

## Table of Contents

1. [Redis Fundamentals](#redis-fundamentals)
2. [Data Structures Deep Dive](#data-structures-deep-dive)
3. [Advanced Commands & Patterns](#advanced-commands--patterns)
4. [Caching Strategies](#caching-strategies)
5. [Performance Optimization](#performance-optimization)
6. [Best Practices](#best-practices)
7. [Implementation Examples](#implementation-examples)

---

## Redis Fundamentals

### What Makes Redis Powerful?

Redis is an **in-memory data structure store** that can be used as:
- **Cache** - Store frequently accessed data
- **Database** - Persist data with various durability options
- **Message Broker** - Pub/Sub and Streams for real-time messaging
- **Session Store** - Fast session management
- **Rate Limiter** - Control API request rates
- **Leaderboard** - Sorted sets for rankings
- **Queue** - Lists and Streams for job processing

### Key Characteristics

| Feature | Description |
|---------|-------------|
| Speed | ~100,000 operations/second on single thread |
| Persistence | RDB snapshots + AOF (Append Only File) |
| Replication | Master-Replica architecture |
| Clustering | Horizontal scaling with automatic sharding |
| Atomicity | All operations are atomic |
| Lua Scripting | Server-side scripts for complex operations |

---

## Data Structures Deep Dive

### 1. Strings

The most basic Redis data type. Can store text, integers, floats, or binary data (up to 512MB).

```typescript
// Basic Operations
await redis.set('user:123:name', 'John Doe');
await redis.get('user:123:name'); // "John Doe"

// With Expiration (TTL)
await redis.set('session:abc', 'user_data', 'EX', 3600); // Expires in 1 hour
await redis.setex('session:abc', 3600, 'user_data'); // Alternative syntax

// Conditional Set
await redis.setnx('lock:resource', '1'); // Set only if not exists (returns 1 or 0)
await redis.set('key', 'value', 'NX'); // Same as setnx
await redis.set('key', 'value', 'XX'); // Set only if exists

// Atomic Increment/Decrement (for counters)
await redis.incr('page:views'); // Increment by 1
await redis.incrby('page:views', 10); // Increment by 10
await redis.incrbyfloat('rating', 0.5); // Increment by float
await redis.decr('stock:item123'); // Decrement by 1

// Multiple Keys
await redis.mset('key1', 'val1', 'key2', 'val2', 'key3', 'val3');
await redis.mget('key1', 'key2', 'key3'); // ["val1", "val2", "val3"]

// String Manipulation
await redis.append('greeting', ' World'); // Append to existing string
await redis.strlen('greeting'); // Get string length
await redis.getrange('greeting', 0, 4); // Substring: "Hello"
await redis.setrange('greeting', 6, 'Redis'); // Replace at offset
```

**Use Cases:**
- Session tokens
- Page view counters
- Rate limiting counters
- Simple key-value caching
- Distributed locks

---

### 2. Hashes

Perfect for storing objects with multiple fields. More memory-efficient than storing JSON strings.

```typescript
// Set Fields
await redis.hset('user:123', 'name', 'John', 'email', 'john@example.com', 'age', '30');
await redis.hset('user:123', { name: 'John', email: 'john@example.com', age: 30 });

// Get Fields
await redis.hget('user:123', 'name'); // "John"
await redis.hmget('user:123', 'name', 'email'); // ["John", "john@example.com"]
await redis.hgetall('user:123'); // { name: "John", email: "john@example.com", age: "30" }

// Check Existence
await redis.hexists('user:123', 'name'); // 1 (exists) or 0

// Get All Keys/Values
await redis.hkeys('user:123'); // ["name", "email", "age"]
await redis.hvals('user:123'); // ["John", "john@example.com", "30"]
await redis.hlen('user:123'); // 3 (number of fields)

// Delete Fields
await redis.hdel('user:123', 'age');

// Atomic Increment on Hash Field
await redis.hincrby('user:123', 'loginCount', 1);
await redis.hincrbyfloat('product:123', 'rating', 0.1);

// Set Only If Not Exists
await redis.hsetnx('user:123', 'created', Date.now().toString());

// Scan Hash (for large hashes)
const [cursor, fields] = await redis.hscan('user:123', 0, 'COUNT', 100);
```

**Use Cases:**
- User profiles
- Product details
- Configuration settings
- Session data with multiple attributes
- Object caching (better than JSON strings)

---

### 3. Lists

Ordered collection of strings. Supports operations from both ends (double-ended queue).

```typescript
// Add Elements
await redis.lpush('queue:jobs', 'job3', 'job2', 'job1'); // Add to left (head)
await redis.rpush('queue:jobs', 'job4', 'job5'); // Add to right (tail)
// Result: [job1, job2, job3, job4, job5]

// Remove & Get Elements
await redis.lpop('queue:jobs'); // Remove & return from left: "job1"
await redis.rpop('queue:jobs'); // Remove & return from right: "job5"
await redis.lpop('queue:jobs', 2); // Pop multiple: ["job2", "job3"]

// Blocking Pop (for job queues)
await redis.blpop('queue:jobs', 30); // Block up to 30 seconds until element available
await redis.brpop('queue:jobs', 30);

// Access by Index
await redis.lindex('queue:jobs', 0); // Get first element
await redis.lindex('queue:jobs', -1); // Get last element
await redis.lrange('queue:jobs', 0, -1); // Get all elements
await redis.lrange('queue:jobs', 0, 9); // Get first 10 elements

// Modify List
await redis.lset('queue:jobs', 0, 'updated_job'); // Update element at index
await redis.linsert('queue:jobs', 'BEFORE', 'job3', 'job2.5'); // Insert before
await redis.linsert('queue:jobs', 'AFTER', 'job3', 'job3.5'); // Insert after

// List Info
await redis.llen('queue:jobs'); // Get list length

// Trim List (keep only specified range)
await redis.ltrim('queue:jobs', 0, 99); // Keep only first 100 elements

// Remove by Value
await redis.lrem('queue:jobs', 2, 'duplicate'); // Remove 2 occurrences from head
await redis.lrem('queue:jobs', -2, 'duplicate'); // Remove 2 occurrences from tail
await redis.lrem('queue:jobs', 0, 'duplicate'); // Remove all occurrences

// Move Between Lists (atomic)
await redis.lmove('source', 'dest', 'LEFT', 'RIGHT'); // Pop from source left, push to dest right
await redis.blmove('source', 'dest', 'LEFT', 'RIGHT', 30); // Blocking version
```

**Use Cases:**
- Job queues (FIFO/LIFO)
- Activity feeds
- Recent items (with LTRIM for capping)
- Message queues
- Undo/Redo stacks

---

### 4. Sets

Unordered collection of unique strings. Fast membership testing and set operations.

```typescript
// Add Members
await redis.sadd('tags:story:123', 'fantasy', 'adventure', 'magic');

// Remove Members
await redis.srem('tags:story:123', 'magic');

// Check Membership
await redis.sismember('tags:story:123', 'fantasy'); // 1 (true) or 0 (false)
await redis.smismember('tags:story:123', 'fantasy', 'scifi'); // [1, 0]

// Get All Members
await redis.smembers('tags:story:123'); // ["fantasy", "adventure"]

// Set Info
await redis.scard('tags:story:123'); // Get set size (cardinality)

// Random Elements
await redis.srandmember('tags:story:123'); // Get random member (doesn't remove)
await redis.srandmember('tags:story:123', 3); // Get 3 random members
await redis.spop('tags:story:123'); // Remove and return random member

// Set Operations
await redis.sunion('set1', 'set2'); // Union of sets
await redis.sinter('set1', 'set2'); // Intersection of sets
await redis.sdiff('set1', 'set2'); // Difference (set1 - set2)

// Store Results of Set Operations
await redis.sunionstore('result', 'set1', 'set2'); // Store union in 'result'
await redis.sinterstore('result', 'set1', 'set2'); // Store intersection
await redis.sdiffstore('result', 'set1', 'set2'); // Store difference

// Move Member Between Sets
await redis.smove('source', 'dest', 'member');

// Scan Set (for large sets)
const [cursor, members] = await redis.sscan('tags:story:123', 0, 'MATCH', 'fan*', 'COUNT', 100);
```

**Use Cases:**
- Tags/Categories
- Unique visitors tracking
- Friend lists
- Online users
- Shared interests (using intersection)
- Recommendation systems

---

### 5. Sorted Sets (ZSets)

Like Sets but each member has a score. Automatically sorted by score.

```typescript
// Add Members with Scores
await redis.zadd('leaderboard', 100, 'player1', 200, 'player2', 150, 'player3');
// Or with options:
await redis.zadd('leaderboard', 'NX', 100, 'player4'); // Only add new members
await redis.zadd('leaderboard', 'XX', 250, 'player2'); // Only update existing
await redis.zadd('leaderboard', 'GT', 300, 'player2'); // Only update if new score > current

// Get Score
await redis.zscore('leaderboard', 'player1'); // "100"

// Get Rank (0-based, ascending)
await redis.zrank('leaderboard', 'player1'); // Position from lowest score
await redis.zrevrank('leaderboard', 'player1'); // Position from highest score

// Range Queries
await redis.zrange('leaderboard', 0, -1); // All members (ascending)
await redis.zrange('leaderboard', 0, 9); // Top 10 by score (ascending)
await redis.zrevrange('leaderboard', 0, 9); // Top 10 by score (descending)
await redis.zrange('leaderboard', 0, 9, 'WITHSCORES'); // Include scores

// Range by Score
await redis.zrangebyscore('leaderboard', 100, 200); // Members with score 100-200
await redis.zrangebyscore('leaderboard', '-inf', '+inf'); // All (by score)
await redis.zrangebyscore('leaderboard', 100, 200, 'WITHSCORES', 'LIMIT', 0, 10);

// Count by Score Range
await redis.zcount('leaderboard', 100, 200); // Count members in score range

// Increment Score
await redis.zincrby('leaderboard', 50, 'player1'); // Add 50 to player1's score

// Remove Members
await redis.zrem('leaderboard', 'player1');
await redis.zremrangebyrank('leaderboard', 0, 10); // Remove by rank range
await redis.zremrangebyscore('leaderboard', 0, 100); // Remove by score range

// Set Info
await redis.zcard('leaderboard'); // Total members

// Set Operations
await redis.zunionstore('combined', 2, 'set1', 'set2', 'WEIGHTS', 1, 2); // Weighted union
await redis.zinterstore('common', 2, 'set1', 'set2'); // Intersection

// Scan Sorted Set
const [cursor, members] = await redis.zscan('leaderboard', 0, 'COUNT', 100);
```

**Use Cases:**
- Leaderboards/Rankings
- Priority queues
- Time-based data (score = timestamp)
- Rate limiting (sliding window)
- Trending content (score = engagement)
- Autocomplete (score = frequency)

---

### 6. Streams

Append-only log data structure. Perfect for event sourcing and message queues.

```typescript
// Add Entry to Stream
const entryId = await redis.xadd('events', '*', 'action', 'click', 'user', '123');
// '*' = auto-generate ID (timestamp-based)
// Returns: "1234567890123-0"

// Add with Max Length (capping)
await redis.xadd('events', 'MAXLEN', '~', 1000, '*', 'action', 'click');

// Read Entries
await redis.xrange('events', '-', '+'); // All entries
await redis.xrange('events', '-', '+', 'COUNT', 10); // First 10
await redis.xrevrange('events', '+', '-', 'COUNT', 10); // Last 10

// Read from ID
await redis.xrange('events', '1234567890123-0', '+'); // From specific ID onwards

// Blocking Read (for consumers)
await redis.xread('BLOCK', 5000, 'STREAMS', 'events', '$'); // Wait for new entries
await redis.xread('BLOCK', 0, 'STREAMS', 'events', '0'); // Read all, then wait

// Stream Info
await redis.xlen('events'); // Number of entries
await redis.xinfo('STREAM', 'events'); // Stream metadata

// Consumer Groups (for distributed processing)
await redis.xgroup('CREATE', 'events', 'mygroup', '$', 'MKSTREAM'); // Create group

// Read as Consumer
await redis.xreadgroup(
  'GROUP', 'mygroup', 'consumer1',
  'COUNT', 10,
  'BLOCK', 5000,
  'STREAMS', 'events', '>'
);

// Acknowledge Processed Entry
await redis.xack('events', 'mygroup', '1234567890123-0');

// Delete Entry
await redis.xdel('events', '1234567890123-0');

// Trim Stream
await redis.xtrim('events', 'MAXLEN', 1000);
```

**Use Cases:**
- Event sourcing
- Activity streams
- Notification systems
- Real-time analytics
- Chat messages
- Audit logs
- IoT data ingestion

---

### 7. HyperLogLog

Probabilistic data structure for cardinality estimation (count unique items).

```typescript
// Add Elements
await redis.pfadd('unique:visitors:2024-01', 'user1', 'user2', 'user3');

// Get Approximate Count
await redis.pfcount('unique:visitors:2024-01'); // ~3

// Merge Multiple HyperLogLogs
await redis.pfmerge('unique:visitors:2024-q1',
  'unique:visitors:2024-01',
  'unique:visitors:2024-02',
  'unique:visitors:2024-03'
);
```

**Use Cases:**
- Unique visitor counting
- Unique search queries
- Unique events tracking
- Memory-efficient cardinality (12KB max per key)

---

### 8. Bitmaps

Bit-level operations on strings. Extremely memory-efficient for boolean data.

```typescript
// Set Bit
await redis.setbit('user:123:logins', 0, 1); // Day 0 = logged in
await redis.setbit('user:123:logins', 5, 1); // Day 5 = logged in

// Get Bit
await redis.getbit('user:123:logins', 0); // 1
await redis.getbit('user:123:logins', 1); // 0

// Count Set Bits
await redis.bitcount('user:123:logins'); // Total login days
await redis.bitcount('user:123:logins', 0, 6); // Login count in byte range

// Bit Operations
await redis.bitop('AND', 'active_both', 'user:123:logins', 'user:456:logins');
await redis.bitop('OR', 'active_either', 'user:123:logins', 'user:456:logins');

// Find First Set/Unset Bit
await redis.bitpos('user:123:logins', 1); // First login day
await redis.bitpos('user:123:logins', 0); // First non-login day
```

**Use Cases:**
- Daily active users
- Feature flags
- User permissions
- Bloom filters (custom implementation)
- Real-time analytics

---

### 9. Geospatial

Store and query geographic coordinates.

```typescript
// Add Locations
await redis.geoadd('locations',
  -122.4194, 37.7749, 'San Francisco',
  -73.9857, 40.7484, 'New York',
  -0.1276, 51.5074, 'London'
);

// Get Coordinates
await redis.geopos('locations', 'San Francisco'); // [["-122.4194", "37.7749"]]

// Distance Between Points
await redis.geodist('locations', 'San Francisco', 'New York', 'km'); // ~4129 km

// Find Nearby (radius search)
await redis.georadius('locations', -122.4, 37.8, 50, 'km', 'WITHDIST', 'ASC');
// Returns locations within 50km with distances, sorted by nearest

// Search by Member
await redis.georadiusbymember('locations', 'San Francisco', 100, 'km');

// Geohash
await redis.geohash('locations', 'San Francisco'); // ["9q8yyk8yutp"]
```

**Use Cases:**
- Store locators
- Nearby search
- Delivery tracking
- Location-based features
- Geofencing

---

## Advanced Commands & Patterns

### Transactions (MULTI/EXEC)

Execute multiple commands atomically.

```typescript
// Using pipeline with transaction
const pipeline = redis.multi();
pipeline.set('key1', 'value1');
pipeline.incr('counter');
pipeline.hset('hash', 'field', 'value');
const results = await pipeline.exec();
// results = [[null, 'OK'], [null, 1], [null, 1]]

// With watch (optimistic locking)
await redis.watch('balance');
const balance = await redis.get('balance');
if (parseInt(balance || '0') >= 100) {
  const multi = redis.multi();
  multi.decrby('balance', 100);
  multi.rpush('purchases', 'item123');
  await multi.exec(); // Returns null if balance changed during transaction
}
await redis.unwatch();
```

### Pipelining

Send multiple commands without waiting for responses.

```typescript
// Pipeline (no transaction, just batching)
const pipeline = redis.pipeline();
pipeline.get('key1');
pipeline.get('key2');
pipeline.get('key3');
pipeline.hgetall('user:123');
const results = await pipeline.exec();

// Much faster than individual calls for bulk operations
for (let i = 0; i < 1000; i++) {
  pipeline.set(`key:${i}`, `value:${i}`);
}
await pipeline.exec();
```

### Lua Scripting

Execute complex operations atomically on server.

```typescript
// Define script
const script = `
  local current = redis.call('GET', KEYS[1])
  if current and tonumber(current) >= tonumber(ARGV[1]) then
    redis.call('DECRBY', KEYS[1], ARGV[1])
    return 1
  end
  return 0
`;

// Execute script
const result = await redis.eval(script, 1, 'balance', '100');

// Cache script for reuse
const sha = await redis.script('LOAD', script);
await redis.evalsha(sha, 1, 'balance', '100');

// Rate Limiting Script Example
const rateLimitScript = `
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])

  local current = redis.call('INCR', key)
  if current == 1 then
    redis.call('EXPIRE', key, window)
  end

  if current > limit then
    return 0
  end
  return 1
`;
```

### Pub/Sub

Real-time messaging between publishers and subscribers.

```typescript
// Subscriber
const subscriber = redis.duplicate();
await subscriber.subscribe('notifications', 'alerts');

subscriber.on('message', (channel, message) => {
  console.log(`${channel}: ${message}`);
});

// Pattern Subscribe
await subscriber.psubscribe('user:*:events');
subscriber.on('pmessage', (pattern, channel, message) => {
  console.log(`${pattern} -> ${channel}: ${message}`);
});

// Publisher
await redis.publish('notifications', JSON.stringify({ type: 'new_message', id: 123 }));

// Unsubscribe
await subscriber.unsubscribe('notifications');
```

### Key Expiration & TTL

```typescript
// Set Expiration
await redis.expire('session:123', 3600); // 1 hour in seconds
await redis.pexpire('session:123', 3600000); // 1 hour in milliseconds
await redis.expireat('session:123', Math.floor(Date.now() / 1000) + 3600); // Unix timestamp

// Check TTL
await redis.ttl('session:123'); // Seconds remaining (-1 = no expiry, -2 = doesn't exist)
await redis.pttl('session:123'); // Milliseconds remaining

// Remove Expiration
await redis.persist('session:123');

// Get with Expiration Refresh (useful for sessions)
const value = await redis.getex('session:123', 'EX', 3600); // Get and refresh TTL
```

### Scanning Keys

Iterate over keys without blocking (unlike KEYS command).

```typescript
// Never use in production: await redis.keys('user:*'); // Blocks Redis!

// Use SCAN instead
let cursor = '0';
const allKeys: string[] = [];

do {
  const [newCursor, keys] = await redis.scan(cursor, 'MATCH', 'user:*', 'COUNT', 100);
  cursor = newCursor;
  allKeys.push(...keys);
} while (cursor !== '0');

// Scan with type filter (Redis 6.0+)
await redis.scan(0, 'MATCH', '*', 'TYPE', 'hash', 'COUNT', 100);
```

---

## Caching Strategies

### 1. Cache-Aside (Lazy Loading)

Most common pattern. Application manages cache.

```typescript
async function getStoryOverview(slug: string): Promise<StoryOverview> {
  const cacheKey = `story:overview:${slug}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Cache miss - fetch from database
  const story = await storyRepository.findBySlug(slug);

  // Store in cache
  await redis.set(cacheKey, JSON.stringify(story), 'EX', 600); // 10 min TTL

  return story;
}
```

**Pros:** Only caches requested data, cache miss doesn't fail request
**Cons:** Initial request is slower, potential for stale data

### 2. Write-Through

Update cache when writing to database.

```typescript
async function updateStory(slug: string, data: UpdateStoryDto): Promise<Story> {
  // Update database
  const story = await storyRepository.update(slug, data);

  // Update cache immediately
  await redis.set(`story:overview:${slug}`, JSON.stringify(story), 'EX', 600);

  return story;
}
```

**Pros:** Cache always consistent with database
**Cons:** Write latency increased, may cache unused data

### 3. Write-Behind (Write-Back)

Write to cache immediately, sync to database asynchronously.

```typescript
async function updateStory(slug: string, data: UpdateStoryDto): Promise<void> {
  // Update cache immediately
  await redis.set(`story:pending:${slug}`, JSON.stringify(data));

  // Queue database write
  await queue.add('sync-story', { slug, data });
}

// Worker processes queue
async function syncStoryWorker(job) {
  const { slug, data } = job.data;
  await storyRepository.update(slug, data);
  await redis.del(`story:pending:${slug}`);
}
```

**Pros:** Very fast writes, batch database operations
**Cons:** Risk of data loss, complexity in handling failures

### 4. Refresh-Ahead

Proactively refresh cache before expiration.

```typescript
async function getStoryOverview(slug: string): Promise<StoryOverview> {
  const cacheKey = `story:overview:${slug}`;

  const cached = await redis.get(cacheKey);
  const ttl = await redis.ttl(cacheKey);

  // If TTL is low, refresh in background
  if (cached && ttl < 60) { // Less than 1 minute left
    refreshCacheInBackground(slug).catch(console.error);
  }

  if (cached) {
    return JSON.parse(cached);
  }

  return fetchAndCacheStory(slug);
}

async function refreshCacheInBackground(slug: string): Promise<void> {
  const lockKey = `lock:refresh:${slug}`;
  const acquired = await redis.set(lockKey, '1', 'EX', 30, 'NX');

  if (acquired) {
    try {
      await fetchAndCacheStory(slug);
    } finally {
      await redis.del(lockKey);
    }
  }
}
```

**Pros:** Consistent low latency, fresh data
**Cons:** More complex, may refresh unused data

---

## Performance Optimization

### Connection Pooling

```typescript
import Redis from 'ioredis';

// Single connection (good for most cases)
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  },
});

// Cluster mode
const cluster = new Redis.Cluster([
  { host: 'node1', port: 6379 },
  { host: 'node2', port: 6379 },
  { host: 'node3', port: 6379 },
]);
```

### Memory Optimization

```typescript
// Use Hashes for small objects (more memory efficient than JSON strings)
// Instead of:
await redis.set('user:123', JSON.stringify({ name: 'John', age: 30 }));

// Use:
await redis.hset('user:123', 'name', 'John', 'age', '30');

// Use short key names in production
// Instead of: user:profile:preferences:notifications:email
// Use: u:123:pref:notif:email

// Set maxmemory and eviction policy
// In redis.conf:
// maxmemory 2gb
// maxmemory-policy allkeys-lru
```

### Key Design Patterns

```typescript
// Use colons as separators (convention)
const key = `${type}:${id}:${subtype}`;

// Examples:
'user:123:profile'
'story:456:overview'
'story:456:stats'
'cache:story:overview:my-story-slug'

// Add version for cache busting
'v2:story:overview:my-story-slug'

// Use tags for bulk invalidation patterns
'story:overview:{slug}'
'story:{storyId}:chapters'
```

### Batch Operations

```typescript
// Bad - Multiple round trips
for (const id of userIds) {
  const user = await redis.get(`user:${id}`);
  users.push(JSON.parse(user));
}

// Good - Single round trip
const keys = userIds.map(id => `user:${id}`);
const values = await redis.mget(...keys);
const users = values.map(v => v ? JSON.parse(v) : null);

// Even better - Pipeline
const pipeline = redis.pipeline();
userIds.forEach(id => pipeline.hgetall(`user:${id}`));
const results = await pipeline.exec();
```

---

## Best Practices

### 1. Key Naming Conventions

```typescript
// Pattern: <prefix>:<entity>:<id>:<attribute>
const patterns = {
  userProfile: 'user:{userId}:profile',
  storyOverview: 'story:overview:{slug}',
  storyChapters: 'story:{storyId}:chapters',
  userBookmarks: 'user:{userId}:bookmarks',
  sessionData: 'session:{sessionId}',
  rateLimit: 'ratelimit:{ip}:{endpoint}',
  lock: 'lock:{resource}:{id}',
};
```

### 2. TTL Strategy

```typescript
const TTL = {
  // Frequently changing data
  realtime: 30,           // 30 seconds

  // Moderately changing data
  shortTerm: 300,         // 5 minutes

  // Slowly changing data
  mediumTerm: 3600,       // 1 hour

  // Rarely changing data
  longTerm: 86400,        // 24 hours

  // Static data
  static: 604800,         // 7 days

  // Sessions
  session: 86400,         // 24 hours

  // Rate limiting windows
  rateLimit: 60,          // 1 minute
};
```

### 3. Error Handling

```typescript
class CacheService {
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      // Log error but don't fail - cache is optional
      this.logger.error('Cache get failed', { key, error });
      return null;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.redis.set(key, serialized, 'EX', ttl);
      } else {
        await this.redis.set(key, serialized);
      }
      return true;
    } catch (error) {
      this.logger.error('Cache set failed', { key, error });
      return false;
    }
  }
}
```

### 4. Cache Invalidation Patterns

```typescript
// Direct invalidation
await redis.del('story:overview:my-story');

// Pattern-based invalidation (use with caution)
const keys = await scanKeys('story:*:my-story-id:*');
if (keys.length > 0) {
  await redis.del(...keys);
}

// Tag-based invalidation using Sets
async function addToCache(key: string, value: unknown, tags: string[]): Promise<void> {
  const pipeline = redis.pipeline();
  pipeline.set(key, JSON.stringify(value), 'EX', 3600);

  // Add key to each tag's set
  for (const tag of tags) {
    pipeline.sadd(`tag:${tag}`, key);
  }

  await pipeline.exec();
}

async function invalidateByTag(tag: string): Promise<void> {
  const keys = await redis.smembers(`tag:${tag}`);
  if (keys.length > 0) {
    const pipeline = redis.pipeline();
    pipeline.del(...keys);
    pipeline.del(`tag:${tag}`);
    await pipeline.exec();
  }
}

// Usage
await addToCache('story:overview:my-story', storyData, ['story:123', 'user:456']);
await invalidateByTag('story:123'); // Invalidates all caches related to story 123
```

### 5. Distributed Locking

```typescript
async function acquireLock(
  resource: string,
  ttl: number = 10000
): Promise<string | null> {
  const lockId = crypto.randomUUID();
  const acquired = await redis.set(
    `lock:${resource}`,
    lockId,
    'PX', ttl,
    'NX'
  );
  return acquired ? lockId : null;
}

async function releaseLock(resource: string, lockId: string): Promise<boolean> {
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  const result = await redis.eval(script, 1, `lock:${resource}`, lockId);
  return result === 1;
}

// Usage
async function criticalOperation(storyId: string): Promise<void> {
  const lockId = await acquireLock(`story:${storyId}`);
  if (!lockId) {
    throw new Error('Could not acquire lock');
  }

  try {
    // Perform critical operation
    await updateStoryStats(storyId);
  } finally {
    await releaseLock(`story:${storyId}`, lockId);
  }
}
```

---

## Implementation Examples

### Complete Cache Service

```typescript
// src/shared/services/cache.service.ts
import { injectable, inject } from 'tsyringe';
import { Tokens } from '@/container/tokens';
import type { RedisService } from '@/config/services/redis.service';
import type { Logger } from '@/types';

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

@injectable()
export class CacheService {
  private readonly defaultTTL = 600; // 10 minutes

  constructor(
    @inject(Tokens.RedisService) private readonly redis: RedisService,
    @inject(Tokens.Logger) private readonly logger: Logger
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const client = this.redis.getClient();
      const value = await client.get(key);

      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error('Cache get error', { key, error });
      return null;
    }
  }

  async set(key: string, value: unknown, options: CacheOptions = {}): Promise<boolean> {
    try {
      const client = this.redis.getClient();
      const ttl = options.ttl ?? this.defaultTTL;
      const serialized = JSON.stringify(value);

      const pipeline = client.pipeline();
      pipeline.set(key, serialized, 'EX', ttl);

      // Add to tag sets for bulk invalidation
      if (options.tags?.length) {
        for (const tag of options.tags) {
          pipeline.sadd(`cache:tag:${tag}`, key);
          pipeline.expire(`cache:tag:${tag}`, ttl + 60); // Tag expires slightly after cache
        }
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      this.logger.error('Cache set error', { key, error });
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const client = this.redis.getClient();
      await client.del(key);
      return true;
    } catch (error) {
      this.logger.error('Cache del error', { key, error });
      return false;
    }
  }

  async invalidateByTag(tag: string): Promise<number> {
    try {
      const client = this.redis.getClient();
      const tagKey = `cache:tag:${tag}`;
      const keys = await client.smembers(tagKey);

      if (keys.length === 0) return 0;

      const pipeline = client.pipeline();
      pipeline.del(...keys);
      pipeline.del(tagKey);
      await pipeline.exec();

      return keys.length;
    } catch (error) {
      this.logger.error('Cache invalidateByTag error', { tag, error });
      return 0;
    }
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const client = this.redis.getClient();
      const values = await client.mget(...keys);
      return values.map(v => (v ? JSON.parse(v) : null));
    } catch (error) {
      this.logger.error('Cache mget error', { keys, error });
      return keys.map(() => null);
    }
  }

  async mset(entries: Array<{ key: string; value: unknown; ttl?: number }>): Promise<boolean> {
    try {
      const client = this.redis.getClient();
      const pipeline = client.pipeline();

      for (const { key, value, ttl } of entries) {
        const serialized = JSON.stringify(value);
        if (ttl) {
          pipeline.set(key, serialized, 'EX', ttl);
        } else {
          pipeline.set(key, serialized, 'EX', this.defaultTTL);
        }
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      this.logger.error('Cache mset error', { error });
      return false;
    }
  }
}
```

### Rate Limiter

```typescript
// src/middlewares/rate-limit.middleware.ts
import { injectable, inject } from 'tsyringe';
import { Tokens } from '@/container/tokens';
import type { RedisService } from '@/config/services/redis.service';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

@injectable()
export class RateLimiter {
  constructor(
    @inject(Tokens.RedisService) private readonly redis: RedisService
  ) {}

  async isAllowed(identifier: string, config: RateLimitConfig): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }> {
    const client = this.redis.getClient();
    const windowSeconds = Math.ceil(config.windowMs / 1000);
    const key = `ratelimit:${identifier}`;

    const script = `
      local current = redis.call('INCR', KEYS[1])
      if current == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
      end
      local ttl = redis.call('TTL', KEYS[1])
      return {current, ttl}
    `;

    const [current, ttl] = await client.eval(script, 1, key, windowSeconds) as [number, number];

    const remaining = Math.max(0, config.maxRequests - current);
    const resetAt = Date.now() + (ttl * 1000);

    return {
      allowed: current <= config.maxRequests,
      remaining,
      resetAt,
    };
  }
}
```

### Leaderboard Service

```typescript
// src/features/story/services/leaderboard.service.ts
import { injectable, inject } from 'tsyringe';
import { Tokens } from '@/container/tokens';
import type { RedisService } from '@/config/services/redis.service';

@injectable()
export class LeaderboardService {
  private readonly key = 'leaderboard:stories:trending';

  constructor(
    @inject(Tokens.RedisService) private readonly redis: RedisService
  ) {}

  async updateScore(storyId: string, score: number): Promise<void> {
    const client = this.redis.getClient();
    await client.zadd(this.key, score, storyId);
  }

  async incrementScore(storyId: string, delta: number): Promise<number> {
    const client = this.redis.getClient();
    return client.zincrby(this.key, delta, storyId);
  }

  async getTopStories(limit: number = 10): Promise<Array<{ storyId: string; score: number }>> {
    const client = this.redis.getClient();
    const results = await client.zrevrange(this.key, 0, limit - 1, 'WITHSCORES');

    const stories: Array<{ storyId: string; score: number }> = [];
    for (let i = 0; i < results.length; i += 2) {
      stories.push({
        storyId: results[i],
        score: parseFloat(results[i + 1]),
      });
    }

    return stories;
  }

  async getRank(storyId: string): Promise<number | null> {
    const client = this.redis.getClient();
    const rank = await client.zrevrank(this.key, storyId);
    return rank !== null ? rank + 1 : null; // Convert to 1-based ranking
  }

  async getScoreAndRank(storyId: string): Promise<{ score: number; rank: number } | null> {
    const client = this.redis.getClient();
    const pipeline = client.pipeline();
    pipeline.zscore(this.key, storyId);
    pipeline.zrevrank(this.key, storyId);

    const [[, score], [, rank]] = await pipeline.exec() as [[null, string | null], [null, number | null]];

    if (score === null || rank === null) return null;

    return {
      score: parseFloat(score),
      rank: rank + 1,
    };
  }
}
```

---

## Quick Reference

### Command Cheat Sheet

| Category | Command | Description |
|----------|---------|-------------|
| **Strings** | `SET/GET` | Basic key-value |
| | `INCR/DECR` | Atomic counters |
| | `MSET/MGET` | Multiple keys |
| | `SETEX` | Set with expiration |
| **Hashes** | `HSET/HGET` | Set/get hash field |
| | `HGETALL` | Get all fields |
| | `HINCRBY` | Increment field |
| **Lists** | `LPUSH/RPUSH` | Add to list |
| | `LPOP/RPOP` | Remove from list |
| | `LRANGE` | Get range |
| | `BLPOP/BRPOP` | Blocking pop |
| **Sets** | `SADD/SREM` | Add/remove member |
| | `SISMEMBER` | Check membership |
| | `SINTER/SUNION` | Set operations |
| **Sorted Sets** | `ZADD` | Add with score |
| | `ZRANGE/ZREVRANGE` | Get by rank |
| | `ZINCRBY` | Increment score |
| | `ZRANK` | Get rank |
| **Keys** | `DEL` | Delete keys |
| | `EXPIRE/TTL` | Set/get expiration |
| | `SCAN` | Iterate keys |
| | `EXISTS` | Check existence |

### When to Use What

| Use Case | Data Structure |
|----------|---------------|
| Session storage | Hash or String |
| Caching API responses | String (JSON) |
| User profile | Hash |
| Unique visitors | Set or HyperLogLog |
| Leaderboard | Sorted Set |
| Job queue | List or Stream |
| Rate limiting | String (INCR) |
| Real-time messaging | Pub/Sub or Stream |
| Recent activity | List (capped) |
| Tags/Categories | Set |
| Geolocation | Geo |
| Counters | String (INCR) |
| Feature flags | Bitmap |

---

## Additional Resources

- [Redis Official Documentation](https://redis.io/docs/)
- [ioredis GitHub](https://github.com/redis/ioredis)
- [Redis Best Practices](https://redis.io/docs/management/optimization/)
- [Redis Patterns](https://redis.io/docs/manual/patterns/)
