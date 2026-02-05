# TSyringe Migration Guide - StoryChain Backend

A comprehensive guide for converting your entire application to use TSyringe dependency injection.

## Table of Contents

1. [Overview](#overview)
2. [Current Architecture](#current-architecture)
3. [Target Architecture](#target-architecture)
4. [Step-by-Step Migration](#step-by-step-migration)
5. [Token Organization](#token-organization)
6. [Service Migration](#service-migration)
7. [Repository Migration](#repository-migration)
8. [Controller Migration](#controller-migration)
9. [Route Migration](#route-migration)
10. [Handling Circular Dependencies](#handling-circular-dependencies)
11. [Testing with DI](#testing-with-di)
12. [Best Practices](#best-practices)

---

## Overview

### What is Dependency Injection?

Dependency Injection (DI) is a design pattern where dependencies are "injected" into a class rather than created inside it.

**Without DI:**
```typescript
class UserService {
  private readonly userRepo = new UserRepository(); // Hard-coded dependency
}
```

**With DI:**
```typescript
class UserService {
  constructor(
    @inject(TOKENS.UserRepository) private readonly userRepo: UserRepository
  ) {}
}
```

### Why Use TSyringe?

| Benefit | Description |
|---------|-------------|
| **Testability** | Easily mock dependencies in unit tests |
| **Loose Coupling** | Classes don't know how to create their dependencies |
| **Single Responsibility** | Each class focuses on its own logic |
| **Configurability** | Swap implementations without changing code |
| **Lifecycle Management** | Control singleton vs transient instances |

---

## Current Architecture

Your codebase currently uses **manual singleton pattern**:

```typescript
// Current pattern in services
export class UserService extends BaseModule {
  private readonly userRepo = new UserRepository();
  private readonly platformRoleService = new PlatformRoleService();

  // ... methods
}

export const userService = new UserService(); // Exported singleton
```

### Current Statistics

| Component | Count | Status |
|-----------|-------|--------|
| Services | 27 | Need migration |
| Controllers | 19 | Need migration |
| Repositories | 9 | Need migration |
| Routes | 18 | Minor updates |
| Config Services | 3 | ✅ Already using TSyringe |

### Problems with Current Approach

1. **Tight Coupling**: Services create their own dependencies
2. **Hard to Test**: Can't easily mock dependencies
3. **Circular Dependencies**: Services import each other directly
4. **No Interface Abstraction**: Bound to concrete implementations

---

## Target Architecture

After migration, your architecture will look like:

```
┌─────────────────────────────────────────────────────────────┐
│                     Container (TSyringe)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   TOKENS    │  │  Services   │  │    Repositories     │  │
│  │  (Symbols)  │──│ (Singleton) │──│    (Singleton)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Controllers                            │
│         (Resolved from container, injected services)         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         Routes                               │
│              (Use controllers from container)                │
└─────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Migration

### Phase 1: Setup Foundation

#### 1.1 Expand Tokens File

```typescript
// src/config/tokens.ts

export const TOKENS = {
  // ===== CONFIG SERVICES =====
  ConfigService: Symbol('ConfigService'),
  DatabaseService: Symbol('DatabaseService'),
  RedisService: Symbol('RedisService'),

  // ===== UTILITY SERVICES =====
  CacheService: Symbol('CacheService'),
  EmailService: Symbol('EmailService'),
  QueueService: Symbol('QueueService'),
  InviteTokenService: Symbol('InviteTokenService'),
  NotificationFactoryService: Symbol('NotificationFactoryService'),

  // ===== REPOSITORIES =====
  UserRepository: Symbol('UserRepository'),
  StoryRepository: Symbol('StoryRepository'),
  ChapterRepository: Symbol('ChapterRepository'),
  ChapterVersionRepository: Symbol('ChapterVersionRepository'),
  ChapterAutoSaveRepository: Symbol('ChapterAutoSaveRepository'),
  PullRequestRepository: Symbol('PullRequestRepository'),
  NotificationRepository: Symbol('NotificationRepository'),
  PlatformRoleRepository: Symbol('PlatformRoleRepository'),
  StoryCollaboratorRepository: Symbol('StoryCollaboratorRepository'),

  // ===== FEATURE SERVICES =====
  UserService: Symbol('UserService'),
  StoryService: Symbol('StoryService'),
  ChapterService: Symbol('ChapterService'),
  ChapterVersionService: Symbol('ChapterVersionService'),
  ChapterAutoSaveService: Symbol('ChapterAutoSaveService'),
  CommentService: Symbol('CommentService'),
  VoteService: Symbol('VoteService'),
  BookmarkService: Symbol('BookmarkService'),
  FollowService: Symbol('FollowService'),
  NotificationService: Symbol('NotificationService'),
  PullRequestService: Symbol('PullRequestService'),
  PrCommentService: Symbol('PrCommentService'),
  PrReviewService: Symbol('PrReviewService'),
  PrVoteService: Symbol('PrVoteService'),
  ReportService: Symbol('ReportService'),
  ReadingHistoryService: Symbol('ReadingHistoryService'),
  SessionService: Symbol('SessionService'),
  StoryCollaboratorService: Symbol('StoryCollaboratorService'),
  PlatformRoleService: Symbol('PlatformRoleService'),

  // ===== CONTROLLERS =====
  UserController: Symbol('UserController'),
  StoryController: Symbol('StoryController'),
  ChapterController: Symbol('ChapterController'),
  ChapterVersionController: Symbol('ChapterVersionController'),
  ChapterAutoSaveController: Symbol('ChapterAutoSaveController'),
  CommentController: Symbol('CommentController'),
  VoteController: Symbol('VoteController'),
  BookmarkController: Symbol('BookmarkController'),
  FollowController: Symbol('FollowController'),
  NotificationController: Symbol('NotificationController'),
  PullRequestController: Symbol('PullRequestController'),
  PrCommentController: Symbol('PrCommentController'),
  PrReviewController: Symbol('PrReviewController'),
  PrVoteController: Symbol('PrVoteController'),
  ReportController: Symbol('ReportController'),
  ReadingHistoryController: Symbol('ReadingHistoryController'),
  SessionController: Symbol('SessionController'),
  StoryCollaboratorController: Symbol('StoryCollaboratorController'),
} as const;

// Type helper for token keys
export type TokenKeys = keyof typeof TOKENS;
```

#### 1.2 Update Container File

```typescript
// src/container.ts

import 'reflect-metadata';

// ===== CONFIG SERVICES =====
import './config/config.service';
import './config/database.service';
import './config/redis.service';

// ===== UTILITY SERVICES =====
import './services/cache.service';
import './services/email.service';
import './services/queue.service';
import './services/inviteToken.service';
import './services/notificationFactory.service';

// ===== REPOSITORIES =====
import './features/user/repository/user.repository';
import './features/story/repository/story.repository';
import './features/chapter/repositories/chapter.repository';
import './features/chapterVersion/repositories/chapterVersion.repository';
import './features/chapterAutoSave/repository/chapterAutoSave.repository';
import './features/pullRequest/repositories/pullRequest.repository';
import './features/notification/repository/notification.repository';
import './features/platformRole/repository/platformRole.repository';
import './features/storyCollaborator/repository/storyCollaborator.repository';

// ===== FEATURE SERVICES =====
import './features/user/user.service';
import './features/story/story.service';
import './features/chapter/chapter.service';
import './features/chapterVersion/chapterVersion.service';
import './features/chapterAutoSave/chapterAutoSave.service';
import './features/comment/comment.service';
import './features/vote/vote.service';
import './features/bookmark/bookmark.service';
import './features/follow/follow.service';
import './features/notification/notification.service';
import './features/pullRequest/pullRequest.service';
import './features/prComment/prComment.service';
import './features/prReview/prReview.service';
import './features/prVote/prVote.service';
import './features/report/report.service';
import './features/readingHistory/readingHistory.service';
import './features/sesstion/sesstion.service';
import './features/storyCollaborator/storyCollaborator.service';
import './features/platformRole/platformRole.service';

// ===== CONTROLLERS =====
import './features/user/user.controller';
import './features/story/story.controller';
import './features/chapter/chapter.controller';
import './features/chapterVersion/chapterVersion.controller';
import './features/chapterAutoSave/chapterAutoSave.controller';
import './features/comment/comment.controller';
import './features/vote/vote.controller';
import './features/bookmark/bookmark.controller';
import './features/follow/follow.controller';
import './features/notification/notification.controller';
import './features/pullRequest/pullRequest.controller';
import './features/prComment/prComment.controller';
import './features/prReview/prReview.controller';
import './features/prVote/prVote.controller';
import './features/report/report.controller';
import './features/readingHistory/readingHistory.controller';
import './features/sesstion/sesstion.controller';
import './features/storyCollaborator/storyCollaborator.controller';

// Re-export container and tokens
import { container } from 'tsyringe';
export { container };
export { TOKENS } from './config/tokens';
```

---

## Service Migration

### Before Migration

```typescript
// src/features/user/user.service.ts (BEFORE)

import { UserRepository } from './repository/user.repository';
import { PlatformRoleService } from '../platformRole/platformRole.service';

export class UserService extends BaseModule {
  private readonly userRepo = new UserRepository();
  private readonly platformRoleService = new PlatformRoleService();

  async getUserById(id: string) {
    return this.userRepo.findById(id);
  }

  async getUserRole(userId: string) {
    return this.platformRoleService.getRoleByUserId(userId);
  }
}

export const userService = new UserService();
```

### After Migration

```typescript
// src/features/user/user.service.ts (AFTER)

import { inject, singleton, registry } from 'tsyringe';
import { TOKENS } from '../../config/tokens';
import { UserRepository } from './repository/user.repository';
import { PlatformRoleService } from '../platformRole/platformRole.service';

@singleton()
@registry([{ token: TOKENS.UserService, useClass: UserService }])
export class UserService extends BaseModule {
  constructor(
    @inject(TOKENS.UserRepository)
    private readonly userRepo: UserRepository,

    @inject(TOKENS.PlatformRoleService)
    private readonly platformRoleService: PlatformRoleService
  ) {
    super();
  }

  async getUserById(id: string) {
    return this.userRepo.findById(id);
  }

  async getUserRole(userId: string) {
    return this.platformRoleService.getRoleByUserId(userId);
  }
}

// Remove the singleton export!
// export const userService = new UserService(); ❌ DELETE THIS
```

### Service Migration Checklist

For each service file:

- [ ] Add imports: `import { inject, singleton, registry } from 'tsyringe'`
- [ ] Add `@singleton()` decorator
- [ ] Add `@registry([{ token: TOKENS.XxxService, useClass: XxxService }])` decorator
- [ ] Convert field dependencies to constructor parameters with `@inject()`
- [ ] Call `super()` in constructor if extending BaseModule
- [ ] Remove `export const xxxService = new XxxService()` at bottom
- [ ] Update imports in container.ts

---

## Repository Migration

### Before Migration

```typescript
// src/features/user/repository/user.repository.ts (BEFORE)

import { BaseRepository } from '../../../utils/baseClass';
import { User } from '../../../models/User';
import { IUser } from '../../../types/user.types';

export class UserRepository extends BaseRepository<IUser, IUser> {
  constructor() {
    super(User);
  }

  async findByEmail(email: string) {
    return this.findOne({ email });
  }
}
```

### After Migration

```typescript
// src/features/user/repository/user.repository.ts (AFTER)

import { singleton, registry } from 'tsyringe';
import { TOKENS } from '../../../config/tokens';
import { BaseRepository } from '../../../utils/baseClass';
import { User } from '../../../models/User';
import { IUser } from '../../../types/user.types';

@singleton()
@registry([{ token: TOKENS.UserRepository, useClass: UserRepository }])
export class UserRepository extends BaseRepository<IUser, IUser> {
  constructor() {
    super(User);
  }

  async findByEmail(email: string) {
    return this.findOne({ email });
  }
}
```

### Repository Migration Checklist

For each repository file:

- [ ] Add imports: `import { singleton, registry } from 'tsyringe'`
- [ ] Add `@singleton()` decorator
- [ ] Add `@registry([{ token: TOKENS.XxxRepository, useClass: XxxRepository }])` decorator
- [ ] Update imports in container.ts

---

## Controller Migration

### Before Migration

```typescript
// src/features/user/user.controller.ts (BEFORE)

import { FastifyRequest, FastifyReply } from 'fastify';
import { userService } from './user.service';

class UserController extends BaseModule {
  async getUser(request: FastifyRequest, reply: FastifyReply) {
    const user = await userService.getUserById(request.params.id);
    return reply.send(user);
  }
}

export const userController = new UserController();
```

### After Migration

```typescript
// src/features/user/user.controller.ts (AFTER)

import { FastifyRequest, FastifyReply } from 'fastify';
import { inject, singleton, registry } from 'tsyringe';
import { TOKENS } from '../../config/tokens';
import { UserService } from './user.service';

@singleton()
@registry([{ token: TOKENS.UserController, useClass: UserController }])
export class UserController extends BaseModule {
  constructor(
    @inject(TOKENS.UserService)
    private readonly userService: UserService
  ) {
    super();
  }

  async getUser(request: FastifyRequest, reply: FastifyReply) {
    const user = await this.userService.getUserById(request.params.id);
    return reply.send(user);
  }
}

// Remove singleton export!
// export const userController = new UserController(); ❌ DELETE THIS
```

---

## Route Migration

### Before Migration

```typescript
// src/features/user/user.routes.ts (BEFORE)

import { FastifyInstance } from 'fastify';
import { userController } from './user.controller';

export async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/users/:id', userController.getUser.bind(userController));
  fastify.post('/users', userController.createUser.bind(userController));
}
```

### After Migration

```typescript
// src/features/user/user.routes.ts (AFTER)

import { FastifyInstance } from 'fastify';
import { container } from '../../container';
import { TOKENS } from '../../config/tokens';
import { UserController } from './user.controller';

export async function userRoutes(fastify: FastifyInstance) {
  const userController = container.resolve<UserController>(TOKENS.UserController);

  fastify.get('/users/:id', userController.getUser.bind(userController));
  fastify.post('/users', userController.createUser.bind(userController));
}
```

### Alternative: Factory Pattern for Routes

```typescript
// src/features/user/user.routes.ts (Factory Pattern)

import { FastifyInstance } from 'fastify';
import { container } from '../../container';
import { TOKENS } from '../../config/tokens';
import type { UserController } from './user.controller';

export function createUserRoutes() {
  const controller = container.resolve<UserController>(TOKENS.UserController);

  return async function userRoutes(fastify: FastifyInstance) {
    fastify.get('/users/:id', controller.getUser.bind(controller));
    fastify.post('/users', controller.createUser.bind(controller));
  };
}
```

---

## Handling Circular Dependencies

Circular dependencies occur when Service A depends on Service B, and Service B depends on Service A.

### Problem Example

```typescript
// StoryService needs ChapterService
// ChapterService needs StoryService
// This creates a circular dependency!
```

### Solution 1: Lazy Injection with `delay()`

```typescript
import { inject, singleton, registry, delay } from 'tsyringe';
import { TOKENS } from '../../config/tokens';

@singleton()
@registry([{ token: TOKENS.StoryService, useClass: StoryService }])
export class StoryService {
  constructor(
    // Use delay() for circular dependencies
    @inject(delay(() => TOKENS.ChapterService))
    private readonly chapterService: ChapterService
  ) {}
}
```

### Solution 2: Interface + Factory Pattern

```typescript
// src/features/story/story.service.interface.ts
export interface IStoryService {
  getStoryById(id: string): Promise<Story>;
  getStoryBySlug(slug: string): Promise<Story>;
}

// Register factory that returns the implementation
container.register<IStoryService>(TOKENS.StoryService, {
  useFactory: (c) => c.resolve(StoryServiceImpl)
});
```

### Solution 3: Method Injection (Resolve at Runtime)

```typescript
@singleton()
export class ChapterService {
  constructor(
    @inject(TOKENS.ChapterRepository)
    private readonly chapterRepo: ChapterRepository
  ) {}

  // Resolve StoryService only when needed
  private get storyService(): StoryService {
    return container.resolve<StoryService>(TOKENS.StoryService);
  }

  async getChapterWithStory(chapterId: string) {
    const chapter = await this.chapterRepo.findById(chapterId);
    const story = await this.storyService.getStoryById(chapter.storyId);
    return { chapter, story };
  }
}
```

---

## Testing with DI

### Unit Testing with Mocks

```typescript
// src/features/user/__tests__/user.service.test.ts

import 'reflect-metadata';
import { container } from 'tsyringe';
import { TOKENS } from '../../../config/tokens';
import { UserService } from '../user.service';

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    // Create mock
    mockUserRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
    } as any;

    // Register mock in container
    container.registerInstance(TOKENS.UserRepository, mockUserRepo);

    // Resolve service (will use mock)
    userService = container.resolve<UserService>(TOKENS.UserService);
  });

  afterEach(() => {
    container.clearInstances();
  });

  it('should get user by id', async () => {
    const mockUser = { id: '123', name: 'Test User' };
    mockUserRepo.findById.mockResolvedValue(mockUser);

    const result = await userService.getUserById('123');

    expect(result).toEqual(mockUser);
    expect(mockUserRepo.findById).toHaveBeenCalledWith('123');
  });
});
```

### Creating Test Container

```typescript
// src/test/test-container.ts

import 'reflect-metadata';
import { container, DependencyContainer } from 'tsyringe';

export function createTestContainer(): DependencyContainer {
  const childContainer = container.createChildContainer();

  // Register test-specific implementations
  // childContainer.register(TOKENS.EmailService, { useClass: MockEmailService });

  return childContainer;
}
```

---

## Best Practices

### 1. Always Use Tokens (Symbols)

```typescript
// ✅ Good - Uses symbol token
@inject(TOKENS.UserService)
private readonly userService: UserService

// ❌ Bad - Uses class directly (works but less flexible)
@inject(UserService)
private readonly userService: UserService
```

### 2. One Class Per File

```typescript
// ✅ Good
// user.service.ts contains only UserService

// ❌ Bad
// user.service.ts contains UserService AND UserValidator
```

### 3. Consistent Decorator Order

```typescript
// ✅ Consistent order
@singleton()
@registry([{ token: TOKENS.UserService, useClass: UserService }])
export class UserService { }
```

### 4. Use Interfaces for External Dependencies

```typescript
// ✅ Good - Interface allows swapping implementations
interface IEmailProvider {
  send(to: string, subject: string, body: string): Promise<void>;
}

@singleton()
export class EmailService {
  constructor(
    @inject(TOKENS.EmailProvider)
    private readonly provider: IEmailProvider
  ) {}
}

// Register different implementations
container.register(TOKENS.EmailProvider, { useClass: SendGridProvider });
// OR
container.register(TOKENS.EmailProvider, { useClass: SESProvider });
```

### 5. Avoid Service Locator Pattern

```typescript
// ❌ Bad - Service Locator (anti-pattern)
class UserService {
  doSomething() {
    const emailService = container.resolve(TOKENS.EmailService); // Don't do this!
  }
}

// ✅ Good - Constructor Injection
class UserService {
  constructor(
    @inject(TOKENS.EmailService)
    private readonly emailService: EmailService
  ) {}

  doSomething() {
    this.emailService.send(...);
  }
}
```

### 6. Keep Container Setup Clean

```typescript
// src/container.ts

// Group imports by category with comments
// ===== CONFIG =====
import './config/config.service';

// ===== REPOSITORIES =====
import './features/user/repository/user.repository';

// ===== SERVICES =====
import './features/user/user.service';

// ===== CONTROLLERS =====
import './features/user/user.controller';
```

---

## Migration Order

Recommended order to minimize breaking changes:

### Phase 1: Foundation (Do First)
1. ✅ Expand `tokens.ts` with all symbols
2. ✅ Update `container.ts` structure

### Phase 2: Repositories (No Dependencies)
3. Migrate all repository files (they have no service dependencies)

### Phase 3: Utility Services
4. Migrate utility services (`cache.service`, `email.service`, etc.)

### Phase 4: Feature Services (Bottom-Up)
5. Start with services that have **fewest dependencies**:
   - `PlatformRoleService`
   - `BookmarkService`
   - `VoteService`
   - `FollowService`

6. Then services with moderate dependencies:
   - `UserService`
   - `NotificationService`
   - `CommentService`

7. Finally, services with many dependencies:
   - `StoryService`
   - `ChapterService`
   - `PullRequestService`

### Phase 5: Controllers
8. Migrate all controllers (after their services are migrated)

### Phase 6: Routes
9. Update route files to resolve from container

### Phase 7: Cleanup
10. Remove all `export const xxxService = new XxxService()` exports
11. Run tests and fix any issues
12. Update documentation

---

## Quick Reference

### Decorator Imports

```typescript
import { inject, singleton, registry, delay } from 'tsyringe';
```

### Service Template

```typescript
import { inject, singleton, registry } from 'tsyringe';
import { TOKENS } from '../../config/tokens';

@singleton()
@registry([{ token: TOKENS.XxxService, useClass: XxxService }])
export class XxxService extends BaseModule {
  constructor(
    @inject(TOKENS.XxxRepository)
    private readonly xxxRepo: XxxRepository
  ) {
    super();
  }
}
```

### Repository Template

```typescript
import { singleton, registry } from 'tsyringe';
import { TOKENS } from '../../../config/tokens';

@singleton()
@registry([{ token: TOKENS.XxxRepository, useClass: XxxRepository }])
export class XxxRepository extends BaseRepository<IXxx, IXxx> {
  constructor() {
    super(XxxModel);
  }
}
```

### Controller Template

```typescript
import { inject, singleton, registry } from 'tsyringe';
import { TOKENS } from '../../config/tokens';

@singleton()
@registry([{ token: TOKENS.XxxController, useClass: XxxController }])
export class XxxController extends BaseModule {
  constructor(
    @inject(TOKENS.XxxService)
    private readonly xxxService: XxxService
  ) {
    super();
  }
}
```

### Resolving from Container

```typescript
import { container, TOKENS } from './container';

const userService = container.resolve<UserService>(TOKENS.UserService);
```

---

## Summary

| What | How |
|------|-----|
| Register a class | `@singleton()` + `@registry([{ token, useClass }])` |
| Inject a dependency | `@inject(TOKENS.Xxx)` in constructor |
| Handle circular deps | Use `delay()` or method injection |
| Resolve manually | `container.resolve<Type>(TOKENS.Xxx)` |
| Test with mocks | `container.registerInstance(TOKEN, mock)` |

This migration will make your codebase more maintainable, testable, and flexible!
