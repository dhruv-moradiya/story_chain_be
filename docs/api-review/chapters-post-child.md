# API Review: POST /api/chapters/child

## Owner-Level Context (How this fits the product)
This endpoint creates a child chapter directly under a parent. It bypasses story routes and therefore must enforce the same RBAC rules as story-based chapter creation.

## Source (Entry Points)
- Route: `src/features/chapter/routes/chapter.routes.ts`
- Controller: `src/features/chapter/controllers/chapter.controller.ts`
- Service: `src/features/chapter/services/chapter-crud.service.ts`
- Repository: `src/features/chapter/repositories/chapter.repository.ts`
- Schema: `src/schema/request/chapter.schema.ts`

## Data Model & Relationships
- Uses `parentChapterSlug` to find parent, then creates child with `ancestorSlugs`, `depth`, `branchIndex`.

## Auth & RBAC
- Requires authentication.
- **No story RBAC checks** (unlike story routes).

## Request
- Method: `POST`
- Path: `/api/chapters/child`
- Body: `TCreateChapterSchema` (storySlug, title, content, status, parentChapterSlug)

## Response
- `200 OK` with created chapter.

## Observed Flow
1. Controller reads `request.body` and `request.user.clerkId`.
2. `chapterCrudService.createChild` validates parent chapter, story match, and computes hierarchy + branch index.
3. Chapter created and parent branch counter increments.

## Risks / Bugs / Loopholes
- **Schema not attached:** Route doesn’t apply `CreateChapterSchema` → invalid payloads can pass.
- **Response schema misconfigured:** Route uses `response: chapterController.createChild` instead of `ChapterResponses.chapterCreated`.
- **No RBAC enforcement:** Any authenticated user can create child chapters in any story by guessing `storySlug` and `parentChapterSlug`.
- **Status abuse:** `status` is accepted from client → users can create `PUBLISHED` content without review.

## Performance Bottlenecks
- Branch index computed via `countSiblings` (count query per write). Under concurrent writes, duplicates are possible.

## Recommended Code Changes (Concrete)
1. **Add schema validation** in route.
   - File: `src/features/chapter/routes/chapter.routes.ts`
2. **Add Story RBAC** guard (load story + canWriteChapters).
   - File: `src/features/chapter/routes/chapter.routes.ts`
3. **Remove `status` from client input** and set server-side policy (e.g., default DRAFT).
   - File: `src/features/chapter/services/chapter-crud.service.ts`
4. **Branch index race fix**: Use atomic counter on parent or transactions.
   - File: `src/features/chapter/repositories/chapter.repository.ts`

## Index/DB Suggestions
- Ensure compound index on `{ storySlug, parentChapterSlug }` (exists) for sibling count.

## Suggested Tests
- Unauthorized user cannot create child in a story.
- Valid child creation creates correct `ancestorSlugs` and `depth`.
- Concurrency test for unique `branchIndex`.
