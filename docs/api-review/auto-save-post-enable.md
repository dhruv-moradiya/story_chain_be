# API Review: POST /api/auto-save/enable

## Owner-Level Context (How this fits the product)
This endpoint initializes autosave sessions for writers. It should enforce ownership/permission, prevent duplicates, and avoid creating multiple autosaves for the same chapter/user.

## Source (Entry Points)
- Route: `src/features/chapterAutoSave/routes/chapterAutoSave.routes.ts`
- Controller: `src/features/chapterAutoSave/controllers/chapterAutoSave.controller.ts`
- Service: `src/features/chapterAutoSave/services/autosave-lifecycle.service.ts`
- Repository: `src/features/chapterAutoSave/repositories/chapterAutoSave.repository.ts`
- Schema: `src/schema/request/chapterAutoSaveVer2.Schema.ts`

## Data Model & Relationships
- Autosave stores `userId`, `storyId`, `autoSaveType`, optional `chapterId` or `parentChapterSlug`.
- The model currently does not enforce uniqueness per user/chapter.

## Auth & RBAC
- Requires authentication.
- No story-level RBAC or chapter ownership checks here.

## Request
- Method: `POST`
- Path: `/api/auto-save/enable`
- Body: `EnableAutoSaveSchemaVer2` (discriminated by `autoSaveType`)

## Response
- `201 Created` with autosave record.

## Observed Flow
1. Service resolves `storyId` from `storySlug`.
2. Repository `enableAutoSave` uses `.create` to insert a new autosave.

## Risks / Bugs / Loopholes
- **RBAC gap:** Any authenticated user can create autosaves for any story/chapter.
- **Duplicate autosaves:** `.create` allows multiple autosaves for same user/chapter/type.
- **No check for chapter existence/ownership (update type).**

## Performance Bottlenecks
- Story lookup by slug for every enable call.

## Recommended Code Changes (Concrete)
1. **Enforce RBAC**: verify the user can write to the story or owns the chapter.
   - File: `autosave-lifecycle.service.ts`
2. **Use upsert with unique constraints** to ensure single autosave per user/chapter/type.
   - File: `chapterAutoSave.repository.ts`
   - Add unique index e.g. `{ userId, chapterId, autoSaveType }`.
3. **Validate chapter existence** for update type.
   - File: `autosave-lifecycle.service.ts`

## Index/DB Suggestions
- Compound unique index on `{ userId, chapterId, autoSaveType }`.
- For root/new types: `{ userId, storyId, autoSaveType, parentChapterSlug }`.

## Suggested Tests
- Enable autosave as authorized user.
- Enable autosave as unauthorized user → 403.
- Enable twice → should reuse same autosave.
