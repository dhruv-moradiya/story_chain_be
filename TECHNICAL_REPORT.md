# Technical Report: StoryChain Backend (BE)

## 1. Project Overview
The StoryChain Backend is a Node.js application built using **TypeScript**, **Fastify**, and **Mongoose** (MongoDB). It follows a **Feature-Based Architecture**, where each domain (e.g., Story, Chapter, User) has its own directory containing controllers, services, repositories, and types. Dependency Injection is managed via `tsyringe`.

**Key Architectural Observations:**
-   **Framework**: Fastify (evident from `FastifyRequest` usage).
-   **Database**: MongoDB with Mongoose ODMs.
-   **Dependency Injection**: `tsyringe` container usage.
-   **Authentication**: Clerk is used for identity management.

## 2. API Review Summary
The API surface is well-structured around RESTful principles. However, a critical discovery is the **absence of implementation** for key features despite the presence of route definitions.

*   **Story & Chapter APIs**: Seem fully implemented with extensive logic for CRUD, branching, and publishing.
*   **Reading History API**: The controller (`src/features/readingHistory/controllers/readingHistory.controller.ts`) and service appear to be **empty/stub files**. Any endpoints routed here will likely fail or return empty responses.
*   **Scheduled Jobs**: The `src/jobs/scheduled.job.ts` file is empty. This implies that features relying on background processing (e.g., Trending Score updates) are **not functional**.

## 3. Bugs Found

### 3.1. Autosave Duplicate Creation (Race Condition)
*   **Location**: `src/features/chapterAutoSave/repositories/chapterAutoSave.repository.ts` inside `enableAutoSave` method.
*   **Description**: The method uses `this.model.create(baseFields)` instead of an upsert operation.
*   **Impact**: If a user (or the frontend) triggers "Enable Autosave" twice in rapid succession (e.g., double-click or network retry), **two duplicate autosave documents** will be created. The schema lacks a unique compound index to prevent this.
*   **Suggested Fix**: Change `create` to `findOneAndUpdate` with `upsert: true`, similar to the (unused?) `enableAutoSaveForChapter` method in the same file.

### 3.2. Branch Index Collision (Race Condition)
*   **Location**: `src/features/chapter/services/chapter-crud.service.ts` inside `createChild`.
*   **Description**: The logic calculates the `branchIndex` by counting siblings (`countSiblings`) and then adding 1. This is not atomic.
*   **Impact**: If two users publish a branch from the same parent chapter simultaneously, they will both read the same sibling count and be assigned the **same `branchIndex`**.
*   **Suggested Fix**: This is harder to fix with just MongoDB. Options:
    1.  Accept the collision (if ordering strictly doesn't matter).
    2.  Use a distributed lock (e.g., Redis) around the creation block for a specific parent chapter.
    3.  Use an optimistic locking strategy or a dedicated counter collection.

### 3.3. Missing Business Logic
*   **Location**: `src/features/readingHistory` and `src/jobs`.
*   **Description**: As noted in the API review, these files are empty.
*   **Impact**: User reading history is not tracked, and "Trending" stories will never update their scores automatically.

## 4. Race Conditions & Concurrency Risks

### 4.1. Autosave Updates
The `AutoSaveContentService.handleUpdateAutoSave` fetches the document, checks ownership, and then updates it. While `chapterAutoSaveRepo.updateAutoSave` might be atomic, the gap between "read" and "write" in the service allows for lost updates if valid permissions change in between (rare but possible). The primary risk remains the **creation** race condition mentioned in Bug 3.1.

### 4.2. "Next Chapter" Tree Integrity
The system relies on a Materialized Path pattern (`ancestorSlugs`).
*   **Risk**: If a parent chapter is moved or deleted while a child is being created, the child could be orphaned or have an incorrect path.
*   **Mitigation**: The system does verify parent existence, but without transactions (or if transactions are not used correctly across the full operation), consistency isn't guaranteed. `ChapterCrudService` methods do accept a `session`, which suggests transactions *can* be used, which is good.

## 5. Performance & Scalability Findings

### 5.1. Authentication Overhead
*   **Observation**: The `validateAuth` middleware (`src/middlewares/authHandler.ts`) calls `userService.getOrCreateUser` AND `platformRoleRepo.findByUserId` on **every request**.
*   **Impact**: This doubles the database load for every authenticated API hit.
*   **Optimization**: Implement a short-lived cache (Redis or in-memory) for user profiles and roles.

### 5.2. Aggregation Complexity
*   **Observation**: `ChapterRepository.findByIdWithDetails` performs multiple `$lookup` stages (joining Story and User).
*   **Impact**: While fine for individual fetches, if this pattern is used in lists (N+1 problem), it will degrade performance significantly.
*   **Optimization**: Ensure list endpoints use lighter queries and only fetch full details for "Single Item" views.

### 5.3. Text Search
*   **Observation**: `Story` model uses `text` indexes on `title` and `description`.
*   **Impact**: MongoDB standard text search can be resource-intensive and slow at scale.
*   **Optimization**: If the dataset grows large, migrate search to **MongoDB Atlas Search** or **Elasticsearch**.

## 6. Code Quality & Maintainability
*   **Pros**:
    *   Clear separation of concerns (Features, Services, Repositories).
    *   Use of Dependency Injection (`tsyringe`) makes testing easier.
    *   Strong typing with TypeScript.
*   **Cons**:
    *   **Dead Code**: The empty files for Reading History and Jobs are confusing and should be either implemented or removed.
    *   **Inconsistent naming**: `chapterAutoSave.modal.ts` (typo: should be `model.ts`). `story-gaurd.service.ts` (typo: should be `guard`).

## 7. Security Concerns
*   **Authorization**: The system relies on `Clerk` for authentication, which is robust. However, authorization (RBAC) is often handled manually in services (e.g., `CollaboratorInvitationService` manually checks roles).
*   **Risk**: Manual checks are prone to being forgotten during refactoring or new feature additions.
*   **Recommendation**: Standardize RBAC using the middleware factories already present (`platformRole.middleware.factory.ts`) or a dedicated Guard/Policy pattern for all sensitive actions.

## 8. High-Priority Action Items
1.  **Implement or Remove**: Finish the `ReadingHistory` and `ScheduledJob` logic.
2.  **Fix Autosave Race**: Update `ChapterAutoSaveRepository` to use `findOneAndUpdate` with upsert.
3.  **Optimize Auth**: Add caching to `validateAuth`.
4.  **Rename Files**: Fix typos in `chapterAutoSave.modal.ts` and `story-gaurd.service.ts`.
