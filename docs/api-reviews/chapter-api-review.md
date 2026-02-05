# API Review: `/slug/:slug/chapters` (Add Chapter)

## Overview

**Endpoint**: `POST /slug/:slug/chapters`
**Controller**: `StoryController.addChapterToStoryBySlug`
**Service**: `ChapterCrudService.createChild` / `createRoot`

This endpoint allows users to add new chapters to a story.

## 🚨 Loopholes & Critical Issues

### 1. 🏎️ Race Condition in Branch Indexing

**Severity: High**
The logic to determine the `branchIndex` for a new chapter is not atomic:

```typescript
// ChapterCrudService
const siblingCount = await this.chapterRepo.countSiblings(...);
const branchIndex = siblingCount + 1;
// ... then create
```

**Scenario**: Two users submit a child chapter to the same parent at the exact same time.

1.  Request A counts 5 siblings.
2.  Request B counts 5 siblings.
3.  Request A saves chapter with `branchIndex: 6`.
4.  Request B saves chapter with `branchIndex: 6`.
    **Result**: Two chapters have the same index, breaking the ordering logic in the UI.

**Fix**: Use an atomic counter (like `FindOneAndUpdate` on a counter collection) or a unique compound index `{ parentChapterSlug: 1, branchIndex: 1 }` to force one to fail.

### 2. 🕳️ Infinite Depth (Recursion Risk)

**Severity: Medium**
There is no explicit check for `depth` limit in `createChild`.
**Scenario**: A user (or bot) programmatically nests chapters: `Chapter 1 -> 1.1 -> 1.1.1 ... -> 1.1.1...1 (depth 5000)`.
**Result**:

- Recursive queries for the tree structure will likely crash the server or time out.
- UI rendering nested components will crash the browser (stack overflow).

**Fix**: Add a `MAX_DEPTH` constant (e.g., 50) and validate:

```typescript
if (parentChapter.depth >= MAX_DEPTH) {
  throw new BadRequestError('Maximum chapter depth reached');
}
```

### 3. 🔍 Missing "List Chapters" Endpoint

**Severity: Medium (Feature Gap)**
There is no `GET /slug/:slug/chapters` endpoint.

- **Current State**: Consumers must use `GET /slug/:slug/tree` to get _all_ chapters.
- **Problem**: As the story grows (1000+ chapters), fetching the massive tree structure becomes slow and resource-heavy.
- **Improvement**: Implement a paginated list endpoint: `GET /slug/:slug/chapters?page=1&limit=20`.

### 4. 👻 Soft Delete & Index Re-use

**Severity: Low**
`countSiblings` only counts `PUBLISHED` or `DRAFT` chapters.
**Scenario**:

1.  User creates 3 chapters (Indices 1, 2, 3).
2.  User deletes Chapter 2.
3.  User creates new Chapter. `count` is 2. New Index is 3.
4.  **Collision**: We now have two chapters with Index 3 (one active, one active).
    _Wait, the logic is `count + 1`. If we have 1, 3 (count=2) -> new index = 3. Yes, collision with existing Index 3._
    _Actually, if we have 1, 2, 3 and delete 2. Active are 1, 3. Count is 2. New one gets index 3. Collision with existing 3._

**Fix**: Instead of `count()`, query the **max** `branchIndex` of siblings and increment it.

```typescript
const lastSibling = await this.chapterRepo.findLastSibling(parentChapterSlug);
const branchIndex = (lastSibling?.branchIndex || 0) + 1;
```

## ✅ Improvements & Best Practices

1.  **Add Rate Limiting**: Ensure a user can't spam 100 chapters/minute.
2.  **Explicit Depth Validation**: prevent deep nesting attacks.
3.  **Atomic Indexing**: Fix the race condition.
4.  **Content Validation**: Ensure strictly typed content (if using rich text/JSON) to prevent XSS if not handled on frontend.
5.  **Pagination Support**: Create the missing GET endpoint.

## Proposed GET Endpoint Design

```typescript
GET /slug/:slug/chapters

Query Params:
- page: number
- limit: number
- parentChapterSlug: string (optional, to get direct children)
- depth: number (optional)

Response:
{
  data: [ ...chapters ],
  meta: { total, page, pages }
}
```
