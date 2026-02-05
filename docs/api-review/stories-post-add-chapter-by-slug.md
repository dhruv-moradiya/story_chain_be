# API Review: POST /api/stories/slug/:slug/chapters

## Owner-Level Context (How this fits the product)
This is the main chapter creation path used by editors and collaborators. It must enforce story RBAC, prevent accidental publish, and handle concurrency when multiple users add chapters at once.

## Source (Entry Points)
- Route: `src/features/story/routes/story.routes.ts`
- Controller: `src/features/story/controllers/story.controller.ts`
- Services: `src/features/story/services/story-query.service.ts`, `src/features/chapter/services/chapter-crud.service.ts`
- Schema: `src/schema/request/story.schema.ts`

## Data Model & Relationships
- Fetches story by slug, then creates root or child chapter.
- Child chapters link to `parentChapterSlug`, `ancestorSlugs`, `depth`, `branchIndex`.

## Auth & RBAC
- Requires authentication.
- Uses `loadStoryContextBySlug` + `StoryRoleGuards.canWriteChapters`.

## Request
- Method: `POST`
- Path: `/api/stories/slug/:slug/chapters`
- Body: `StoryAddChapterBySlugSchema` (title, content, optional parentChapterSlug; `"root"` maps to null)

## Response
- `201 Created` with chapter payload.

## Observed Flow
1. Load story by slug.
2. If `parentChapterSlug` falsy → createRoot; else createChild.

## Risks / Bugs / Loopholes
- **Root chapters always published:** `createRoot` hardcodes `PUBLISHED`, which can publish drafts unintentionally.
- **Branch index race:** `countSiblings + 1` under concurrency can create duplicate branch indices.
- **No check against story settings:** If story forbids branching, the endpoint still allows creating child chapters.

## Performance Bottlenecks
- Branch count query per creation.
- Parent fetch + update per creation.

## Recommended Code Changes (Concrete)
1. **Allow root creation with draft status**:
   - Add optional `status` to `createRoot` in `chapter-crud.service.ts`.
2. **Enforce story settings** (e.g., `allowBranching`, `requireApproval`) at creation time.
   - File: `src/features/story/controllers/story.controller.ts`
3. **Fix branch index race** by using a counter in parent stats or transactions.

## Index/DB Suggestions
- Ensure `{ storySlug, parentChapterSlug }` index exists for sibling count.
- Add index for `{ storySlug, depth }` if tree queries are frequent.

## Suggested Tests
- Create root with `parentChapterSlug: "root"`.
- Create child only if story allows branching.
- Concurrent child creation yields unique branch indices.
