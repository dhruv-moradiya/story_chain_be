# API Design Review: Reading History

## Owner-Level Context (Product Intent)
Reading history powers resume reading, progress tracking, and engagement analytics. It should be lightweight, idempotent, and resilient to frequent updates from active readers.

## Current Data Model (Observed)
- `readingHistory.model.ts` stores:
  - `userId`
  - `chaptersRead[]` with `chapterSlug` and timestamps
- This suggests per-user history with multiple chapter entries.

## Primary Use Cases
1. **Resume reading**: last read chapter/time for a story.
2. **Progress tracking**: how many chapters read in a story.
3. **Recommendations**: recently read stories/chapters.
4. **Analytics**: read streaks, time-on-page, chapter completion events.

## Recommended API Surface (REST)
### 1) Upsert reading event (lightweight, high-frequency)
- `POST /api/reading-history/pulse`
- Body: `{ storyId?, storySlug?, chapterId?, chapterSlug, position?: number, duration?: number, at?: ISODate }`
- Behavior: upsert reading progress, record last activity.

### 2) Fetch last read per story
- `GET /api/reading-history/last?storySlug=...`

### 3) List recent history
- `GET /api/reading-history/recent?limit=20`

### 4) Clear history
- `DELETE /api/reading-history/clear?storySlug=...`

## Data Modeling Options (Best Fit)
### Option A: Single document per user (current model direction)
- `ReadingHistory { userId, chaptersRead[] }`
- Pros: simple lookup per user.
- Cons: arrays grow unbounded, update heavy, expensive to query per story.

### Option B: Single document per user per story
- `ReadingHistory { userId, storyId, lastChapterSlug, lastReadAt, chaptersRead[] }`
- Pros: easy resume, easier story scope.
- Cons: still array growth, but contained to story.

### Option C: Event log (recommended for scale)
- `ReadingHistoryEvent { userId, storyId, chapterId, at, position, duration }`
- Pros: append-only, easy analytics, can roll up into aggregates.
- Cons: needs aggregation for resume view.

**Recommendation:** Use **Option B + Event log**. Store a small, fast “resume” doc per story, and push raw events into a log asynchronously for analytics.

## Pulse Strategy (every 30s)
If you send a pulse every 30s:
- **Pros:** Keeps reading progress accurate for long sessions.
- **Cons:** High write load; needs throttling and aggregation.

**Best practice:**
- Client sends `pulse` every 30s with `duration` and `position`.
- API **debounces** updates using Redis (e.g., write every N pulses or when `position` changes significantly).
- Use BullMQ to flush aggregates to MongoDB asynchronously.

## Redis + BullMQ Integration Ideas
### 1) Redis buffer + periodic flush
- `reading:{userId}:{storyId}` stores last progress, TTL 24h.
- Every pulse updates Redis only.
- BullMQ job every 1–5 minutes flushes Redis to MongoDB.

### 2) Event queue
- Every pulse pushes a lightweight event into BullMQ.
- Worker batch-inserts events and updates summary docs.

### 3) Hybrid
- Redis keeps current progress.
- BullMQ batches events to history log.
- API reads from Redis first, fallback to MongoDB.

## Security & RBAC
- All reading history endpoints should require authentication.
- Prevent users from writing history for other users.

## Performance & Indexing
- Add index on `{ userId, storyId }` for resume lookup.
- If event log used: `{ userId, storyId, at }` for fast range queries.

## Recommended Code Changes (Concrete)
1. Add routes under `src/features/readingHistory/routes`:
   - `POST /pulse`, `GET /recent`, `GET /last`, `DELETE /clear`.
2. Add a `ReadingHistoryService` that:
   - Writes to Redis for high-frequency pulses.
   - Enqueues BullMQ jobs to persist to MongoDB.
3. Add a worker in `workers/` to flush Redis + insert events.

## Suggested Tests
- Pulse creates/updates history.
- Frequent pulses do not cause DB overload (verify Redis buffering).
- Recent history returns most recent chapters.
- Clearing history removes entries.
