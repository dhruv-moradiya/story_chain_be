# API Review: GET /api/chapters/slug/:chapterSlug

## Owner-Level Context (How this fits the product)
This is the public chapter read endpoint. It powers the reader view and should enforce chapter visibility rules (published vs. draft/archived/deleted). It also drives SEO and sharing.

## Source (Entry Points)
- Route: `src/features/chapter/routes/chapter.routes.ts`
- Controller: `src/features/chapter/controllers/chapter.controller.ts`
- Service: `src/features/chapter/services/chapter-query.service.ts`
- Repository: `src/features/chapter/repositories/chapter.repository.ts`

## Data Model & Relationships
- Chapter is looked up by `slug` and may include story/author information depending on pipeline usage.

## Auth & RBAC
- No authentication required.
- No visibility checks beyond slug lookup.

## Request
- Method: `GET`
- Path: `/api/chapters/slug/:chapterSlug`
- Params: `chapterSlug`

## Response
- `200 OK` with `ApiResponse` and chapter details.
- `404 Not Found` when chapter is missing.

## Observed Flow
1. Controller reads `chapterSlug` and calls `chapterQueryService.getBySlug`.
2. Service calls `chapterRepo.findBySlug`, returning a lean chapter document.

## Risks / Bugs / Loopholes
- **Draft leakage:** Draft/archived/deleted chapters are publicly accessible if someone knows the slug.
- **Slug enumeration:** No rate limiting; can brute-force slugs.
- **No story visibility check:** If a story is private/unpublished, its chapters can still be fetched.

## Performance Bottlenecks
- Unfiltered `findBySlug` may return large content and nested fields.

## Recommended Code Changes (Concrete)
1. **Add visibility filtering**: Only return chapters with `status = PUBLISHED` for anonymous users.
   - File: `src/features/chapter/services/chapter-query.service.ts` (branch on auth)
2. **Add story visibility check**: If story is private/draft, require auth + role.
   - File: `src/features/chapter/controllers/chapter.controller.ts` (load story and gate)
3. **Rate limiting**: Add request throttling for public read endpoints.

## Index/DB Suggestions
- Add a compound index on `{ slug: 1, status: 1 }` if status filtering is added.
- Consider caching popular chapters in Redis to reduce DB hits.

## Suggested Tests
- Fetch published chapter anonymously.
- Fetch draft chapter anonymously → 404/403.
- Fetch draft chapter as author/collaborator → 200.
- Fetch by unknown slug → 404.
