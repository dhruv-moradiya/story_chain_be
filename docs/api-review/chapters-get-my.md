# API Review: GET /api/chapters/my

## Owner-Level Context (How this fits the product)
This endpoint powers the “My Chapters” dashboard/list for a logged-in user. It should be fast, paginated, and safe because it can be called frequently from the UI (e.g., dashboard refresh, infinite scroll).

## Source (Entry Points)
- Route: `src/features/chapter/routes/chapter.routes.ts`
- Controller: `src/features/chapter/controllers/chapter.controller.ts`
- Service: `src/features/chapter/services/chapter-query.service.ts`
- Repository: `src/features/chapter/repositories/chapter.repository.ts`

## Data Model & Relationships
- `Chapter` references:
  - `authorId` (User.clerkId)
  - `storySlug` (Story.slug)
- This route aggregates chapters and may attach story/author info through pipelines.

## Auth & RBAC
- Requires authentication via `validateAuth`.
- No story-level RBAC checks (correct for “my chapters” view, but ensure only author is returned).

## Request
- Method: `GET`
- Path: `/api/chapters/my`
- Body: none
- Params: none

## Response
- `200 OK` with `ApiResponse` and an array of chapters.

## Observed Flow
1. Controller reads `request.user.clerkId`.
2. `chapterQueryService.getByAuthor(userId)` runs a pipeline for author chapters.
3. Result array is returned.

## Risks / Bugs / Loopholes
- **Unbounded results:** No pagination/limit → huge payloads for prolific writers.
- **Potential data over-fetch:** If the pipeline returns full chapter content or nested author data, payload size and time grow unnecessarily.
- **No explicit sort contract:** If the pipeline doesn’t consistently sort by `createdAt` or `updatedAt`, UI can appear inconsistent.

## Performance Bottlenecks
- Large aggregation without pagination.
- Potential large `$lookup` if story/author are attached for each chapter.

## Recommended Code Changes (Concrete)
1. **Add pagination parameters** (page/limit or cursor) at the route level and enforce a max limit (e.g., 50).
   - File: `src/features/chapter/routes/chapter.routes.ts` (query schema)
   - File: `src/features/chapter/services/chapter-query.service.ts` (apply skip/limit)
2. **Add a list-specific projection** to avoid full `content` fields.
   - File: `src/features/chapter/pipelines/chapterPipeline.builder.ts`
3. **Ensure ordering** (e.g., `updatedAt: -1` or `createdAt: -1`).

## Index/DB Suggestions
- Confirm indexes on `authorId`, `createdAt`, `updatedAt` (existing in `chapter.model.ts` but ensure in DB).
- If adding sort by `updatedAt`, add compound index `(authorId, updatedAt)`.

## Suggested Tests
- 0 chapters: returns empty list.
- Many chapters: pagination returns correct page size.
- Cross-user isolation: no chapters from other users.
