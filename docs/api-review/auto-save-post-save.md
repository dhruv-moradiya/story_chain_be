# API Review: POST /api/auto-save/save

## Owner-Level Context (How this fits the product)
This is the core autosave write path called frequently by the editor. It must be fast, consistent, and secure against users writing to chapters they don’t own.

## Source (Entry Points)
- Route: `src/features/chapterAutoSave/routes/chapterAutoSave.routes.ts`
- Controller: `src/features/chapterAutoSave/controllers/chapterAutoSave.controller.ts`
- Service: `src/features/chapterAutoSave/services/autosave-content.service.ts`
- Repository: `src/features/chapterAutoSave/repositories/chapterAutoSave.repository.ts`
- Schema: `src/schema/request/chapterAutoSaveVer2.Schema.ts`

## Data Model & Relationships
- Autosave stores content, title, `storyId`, `autoSaveType`, optional `chapterId` or `parentChapterSlug`.

## Auth & RBAC
- Requires authentication.
- No story-level RBAC checks here.

## Request
- Method: `POST`
- Path: `/api/auto-save/save`
- Body: `AutoSaveContentSchemaVer2` (either includes `autoSaveId` or includes `storySlug` + type-specific fields)

## Response
- `201 Created` with `{ _id, saveCount }`.

## Observed Flow
1. If `autoSaveId` present: load autosave, verify ownership, update content + saveCount.
2. If not present: resolve `storyId` and create autosave.

## Risks / Bugs / Loopholes
- **Schema mismatch bug:** Service checks `parentChapterId` for `update_chapter`, but schema only has `parentChapterSlug`. This can throw false 400s.
- **RBAC gap:** Any authenticated user can autosave on any story/chapter they can guess.
- **Lost updates:** `saveCount + 1` without `$inc` is non-atomic under concurrent writes.

## Performance Bottlenecks
- Update path reads autosave then writes (two DB hits). Frequent autosaves can cause high load.

## Recommended Code Changes (Concrete)
1. **Fix schema mismatch**: remove `parentChapterId` check or add it to schema.
   - File: `autosave-content.service.ts`
2. **Use atomic update** with `$inc` for `saveCount` and `$set` for content in one call.
   - File: `chapterAutoSave.repository.ts`
3. **Enforce RBAC** before autosave (owner/collaborator).
   - File: `autosave-content.service.ts`
4. **Throttle client autosaves** (e.g., minimum interval) to reduce write load.

## Index/DB Suggestions
- Add index on `{ userId, storyId, autoSaveType, parentChapterSlug }`.
- Consider TTL index on `lastSavedAt` to clean stale autosaves.

## Suggested Tests
- Save existing autosave and verify `saveCount` increments correctly.
- Create autosave for each type.
- Concurrent save requests do not lose increments.
