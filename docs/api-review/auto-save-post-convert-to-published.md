# API Review: POST /api/auto-save/convert-to-published

## Owner-Level Context (How this fits the product)
This endpoint publishes an autosave as a real chapter. It must enforce story write permissions and ensure the chapter is created atomically with autosave deletion.

## Source (Entry Points)
- Route: `src/features/chapterAutoSave/routes/chapterAutoSave.routes.ts`
- Controller: `src/features/chapterAutoSave/controllers/chapterAutoSave.controller.ts`
- Service: `src/features/chapterAutoSave/services/autosave-conversion.service.ts`
- Middleware: `src/middlewares/rbac/storyRole.middleware.ts`

## Auth & RBAC
- Requires authentication.
- Uses `loadStoryContextFromAutoSave` + `StoryRoleGuards.canWriteChapters`.
- Ownership enforced in service.

## Request
- Method: `POST`
- Path: `/api/auto-save/convert-to-published`
- Body: `{ autoSaveId }`

## Response
- `201 Created` with chapter payload.

## Observed Flow
1. Middleware resolves `storyId` from autosave and runs RBAC guard.
2. Service verifies ownership, validates content, creates chapter, deletes autosave.

## Risks / Bugs / Loopholes
- **Non-transactional:** Create + delete are separate operations; failures can leave dangling autosaves or duplicate chapters if retried.
- **Update autosaves unsupported:** `update_chapter` autosaves cannot be published through this path.

## Recommended Code Changes (Concrete)
1. **Wrap conversion in a transaction** (create chapter + delete autosave).
2. **Handle update_chapter autosaves** by applying changes to existing chapters or creating a PR/branch flow.
3. **Return structured error codes** for RBAC vs not-found vs validation.

## Suggested Tests
- Publish root autosave with proper permissions.
- Publish new_chapter autosave with proper permissions.
- Publish update_chapter autosave (once supported).
