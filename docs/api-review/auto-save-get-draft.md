# API Review: GET /api/auto-save/draft

## Owner-Level Context (How this fits the product)
This lists all active autosaves for a user, used to recover drafts. It should be paginated and optionally filter out stale drafts.

## Source (Entry Points)
- Route: `src/features/chapterAutoSave/routes/chapterAutoSave.routes.ts`
- Controller: `src/features/chapterAutoSave/controllers/chapterAutoSave.controller.ts`
- Service: `src/features/chapterAutoSave/services/autosave-query.service.ts`
- Repository: `src/features/chapterAutoSave/repositories/chapterAutoSave.repository.ts`

## Auth & RBAC
- Requires authentication.

## Request
- Method: `GET`
- Path: `/api/auto-save/draft`

## Response
- `200 OK` with autosave array.

## Observed Flow
1. Controller reads `userId` and fetches all autosaves for that user.

## Risks / Bugs / Loopholes
- **Unbounded results:** Large payloads if a user has many autosaves.
- **No stale filtering:** Old drafts remain indefinitely.

## Recommended Code Changes (Concrete)
1. **Add pagination** (limit + cursor or page/size).
2. **Filter by `isEnabled` and `lastSavedAt`** to remove stale entries.
3. **Optional: add cleanup job** (cron/worker) to delete autosaves older than N days.

## Index/DB Suggestions
- Index `{ userId, lastSavedAt }` for filtering and cleanup.
- TTL index on `lastSavedAt` for automatic cleanup.

## Suggested Tests
- Empty list when no autosaves.
- Pagination works with many autosaves.
- Stale autosaves are excluded.
