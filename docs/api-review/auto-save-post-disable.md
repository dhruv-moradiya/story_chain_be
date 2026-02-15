# API Review: POST /api/auto-save/disable

## Owner-Level Context (How this fits the product)
This endpoint disables autosave on an existing chapter. It should be permissioned the same way as autosave enable/save, otherwise a user can disable other people’s autosaves by guessing IDs.

## Source (Entry Points)
- Route: `src/features/chapterAutoSave/routes/chapterAutoSave.routes.ts`
- Controller: `src/features/chapterAutoSave/controllers/chapterAutoSave.controller.ts`
- Service: `src/features/chapterAutoSave/services/autosave-lifecycle.service.ts`
- Repository: `src/features/chapterAutoSave/repositories/chapterAutoSave.repository.ts`
- Schema: `src/schema/request/chapterAutoSave.schema.ts`

## Auth & RBAC
- Requires authentication.
- No story-level RBAC checks enforced.

## Request
- Method: `POST`
- Path: `/api/auto-save/disable`
- Body: `{ chapterId }`

## Response
- `201 Created` with empty payload.

## Observed Flow
1. Controller validates `chapterId`.
2. Service fetches autosave by `chapterId` + `userId` and disables it.

## Risks / Bugs / Loopholes
- **No RBAC check:** User can disable autosave for any chapter if they discover a `chapterId` with a matching autosave record.
- **Non-atomic disable:** Find + update could be a single atomic update.
- **Semantics:** Uses `201` for a disable action.

## Recommended Code Changes (Concrete)
1. **Add RBAC checks** (owner/collaborator on story).
2. **Use a single update**: `findOneAndUpdate({ chapterId, userId }, { isEnabled: false })`.
3. **Return 200/204** for disable action.

## Index/DB Suggestions
- Compound index `{ chapterId, userId }` for fast disable.

## Suggested Tests
- Disable by owner succeeds.
- Disable by non-owner returns 403.
- Disable missing autosave returns 404.
