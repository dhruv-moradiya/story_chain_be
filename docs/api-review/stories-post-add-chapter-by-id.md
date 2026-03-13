# API Review: POST /api/stories/id/:storyId/chapters

## Owner-Level Context (How this fits the product)
This is the legacy “add chapter by storyId” endpoint. It should be removed or fully aligned with the slug-based route. It currently supports chapter creation and uses story RBAC, but remains an extra surface area to maintain.

## Source (Entry Points)
- Route: `src/features/story/routes/story.routes.ts`
- Controller: `src/features/story/controllers/story.controller.ts`
- Services: `src/features/story/services/story-query.service.ts`, `src/features/chapter/services/chapter-crud.service.ts`
- Schema: `src/schema/request/story.schema.ts`

## Data Model & Relationships
- Uses Story ID to load the story then delegates to chapter creation.

## Auth & RBAC
- Requires authentication.
- `loadStoryContext` and `StoryRoleGuards.canWriteChapters` are used.

## Request
- Method: `POST`
- Path: `/api/stories/id/:storyId/chapters`
- Body: `StoryAddChapterSchema` (title, content, optional parentChapterSlug)

## Response
- `201 Created` with chapter payload.

## Observed Flow
1. Fetch story by ID (throws if not found).
2. If `parentChapterSlug` is missing or null, create root; else create child.

## Risks / Bugs / Loopholes
- **Deprecated but still active**: API surface area increases attack/maintenance cost.
- **Root chapter status**: `createRoot` always sets status to `PUBLISHED`; drafts aren’t possible here.
- **Missing validation of `parentChapterSlug`**: `null` vs `undefined` semantics are unclear to clients.

## Performance Bottlenecks
- Story lookup by ID for every request.
- Branch index calculation via `countSiblings` (same as other creation routes).

## Recommended Code Changes (Concrete)
1. **Deprecate and remove** in favor of slug route.
2. If retained, **align behavior** with slug route:
   - Explicitly parse `parentChapterSlug` and enforce root creation with `null`.
   - Allow `createRoot` to accept draft status.
3. Use a transaction for chapter creation + parent update.

## Index/DB Suggestions
- Ensure `Story._id` index exists (default in MongoDB).

## Suggested Tests
- Create root chapter with null parent.
- Create child chapter with valid parent slug.
- Attempt with insufficient role → 403.
