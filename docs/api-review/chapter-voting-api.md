# API Design Review: Chapter Voting

## Owner-Level Context (Product Intent)
Voting drives ranking, recommendations, and community feedback. The system must be secure (no duplicate votes), fast (frequent reads), and resilient to abuse.

## Current Data Model (Observed)
- `vote.model.ts` suggests:
  - `chapterId`, `userId`, `voteType` or vote score
  - Unique index on `{ chapterId, userId }`

## Primary Use Cases
1. Upvote/downvote a chapter.
2. Remove/change vote.
3. Fetch vote counts and user’s vote state.
4. Rank chapters by score.

## Recommended API Surface (REST)
### 1) Cast or update vote
- `POST /api/chapters/:chapterId/vote`
- Body: `{ vote: "up" | "down" }`
- Behavior: upsert user vote, update chapter stats.

### 2) Remove vote
- `DELETE /api/chapters/:chapterId/vote`

### 3) Get user vote state
- `GET /api/chapters/:chapterId/vote`
- Returns `{ userVote: "up" | "down" | null, score, upvotes, downvotes }`

### 4) List top chapters
- `GET /api/chapters/top?storySlug=...&limit=20`

## Data Modeling Options
### Option A: Votes in a separate collection (current)
- Pros: normalized, unique index prevents duplicate votes.
- Cons: requires aggregation to compute score.

### Option B: Embed vote counts in chapter
- Store `stats.votes.upvotes/downvotes/score` on chapter.
- Pros: fast reads.
- Cons: needs consistent write logic to keep counts accurate.

**Recommendation:** Keep **Option A** with **denormalized counters** on Chapter for fast reads.

## Consistency Strategy
- When vote changes:
  1. Upsert vote record.
  2. Increment/decrement counters on Chapter atomically.
- Use a transaction if MongoDB supports it in your deployment.

## Abuse & Integrity
- Enforce unique `{ chapterId, userId }` index.
- Add rate limiting per user for vote changes.
- Optional: disallow voting on own chapter.

## Redis + BullMQ Ideas
### 1) Cache vote counts
- Redis key: `chapter:votes:{chapterId}` for score and counts.
- Update cache on vote change; fallback to DB if cache miss.

### 2) Queue vote events
- Push vote changes to BullMQ.
- Worker updates counters and analytics in batches.
- Useful for high traffic but introduces eventual consistency.

## Recommended Code Changes (Concrete)
1. Add `VoteController`, `VoteService`, `VoteRepository` under `features/vote/`.
2. Add routes in `src/features/chapter/routes` or a `vote.routes.ts`.
3. In `VoteService`:
   - Enforce uniqueness and compute delta updates to chapter counters.
   - Use `$inc` for `stats.votes`.
4. Add DB indexes:
   - `{ chapterId, userId }` unique (already in model).
   - `{ chapterId }` for aggregation speed.

## Suggested Tests
- Upvote creates vote and increments counters.
- Downvote replaces upvote and updates counters correctly.
- Delete vote decrements counters.
- Duplicate votes are rejected by unique index.
