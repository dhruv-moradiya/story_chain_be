# API Review: POST /api/auto-save/convert-to-draft

## Owner-Level Context (How this fits the product)
This endpoint turns an autosave into a draft chapter (not public). It should be consistent with the chapter creation rules and preserve draft status.

## Source (Entry Points)
- Route: `src/features/chapterAutoSave/routes/chapterAutoSave.routes.ts`
- Controller: `src/features/chapterAutoSave/controllers/chapterAutoSave.controller.ts`
- Service: `src/features/chapterAutoSave/services/autosave-conversion.service.ts`

## Auth & RBAC
- Requires authentication.
- Ownership enforced in service.
- No story role permission required (draft creation).

## Request
- Method: `POST`
- Path: `/api/auto-save/convert-to-draft`
- Body: `{ autoSaveId }`

## Response
- `201 Created` with empty payload.

## Observed Flow
1. Load autosave by ID, verify ownership.
2. Validate content length.
3. Create chapter with DRAFT status.
4. Delete autosave.

## Risks / Bugs / Loopholes
- **Root chapters are always published:** `createRoot` hardcodes `PUBLISHED`, so root autosave conversion publishes immediately.
- **No update-chapter conversion path:** `update_chapter` autosaves throw error, but there is no alternative endpoint for applying changes to an existing chapter draft.
- **Non-transactional:** Chapter creation + autosave deletion are not atomic.

## Recommended Code Changes (Concrete)
1. **Allow `createRoot` to accept status** and pass `DRAFT` for draft conversion.
   - File: `chapter-crud.service.ts`
2. **Add a conversion path for update_chapter** (either update existing chapter or create draft version).
   - File: `autosave-conversion.service.ts`
3. **Wrap in a transaction** to ensure either both actions succeed or both roll back.

## Suggested Tests
- Convert root autosave → status stays DRAFT.
- Convert new_chapter autosave → draft chapter created.
- Convert update_chapter autosave → appropriate behavior (once added).
