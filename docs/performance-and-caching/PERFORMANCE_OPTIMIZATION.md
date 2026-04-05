# ⚡ Performance Optimization Guide — Story Chain API

> Generated from Postman load test results: **11,661 total requests**, **37.89 req/s**, avg response **2,174ms**, P90 **3,113ms**, P98 **3,937ms**.
> This doc maps every bottleneck back to the actual code file and line responsible, and gives a concrete fix for each.

---

## 📊 Load Test Baseline

| Endpoint                              | Avg (ms) | P90 (ms) | P95 (ms) |
| ------------------------------------- | -------- | -------- | -------- |
| GET All stories by authenticated user | 1,778    | 1,980    | 2,758    |
| GET Story Overview By Slug            | 2,472    | 2,889    | 2,908    |
| GET Search stories by query           | 836      | 975      | 984      |
| GET Settings                          | 2,373    | 2,901    | 2,915    |
| GET Story Collaborators               | 2,376    | 2,893    | 2,908    |
| GET Story Tree by Slug                | 3,252    | 3,870    | 3,895    |

---

## 🔥 #1 — Auth Middleware Does 2 DB Queries on Every Single Request

**File:** `src/middlewares/authHandler.ts` — Lines 36–44

```ts
// ❌ CURRENT — 2 round trips to MongoDB on EVERY authenticated request
const user = await userService.getOrCreateUser(auth.userId); // DB hit
const platformRole = await platformRoleRepo.findByUserId(auth.userId); // DB hit
```

### Why This Hurts

- Every authenticated route pays a **~20–50ms penalty just for auth** before your business logic even starts.
- At 37 req/s, this is your **single highest-frequency bottleneck**.
- `getOrCreateUser` calls `findByClerkId` on every request. If the user exists (99.9% of the time), this is just a wasted query.

### Fix — Cache the Auth Result in Redis

```ts
// src/middlewares/authHandler.ts
import { CacheService } from '@/infrastructure/cache/cache.service';
import { CacheKeyBuilder, CACHE_TTL } from '@/infrastructure';

export async function validateAuth(request: FastifyRequest, _reply: FastifyReply) {
  const auth = getAuth(request);
  if (!auth?.userId) throw AppError.unauthorized(...);

  const cacheService = container.resolve<CacheService>(TOKENS.CacheService);
  const cacheKey = CacheKeyBuilder.userProfile(auth.userId);          // sc:user:detail:clerkId=...

  // Try cache first — avoids both DB queries
  const cached = await cacheService.get<AuthUser>(cacheKey);
  if (cached) {
    request.user = cached;
    return;
  }

  // Cache miss: resolve from DB
  const userService = container.resolve<UserService>(TOKENS.UserService);
  const platformRoleRepo = container.resolve<PlatformRoleRepository>(TOKENS.PlatformRoleRepository);

  const [user, platformRole] = await Promise.all([      // parallel!
    userService.getOrCreateUser(auth.userId),
    platformRoleRepo.findByUserId(auth.userId),
  ]);

  if (!user) throw AppError.unauthorized(...);
  if (!platformRole) throw AppError.forbidden(...);

  const authUser: AuthUser = { ...user, ...platformRole.toObject() };
  await cacheService.set(cacheKey, authUser, { ttl: 300 }); // 5 min TTL
  request.user = authUser;
}
```

**Expected gain:** Removes 2 DB queries from every request → **~40–80ms per request at load**.

---

## 🔥 #2 — `getStoryTreeBySlug` Is the Slowest Endpoint (P95: 3,895ms) with No Cache

**File:** `src/features/story/services/story-query.service.ts` — Lines 106–130

```ts
// ❌ CURRENT — No caching, 2 DB round-trips per call
async getStoryTreeBySlug(slug: string): Promise<IStoryTreeResult> {
  const story = await this.storyRepo.findBySlug(slug);  // round-trip 1
  const pipeline = new ChapterPipelineBuilder()...
  const chapters = await this.chapterRepo.aggregateChapters(pipeline); // round-trip 2 (heavy agg)
  const tree = buildChapterTree(chapters);
  return { slug: story.slug, chapters: tree };
}
```

### Fix — Cache the Tree Result

```ts
async getStoryTreeBySlug(slug: string): Promise<IStoryTreeResult> {
  return this.cacheService.getOrSet(
    CacheKeyBuilder.storyTree(slug),
    async () => {
      const story = await this.storyRepo.findBySlug(slug);
      if (!story) this.throwNotFoundError('Story not found. Unable to generate chapter tree.');
      const pipeline = new ChapterPipelineBuilder().buildStoryChapterTreePreset(story.slug).build();
      const chapters = await this.chapterRepo.aggregateChapters(pipeline);
      if (!chapters || chapters.length === 0) return { slug: story.slug, chapters: [] };
      return { slug: story.slug, chapters: buildChapterTree(chapters) };
    },
    { ttl: CACHE_TTL.STORY_TREE }  // 15 min — already defined in cache.constants.ts ✅
  );
}
```

**Expected gain:** Cache hits drop from ~3,250ms → **<10ms** (Redis GET).

---

## 🔥 #3 — Story Overview Pipeline Has Nested Lookups with No Cache

**File:** `src/features/story/services/story-query.service.ts` — Lines 135–151  
**Pipeline:** `src/features/story/pipelines/storyPipeline.builder.ts` — `getStoryOverviewPreset()`

### Why `getStoryOverviewPreset` Is Expensive

The pipeline does:

1. `$match` by slug
2. `attachCollaborators()` → **nested** `$lookup` into `storycollaborators` then into `users` (2 lookups)
3. `attachLatestChapters(2)` → `$lookup` into `chapters` → nested `$lookup` into `chapters` again (ancestor calculation) → `$lookup` into `users` (3 lookups)

That's **5 nested `$lookup` stages** in one aggregation, running uncached on every call.

### Fix A — Cache the Overview Result

```ts
async getStoryOverviewBySlug(slug: string): Promise<IStoryWithCreator> {
  return this.cacheService.getOrSet(
    CacheKeyBuilder.storyOverview(slug),
    async () => {
      const storyPipeline = new StoryPipelineBuilder().getStoryOverviewPreset(slug).build();
      const stories = await this.storyRepo.aggregateStories<IStoryWithCreator>(storyPipeline);
      if (!stories.length) this.throwNotFoundError('Story not found');
      return stories[0];
    },
    { ttl: CACHE_TTL.STORY_OVERVIEW }  // 30 min — already defined ✅
  );
}
```

### Fix B — Run `findBySlug` and `aggregateStories` in Parallel

The current pipeline already embeds the `$match` by slug, so the first `findBySlug` call in other methods is an extra round trip. For overview, start the agg directly (the pipeline already filters by slug).

**Expected gain:** Avg drops from ~2,472ms → **<20ms** on cache hits.

---

## 🔥 #4 — Settings & Collaborators Endpoints Have No Cache

**Files:**

- `src/features/story/services/story-query.service.ts` Lines 156–168 (`getStorySettingsBySlug`)
- `src/features/storyCollaborator/services/collaborator-query.service.ts` (`getStoryCollaboratorsBySlug`)

```ts
// ❌ CURRENT — Raw DB query every time
async getStorySettingsBySlug(slug: string): Promise<IStorySettingsWithImages> {
  const story = await this.storyRepo.findBySlug(slug); // uncached
  ...
}
```

### Fix — Wrap Both in `cacheService.getOrSet`

```ts
async getStorySettingsBySlug(slug: string): Promise<IStorySettingsWithImages> {
  return this.cacheService.getOrSet(
    CacheKeyBuilder.storySettings(slug),
    async () => {
      const story = await this.storyRepo.findBySlug(slug);
      if (!story) this.throwNotFoundError('Story not found');
      return { settings: story.settings, coverImage: story.coverImage, cardImage: story.cardImage };
    },
    { ttl: CACHE_TTL.STORY_SETTINGS }  // 1 hour
  );
}
```

For collaborators, add similarly to `CollaboratorQueryService`:

```ts
async getStoryCollaboratorsBySlug(slug: string) {
  return this.cacheService.getOrSet(
    CacheKeyBuilder.collaboratorList(slug),
    () => this.collaboratorRepo.findByStorySlug(slug),
    { ttl: CACHE_TTL.COLLABORATOR_LIST }  // 15 min
  );
}
```

**Expected gain:** Settings avg drops from ~2,373ms → **<15ms**. Collaborators avg drops from ~2,376ms → **<15ms**.

---

## ⚠️ #5 — Auth Middleware Resolves Containers Inline Every Request

**File:** `src/middlewares/authHandler.ts` — Lines 36–38

```ts
// ❌ CURRENT — container.resolve called on EVERY request
const userService = container.resolve<UserService>(TOKENS.UserService);
const platformRoleRepo = container.resolve<PlatformRoleRepository>(TOKENS.PlatformRoleRepository);
```

### Why This Matters

`tsyringe` `container.resolve()` is not free — it walks the DI graph and resolves all dependencies. Even though singletons are cached internally, there's still overhead per call.

### Fix — Resolve Once at Startup

Convert `validateAuth` into a factory function so services are resolved once:

```ts
// src/middlewares/authHandler.ts
export function createAuthMiddleware() {
  const userService = container.resolve<UserService>(TOKENS.UserService);
  const platformRoleRepo = container.resolve<PlatformRoleRepository>(TOKENS.PlatformRoleRepository);
  const cacheService = container.resolve<CacheService>(TOKENS.CacheService);

  return async function validateAuth(request: FastifyRequest, _reply: FastifyReply) {
    // ... use the pre-resolved services
  };
}
```

Then in app.ts, call `createAuthMiddleware()` once and pass the result to routes.

---

## ⚠️ #6 — `loadStoryContext` Middleware Double-Fetches Story (Already Fetched in Controller)

**File:** `src/middlewares/rbac/storyRole.middleware.ts` — Lines 50–66  
**Affected routes:** `PublishBySlug`, `UpdateSettingsBySlug`, `AddChapterBySlug`, `UpdateStoryCoverImage`, etc.

```ts
// In middleware: loadStoryContext
const story = await storyQueryService.getBySlug(slug); // DB hit #1

// In controller: addChapterToStoryBySlug (story.controller.ts line 305)
const story = await this.storyQueryService.getBySlug(slug); // DB hit #2 — DUPLICATE!
```

### Fix — Reuse Request Context Set by Middleware

The middleware already attaches `request.storyContext`. Make controller methods use it:

```ts
// In StoryController.addChapterToStoryBySlug
const { storySlug } = request.storyContext!; // ✅ Already loaded by middleware — zero extra query
```

**Expected gain:** Removes 1 DB query from all RBAC-protected write routes.

Also note: `loadStoryContext` calls `getBySlug` which bypasses cache — use `getOrSet` there too.

---

## ⚠️ #7 — `getBySlug` Core Method Has No Cache Despite Being Used Everywhere

**File:** `src/features/story/services/story-query.service.ts` — Lines 41–49

```ts
async getBySlug(slug: string, options: IOperationOptions = {}): Promise<IStory> {
  const story = await this.storyRepo.findBySlug(slug, options);  // ❌ Always a DB query
  ...
}
```

This method is called by:

- `loadStoryContext` middleware (every RBAC write route)
- `getStoryTreeBySlug`
- `getStorySettingsBySlug`
- `addChapterToStoryBySlug` in the controller

### Fix

```ts
async getBySlug(slug: string, options: IOperationOptions = {}): Promise<IStory> {
  // Skip cache if inside a transaction (options.session is set)
  if (options.session) {
    const story = await this.storyRepo.findBySlug(slug, options);
    if (!story) this.throwNotFoundError('Story not found');
    return story;
  }

  return this.cacheService.getOrSet(
    CacheKeyBuilder.storyDetail(slug),
    async () => {
      const story = await this.storyRepo.findBySlug(slug);
      if (!story) this.throwNotFoundError('Story not found');
      return story;
    },
    { ttl: CACHE_TTL.STORY_DETAIL }  // 1 hour
  );
}
```

---

## ⚠️ #8 — MongoDB Connection Pool May Be Too Small for This Load

**File:** `src/config/db.ts` — Line 10

```ts
maxPoolSize: 10,  // ❌ Only 10 connections for ~38 req/s
```

At 37.89 req/s with avg 2,174ms response time, you have up to `37.89 × 2.174 ≈ **82 concurrent in-flight requests**` at any instant. With only 10 connections, requests are queuing for a Mongo connection.

### Fix

```ts
await mongoose.connect(env.MONGODB_URI, {
  maxPoolSize: 50, // ✅ Match your concurrency level
  minPoolSize: 10, // Keep warm connections ready
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  waitQueueTimeoutMS: 5000, // Fail fast if pool is exhausted
});
```

**Expected gain:** Eliminates connection queue wait times — likely **200–500ms off avg response**.

---

## ⚠️ #9 — `searchByTitle` Uses a Slow `$regex` Query

**File:** `src/features/story/repositories/story.repository.ts` — Lines 131–133

```ts
// ❌ $regex with 'i' option does NOT use MongoDB indexes efficiently
{ title: { $regex: query, $options: 'i' }, status: StoryStatus.PUBLISHED }
```

### Fix — Use MongoDB Atlas Search or a Text Index

**Option A (Quick): Add a text index**

```ts
// In your Story model schema
storySchema.index({ title: 'text' });
```

Then query:

```ts
return this.model
  .find(
    { $text: { $search: query }, status: StoryStatus.PUBLISHED },
    { score: { $meta: 'textScore' }, _id: 1, title: 1 }
  )
  .sort({ score: { $meta: 'textScore' } })
  .limit(limit)
  .lean()
  .exec();
```

**Option B (Best): Cache search results** (already have the infrastructure!)

```ts
async searchStoriesByTitle(query: string, limit: number = 10) {
  return this.cacheService.getOrSet(
    CacheKeyBuilder.searchResults(query, 'story'),
    () => this.storyRepo.searchByTitle(query, limit),
    { ttl: CACHE_TTL.SEARCH_RESULTS }  // 3 min
  );
}
```

**Expected gain:** Avg drops from 836ms → **<50ms** on cached queries.

---

## 💡 #10 — `getOrSet` Logs on Every Cache Hit — Disable in Production

**File:** `src/infrastructure/cache/cache.service.ts` — Lines 131–132

```ts
this.logInfo(`Cache hit for key: ${key}`); // ❌ 1 log line per request — expensive under load
```

### Fix

```ts
// Only log in development / debug mode
if (process.env.LOG_CACHE_HITS === 'true') {
  this.logInfo(`Cache hit for key: ${key}`);
}
```

Under 38 req/s with thousands of cache hits, logging is a syscall on every request. This adds measurable overhead.

---

## 🗺️ Priority Roadmap

| Priority | Fix                                                        | Expected Impact             | Effort |
| -------- | ---------------------------------------------------------- | --------------------------- | ------ |
| 🔴 P0    | **#1** Cache auth user in Redis                            | -40–80ms/req everywhere     | 1h     |
| 🔴 P0    | **#8** Increase MongoDB connection pool                    | -200–500ms avg              | 5min   |
| 🔴 P0    | **#2** Cache story tree                                    | -3,200ms → <10ms on hits    | 30min  |
| 🟠 P1    | **#3** Cache story overview                                | -2,400ms → <20ms on hits    | 30min  |
| 🟠 P1    | **#4** Cache settings & collaborators                      | -2,000ms → <15ms on hits    | 30min  |
| 🟠 P1    | **#7** Cache `getBySlug` core method                       | Reduces cascading DB hits   | 30min  |
| 🟡 P2    | **#6** Fix double-fetch in `loadStoryContext` + controller | -1 DB query on write routes | 1h     |
| 🟡 P2    | **#5** Pre-resolve DI containers at startup                | Minor CPU saving            | 1h     |
| 🟡 P2    | **#9** Add text index or cache search results              | -800ms → <50ms              | 30min  |
| 🟢 P3    | **#10** Disable cache-hit logging in production            | Minor CPU/IO gain           | 5min   |

---

## 📈 Projected Improvements

After implementing P0 + P1 fixes:

| Metric               | Current  | Projected     |
| -------------------- | -------- | ------------- |
| Avg response time    | 2,174ms  | ~200–400ms    |
| P90                  | 3,113ms  | ~500–800ms    |
| P98                  | 3,937ms  | ~800–1,200ms  |
| Effective throughput | 37 req/s | 150–300 req/s |

> **Note:** Projections are estimates. Actual improvements depend on Redis hit rate (what % of requests are for the same slug/user), MongoDB instance specs, and network latency to your Redis/MongoDB hosts.

---

## 🏗️ Ensure Cache Invalidation is Correct

After adding all these caches, confirm invalidation happens on write:

| Write Action                              | Must Invalidate                                 |
| ----------------------------------------- | ----------------------------------------------- |
| `updateSettingsBySlug`                    | `storySettings(slug)`, `storyDetail(slug)`      |
| `updateStoryCoverImageBySlug`             | `storyDetail(slug)`, `storyOverview(slug)`      |
| `addChapterToStoryBySlug`                 | `storyTree(slug)`, `storyOverview(slug)`        |
| `createCollaborator` / `acceptInvitation` | `collaboratorList(slug)`, `storyOverview(slug)` |
| User platformRole change                  | `userProfile(userId)`                           |

Your `CacheService.invalidateStory(slug)` already covers most of these — just ensure it's called in the right write service methods.

---

## 🛠️ MongoDB Indexes to Verify Exist

Run in MongoDB shell or Compass to confirm:

```js
db.stories.getIndexes();
db.chapters.getIndexes();
db.storycollaborators.getIndexes();
db.users.getIndexes();
db.platformroles.getIndexes();
```

Critical indexes that must exist:

| Collection           | Field(s)              | Type              |
| -------------------- | --------------------- | ----------------- |
| `stories`            | `slug`                | unique            |
| `stories`            | `creatorId`           | 1                 |
| `stories`            | `status`, `createdAt` | compound          |
| `stories`            | `title`               | text (for search) |
| `chapters`           | `storySlug`           | 1                 |
| `chapters`           | `slug`                | unique            |
| `chapters`           | `parentChapterSlug`   | 1                 |
| `storycollaborators` | `slug`, `userId`      | compound unique   |
| `users`              | `clerkId`             | unique            |
| `platformroles`      | `userId`              | unique            |

If any of these are missing, MongoDB is doing full collection scans — which would explain why some endpoints degrade heavily under load.
