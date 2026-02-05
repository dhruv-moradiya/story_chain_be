# Tsyringe Dependency Injection - Comprehensive Improvement Guide

## Table of Contents

1. [Current Implementation Analysis](#1-current-implementation-analysis)
2. [Critical Issues Identified](#2-critical-issues-identified)
3. [Architecture Overview](#3-architecture-overview)
4. [Detailed Improvements](#4-detailed-improvements)
5. [Implementation Examples](#5-implementation-examples)
6. [Migration Strategy](#6-migration-strategy)
7. [Best Practices Checklist](#7-best-practices-checklist)
8. [IModule Pattern Deep Dive](#8-imodule-pattern-deep-dive)

---

## 1. Current Implementation Analysis

### 1.1 What's Working Well

Your infrastructure services are properly configured with tsyringe:

```typescript
// src/config/services/database.service.ts
@singleton()
@registry([{ token: TOKENS.DatabaseService, useClass: DatabaseService }])
class DatabaseService {
  constructor(
    @inject(TOKENS.ConfigService)
    private readonly config: ConfigService
  ) {}
}
```

**Positives:**

- ✅ `reflect-metadata` imported correctly at entry point
- ✅ Symbol-based tokens for type-safe resolution
- ✅ `@singleton()` decorator for single instances
- ✅ `@registry()` for self-registration
- ✅ Constructor injection with `@inject()`
- ✅ Proper TypeScript configuration (`experimentalDecorators`, `emitDecoratorMetadata`)

### 1.2 Current Container Setup

```typescript
// src/container/index.ts
import 'reflect-metadata';

import '@config/services/config.service';
import '@config/services/database.service';
import '@config/services/redis.service';

import { container } from 'tsyringe';

export { container };
export { TOKENS } from './tokens';
```

### 1.3 Current Tokens

```typescript
// src/container/tokens.ts
export const TOKENS = {
  ConfigService: Symbol('ConfigService'),
  DatabaseService: Symbol('DatabaseService'),
  RedisService: Symbol('RedisService'),
};
```

**Problem:** Only 3 tokens exist - all 19+ feature services are NOT using the DI container.

---

## 2. Critical Issues Identified

### 2.1 Hybrid/Incomplete DI Pattern

**Issue:** Your codebase uses TWO different patterns for dependency management:

| Layer            | Pattern Used               | Count           |
| ---------------- | -------------------------- | --------------- |
| Infrastructure   | Tsyringe DI                | 3 services      |
| Feature Services | Manual Singletons          | 19+ services    |
| Repositories     | Manual `new` instantiation | 15+ repos       |
| Controllers      | Manual Singletons          | 15+ controllers |

**Current Feature Service Pattern (Anti-Pattern):**

```typescript
// src/features/user/services/user.service.ts
export class UserService extends BaseModule {
  // ❌ Direct instantiation - NOT injected
  private readonly userRepo = new UserRepository();
  private readonly platformRoleService = new PlatformRoleService();

  // ... methods
}

// ❌ Manual singleton export
export const userService = new UserService();
```

### 2.2 Tight Coupling

Services directly instantiate their dependencies:

```typescript
// src/features/story/services/story.service.ts
export class StoryService extends BaseModule {
  private readonly storyRepo = new StoryRepository(); // ❌
  private readonly chapterService = new ChapterService(); // ❌
  private readonly chapterRepo = new ChapterRepository(); // ❌
  private readonly storyCollaboratorService = new StoryCollaboratorService(); // ❌
}
```

**Problems:**

- Cannot swap implementations for testing
- Cannot use different implementations per environment
- Circular dependency risks
- No lazy loading capability

### 2.3 Testing Challenges

With the current pattern:

```typescript
// ❌ Hard to test - dependencies are internal
const userService = new UserService();

// How do you mock UserRepository? You can't without:
// 1. Modifying the class
// 2. Using complex module mocking (jest.mock)
// 3. Monkey-patching
```

### 2.4 No Interface Abstraction

Services depend on concrete implementations, not abstractions:

```typescript
// ❌ Current - depends on concrete class
private readonly userRepo = new UserRepository();

// ✅ Should be - depends on interface
constructor(@inject(TOKENS.UserRepository) private userRepo: IUserRepository)
```

### 2.5 BaseModule Inheritance Anti-Pattern

```typescript
export class UserService extends BaseModule {
  // Inherits logging and error handling
}
```

**Issues:**

- Mixes concerns (business logic + logging + errors)
- Inheritance over composition
- Harder to test - must mock inherited methods
- All services carry same baggage

---

## 3. Architecture Overview

### 3.1 Current Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Fastify Routes                        │
│   (imports controller singletons directly)              │
├────────────────────────────────────────────────────────┤
│                    Controllers                          │
│   (imports service singletons, extends BaseModule)      │
├────────────────────────────────────────────────────────┤
│                     Services                            │
│   (new Repositories(), new Services(), BaseModule)      │
├────────────────────────────────────────────────────────┤
│                   Repositories                          │
│   (extends BaseRepository, uses Mongoose)               │
├────────────────────────────────────────────────────────┤
│              Infrastructure Services                    │
│   ConfigService, DatabaseService, RedisService          │
│   (✅ ONLY THESE use tsyringe properly)                 │
├────────────────────────────────────────────────────────┤
│                  Tsyringe Container                     │
│   (manages only 3 services)                             │
└────────────────────────────────────────────────────────┘
```

### 3.2 Target Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Fastify Routes                        │
│   (resolves controllers from container)                 │
├────────────────────────────────────────────────────────┤
│                    Controllers                          │
│   (@injectable, injects services via constructor)       │
├────────────────────────────────────────────────────────┤
│                     Services                            │
│   (@singleton, injects repos/services via constructor)  │
├────────────────────────────────────────────────────────┤
│                   Repositories                          │
│   (@injectable, injects database connection)            │
├────────────────────────────────────────────────────────┤
│              Infrastructure Services                    │
│   ConfigService, DatabaseService, RedisService          │
├────────────────────────────────────────────────────────┤
│                  Tsyringe Container                     │
│   (manages ALL services - single source of truth)       │
└────────────────────────────────────────────────────────┘
```

---

## 4. Detailed Improvements

### 4.1 Expand Token Registry

**Current:**

```typescript
export const TOKENS = {
  ConfigService: Symbol('ConfigService'),
  DatabaseService: Symbol('DatabaseService'),
  RedisService: Symbol('RedisService'),
};
```

**Improved:**

```typescript
// src/container/tokens.ts
export const TOKENS = {
  // Infrastructure
  ConfigService: Symbol('ConfigService'),
  DatabaseService: Symbol('DatabaseService'),
  RedisService: Symbol('RedisService'),

  // Repositories
  UserRepository: Symbol('UserRepository'),
  StoryRepository: Symbol('StoryRepository'),
  ChapterRepository: Symbol('ChapterRepository'),
  CommentRepository: Symbol('CommentRepository'),
  BookmarkRepository: Symbol('BookmarkRepository'),
  FollowRepository: Symbol('FollowRepository'),
  VoteRepository: Symbol('VoteRepository'),
  NotificationRepository: Symbol('NotificationRepository'),
  PlatformRoleRepository: Symbol('PlatformRoleRepository'),
  ReadingHistoryRepository: Symbol('ReadingHistoryRepository'),
  PullRequestRepository: Symbol('PullRequestRepository'),
  PRCommentRepository: Symbol('PRCommentRepository'),
  PRVoteRepository: Symbol('PRVoteRepository'),
  PRReviewRepository: Symbol('PRReviewRepository'),
  ReportRepository: Symbol('ReportRepository'),
  SessionRepository: Symbol('SessionRepository'),
  StoryCollaboratorRepository: Symbol('StoryCollaboratorRepository'),
  ChapterVersionRepository: Symbol('ChapterVersionRepository'),
  ChapterAutoSaveRepository: Symbol('ChapterAutoSaveRepository'),

  // Services
  UserService: Symbol('UserService'),
  StoryService: Symbol('StoryService'),
  ChapterService: Symbol('ChapterService'),
  CommentService: Symbol('CommentService'),
  BookmarkService: Symbol('BookmarkService'),
  FollowService: Symbol('FollowService'),
  VoteService: Symbol('VoteService'),
  NotificationService: Symbol('NotificationService'),
  PlatformRoleService: Symbol('PlatformRoleService'),
  ReadingHistoryService: Symbol('ReadingHistoryService'),
  PullRequestService: Symbol('PullRequestService'),
  PRCommentService: Symbol('PRCommentService'),
  PRVoteService: Symbol('PRVoteService'),
  PRReviewService: Symbol('PRReviewService'),
  ReportService: Symbol('ReportService'),
  SessionService: Symbol('SessionService'),
  StoryCollaboratorService: Symbol('StoryCollaboratorService'),
  ChapterVersionService: Symbol('ChapterVersionService'),
  ChapterAutoSaveService: Symbol('ChapterAutoSaveService'),

  // Controllers
  UserController: Symbol('UserController'),
  StoryController: Symbol('StoryController'),
  ChapterController: Symbol('ChapterController'),
  // ... etc

  // Shared/Utility
  Logger: Symbol('Logger'),
  ErrorHandler: Symbol('ErrorHandler'),
} as const;

// Type helper for token keys
export type TokenKey = keyof typeof TOKENS;
```

### 4.2 Define Service Interfaces

Create interfaces for all services to enable dependency inversion:

```typescript
// src/features/user/interfaces/user-service.interface.ts
import { IUser } from '../types/user.types';
import { IUserCreateDTO, ILoginUserDTO } from '@dto/user.dto';
import { SignInToken } from '@clerk/fastify';

export interface IUserService {
  loginUser(input: ILoginUserDTO): Promise<SignInToken>;
  createUser(input: IUserCreateDTO): Promise<IUser>;
  getUserById(userId: string): Promise<IUser | null>;
  getUserByUsername(username: string): Promise<IUser | null>;
  searchUserByUsername(input: { username: string }): Promise<IUser[]>;
}
```

```typescript
// src/features/user/interfaces/user-repository.interface.ts
import { IUser } from '../types/user.types';
import { IOperationOptions } from '@/types';

export interface IUserRepository {
  create(data: Partial<IUser>, options?: IOperationOptions): Promise<IUser>;
  findByClerkId(clerkId: string): Promise<IUser | null>;
  findOneByUsername(username: string): Promise<IUser | null>;
  findByUsername(username: string): Promise<IUser[]>;
  count(filter: object, options?: IOperationOptions): Promise<number>;
}
```

### 4.3 Refactor Services for Constructor Injection

**Before:**

```typescript
export class UserService extends BaseModule {
  private readonly userRepo = new UserRepository();
  private readonly platformRoleService = new PlatformRoleService();
  // ...
}
export const userService = new UserService();
```

**After:**

```typescript
// src/features/user/services/user.service.ts
import { injectable, inject } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { IUserService } from '../interfaces/user-service.interface';
import { IUserRepository } from '../interfaces/user-repository.interface';
import { IPlatformRoleService } from '@features/platformRole/interfaces/platform-role-service.interface';
import { ILogger } from '@shared/interfaces/logger.interface';

@injectable()
export class UserService implements IUserService {
  constructor(
    @inject(TOKENS.UserRepository) private readonly userRepo: IUserRepository,
    @inject(TOKENS.PlatformRoleService) private readonly platformRoleService: IPlatformRoleService,
    @inject(TOKENS.Logger) private readonly logger: ILogger
  ) {}

  async loginUser(input: ILoginUserDTO): Promise<SignInToken> {
    const signToken = await clerkClient.signInTokens.createSignInToken({
      userId: input.userId,
      expiresInSeconds: 2592000,
    });

    if (!signToken.token) {
      throw ApiError.unauthorized('Failed to generate sign-in token.');
    }

    return signToken;
  }

  async createUser(input: IUserCreateDTO) {
    return await withTransaction('Creating new user', async (session) => {
      const newUser = await this.userRepo.create(input, { session });
      const totalUsers = await this.userRepo.count({}, { session });
      const role = UserRules.determineInitialRole(totalUsers);
      await this.platformRoleService.assignRole({ userId: newUser.clerkId, role }, { session });
      return newUser;
    });
  }

  // ... other methods
}
```

### 4.4 Register Services in Container

**Option A: Self-Registration with @registry (Current pattern)**

```typescript
// src/features/user/services/user.service.ts
@singleton()
@registry([{ token: TOKENS.UserService, useClass: UserService }])
export class UserService implements IUserService {
  // ...
}
```

**Option B: Centralized Registration (Recommended for large apps)**

```typescript
// src/container/modules/user.module.ts
import { DependencyContainer } from 'tsyringe';
import { IModule } from '../types';
import { TOKENS } from '../tokens';
import { UserService } from '@features/user/services/user.service';
import { UserRepository } from '@features/user/repositories/user.repository';
import { UserController } from '@features/user/controllers/user.controller';

export class UserModule implements IModule {
  register(container: DependencyContainer): void {
    container.registerSingleton(TOKENS.UserRepository, UserRepository);
    container.registerSingleton(TOKENS.UserService, UserService);
    container.registerSingleton(TOKENS.UserController, UserController);
  }
}
```

```typescript
// src/container/index.ts
import 'reflect-metadata';
import { container } from 'tsyringe';

// Infrastructure
import '@config/services/config.service';
import '@config/services/database.service';
import '@config/services/redis.service';

// Feature Modules
import { UserModule } from './modules/user.module';
import { StoryModule } from './modules/story.module';
import { ChapterModule } from './modules/chapter.module';
// ... other modules

// Register all modules
const modules: IModule[] = [
  new UserModule(),
  new StoryModule(),
  new ChapterModule(),
  // ... other modules
];

modules.forEach((module) => module.register(container));

export { container };
export { TOKENS } from './tokens';
```

### 4.5 Refactor Repositories

```typescript
// src/features/user/repositories/user.repository.ts
import { injectable, inject } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { IUserRepository } from '../interfaces/user-repository.interface';
import { UserModel, UserDocument } from '../models/user.model';
import { IUser } from '../types/user.types';
import { BaseRepository } from '@utils/baseClass';

@injectable()
export class UserRepository extends BaseRepository<IUser, UserDocument> implements IUserRepository {
  constructor() {
    super(UserModel);
  }

  async findByClerkId(clerkId: string): Promise<IUser | null> {
    return this.findOne({ clerkId });
  }

  async findOneByUsername(username: string): Promise<IUser | null> {
    return this.findOne({ username });
  }

  async findByUsername(username: string): Promise<IUser[]> {
    return this.findMany({
      username: { $regex: username, $options: 'i' },
    });
  }
}
```

### 4.6 Refactor Controllers

```typescript
// src/features/user/controllers/user.controller.ts
import { injectable, inject } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { FastifyRequest, FastifyReply } from 'fastify';
import { IUserService } from '../interfaces/user-service.interface';
import { ApiResponse } from '@utils/apiResponse';
import { catchAsync } from '@utils/catchAsync';

@injectable()
export class UserController {
  constructor(@inject(TOKENS.UserService) private readonly userService: IUserService) {}

  login = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.body as { userId: string };
    const token = await this.userService.loginUser({ userId });
    return reply.send(new ApiResponse(true, 'Login successful', token));
  });

  create = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await this.userService.createUser(request.body);
    return reply.status(201).send(new ApiResponse(true, 'User created', user));
  });

  // ... other methods
}
```

### 4.7 Update Routes to Use Container

```typescript
// src/features/user/routes/user.routes.ts
import { FastifyInstance } from 'fastify';
import { container } from '@container/index';
import { TOKENS } from '@container/tokens';
import { UserController } from '../controllers/user.controller';
import { UserApiRoutes } from '@routes/apiRoutes';

export async function userRoutes(fastify: FastifyInstance) {
  // Resolve controller from container
  const userController = container.resolve<UserController>(TOKENS.UserController);

  fastify.post(
    UserApiRoutes.Login,
    {
      schema: {
        /* ... */
      },
    },
    userController.login
  );

  fastify.post(
    UserApiRoutes.Create,
    {
      schema: {
        /* ... */
      },
    },
    userController.create
  );

  // ... other routes
}
```

### 4.8 Replace BaseModule with Composition

**Before (Inheritance):**

```typescript
export class UserService extends BaseModule {
  // Inherits logger, error methods
}
```

**After (Composition):**

```typescript
// src/shared/interfaces/logger.interface.ts
export interface ILogger {
  info(message: string, data?: unknown): void;
  error(message: string, error?: unknown): void;
  debug(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
}

// src/shared/services/logger.service.ts
import { singleton, registry } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { logger as winstonLogger } from '@utils/logger';
import { ILogger } from '../interfaces/logger.interface';

@singleton()
@registry([{ token: TOKENS.Logger, useClass: LoggerService }])
export class LoggerService implements ILogger {
  info(message: string, data?: unknown): void {
    winstonLogger.info(message, data);
  }

  error(message: string, error?: unknown): void {
    winstonLogger.error(message, error);
  }

  debug(message: string, data?: unknown): void {
    winstonLogger.debug?.(message, data);
  }

  warn(message: string, data?: unknown): void {
    winstonLogger.warn(message, data);
  }
}

// Usage in service
@injectable()
export class UserService implements IUserService {
  constructor(
    @inject(TOKENS.Logger) private readonly logger: ILogger
    // ... other deps
  ) {}

  async createUser(input: IUserCreateDTO) {
    this.logger.info('Creating user', { username: input.username });
    // ...
  }
}
```

---

## 5. Implementation Examples

### 5.1 Complete Service Refactor Example

```typescript
// src/features/story/interfaces/story-service.interface.ts
export interface IStoryService {
  createStory(input: IStoryCreateDTO & { creatorId: string }): Promise<IStory>;
  getStoryById(storyId: ID, options?: IOperationOptions): Promise<IStory>;
  getStoryBySlug(slug: string, options?: IOperationOptions): Promise<IStory>;
  listStories(options?: IOperationOptions): Promise<IStory[]>;
  publishStory(input: IPublishedStoryDTO): Promise<IStory>;
  // ... other methods
}

// src/features/story/services/story.service.ts
import { injectable, inject } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { IStoryService } from '../interfaces/story-service.interface';
import { IStoryRepository } from '../interfaces/story-repository.interface';
import { IChapterService } from '@features/chapter/interfaces/chapter-service.interface';
import { IStoryCollaboratorService } from '@features/storyCollaborator/interfaces/story-collaborator-service.interface';
import { ILogger } from '@shared/interfaces/logger.interface';

@injectable()
export class StoryService implements IStoryService {
  constructor(
    @inject(TOKENS.StoryRepository) private readonly storyRepo: IStoryRepository,
    @inject(TOKENS.ChapterService) private readonly chapterService: IChapterService,
    @inject(TOKENS.ChapterRepository) private readonly chapterRepo: IChapterRepository,
    @inject(TOKENS.StoryCollaboratorService)
    private readonly storyCollaboratorService: IStoryCollaboratorService,
    @inject(TOKENS.Logger) private readonly logger: ILogger
  ) {}

  async createStory(input: IStoryCreateDTO & { creatorId: string }): Promise<IStory> {
    return await withTransaction('Creating new story', async (session) => {
      const { creatorId } = input;
      const options = { session };

      // Rate limiting check
      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date();
      end.setUTCHours(23, 59, 59, 999);

      const todayCount = await this.storyRepo.countByCreatorInDateRange(
        creatorId,
        start,
        end,
        options
      );

      if (!StoryRules.canCreateStory(todayCount)) {
        throw ApiError.tooManyRequests('Daily story creation limit reached.');
      }

      const story = await this.storyRepo.create({ ...input, status: StoryStatus.DRAFT }, options);

      await this.storyCollaboratorService.createCollaborator(
        {
          userId: creatorId,
          slug: story.slug,
          role: StoryCollaboratorRole.OWNER,
          status: StoryCollaboratorStatus.ACCEPTED,
        },
        options
      );

      this.logger.info('Story created', { storyId: story._id, creatorId });

      return story;
    });
  }

  // ... other methods
}
```

### 5.2 Testing with DI

```typescript
// src/features/user/__tests__/user.service.test.ts
import 'reflect-metadata';
import { container } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { UserService } from '../services/user.service';
import { IUserRepository } from '../interfaces/user-repository.interface';
import { IPlatformRoleService } from '@features/platformRole/interfaces/platform-role-service.interface';

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockPlatformRoleService: jest.Mocked<IPlatformRoleService>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    // Create mocks
    mockUserRepo = {
      create: jest.fn(),
      findByClerkId: jest.fn(),
      findOneByUsername: jest.fn(),
      findByUsername: jest.fn(),
      count: jest.fn(),
    };

    mockPlatformRoleService = {
      assignRole: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    };

    // Create child container for isolation
    const childContainer = container.createChildContainer();

    // Register mocks
    childContainer.registerInstance(TOKENS.UserRepository, mockUserRepo);
    childContainer.registerInstance(TOKENS.PlatformRoleService, mockPlatformRoleService);
    childContainer.registerInstance(TOKENS.Logger, mockLogger);
    childContainer.register(TOKENS.UserService, UserService);

    // Resolve service with mocked dependencies
    userService = childContainer.resolve(TOKENS.UserService);
  });

  describe('createUser', () => {
    it('should create user and assign role', async () => {
      const input = { username: 'testuser', email: 'test@test.com' };
      const mockUser = { _id: '123', clerkId: 'clerk_123', ...input };

      mockUserRepo.create.mockResolvedValue(mockUser);
      mockUserRepo.count.mockResolvedValue(1);
      mockPlatformRoleService.assignRole.mockResolvedValue(undefined);

      const result = await userService.createUser(input);

      expect(mockUserRepo.create).toHaveBeenCalledWith(input, expect.any(Object));
      expect(mockPlatformRoleService.assignRole).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });
  });
});
```

### 5.3 Lazy Loading with Factories

```typescript
// For services that are expensive to initialize
import { injectable, inject, delay } from 'tsyringe';

@injectable()
export class StoryService implements IStoryService {
  constructor(
    // Lazy load heavy services
    @inject(delay(() => TOKENS.ChapterService))
    private readonly chapterService: IChapterService
  ) {}
}
```

### 5.4 Scoped Containers for Request Context

```typescript
// src/plugins/container.plugin.ts
import { FastifyPluginAsync } from 'fastify';
import { container } from '@container/index';

export const containerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('container', null);

  fastify.addHook('onRequest', async (request) => {
    // Create child container for request scope
    const requestContainer = container.createChildContainer();

    // Register request-specific values
    requestContainer.registerInstance('RequestId', request.id);
    requestContainer.registerInstance('UserId', request.user?.id);

    request.container = requestContainer;
  });

  fastify.addHook('onResponse', async (request) => {
    // Clean up child container
    request.container?.dispose();
  });
};
```

---

## 6. Migration Strategy

### Phase 1: Foundation (Week 1-2)

1. ✅ Expand TOKENS with all service/repository identifiers
2. Create interfaces for all services and repositories
3. Create shared Logger service with DI

### Phase 2: Repositories (Week 2-3)

1. Add `@injectable()` to all repositories
2. Register repositories in container
3. Update tests

### Phase 3: Services - Bottom Up (Week 3-5)

Start with services that have NO service dependencies:

1. PlatformRoleService
2. SessionService
3. NotificationService

Then services with few dependencies: 4. UserService (depends on PlatformRoleService) 5. BookmarkService 6. FollowService

Then complex services: 7. ChapterService 8. StoryService (depends on ChapterService, StoryCollaboratorService) 9. PullRequestService

### Phase 4: Controllers (Week 5-6)

1. Add `@injectable()` to all controllers
2. Inject services via constructor
3. Update routes to resolve from container

### Phase 5: Cleanup (Week 6-7)

1. Remove all manual singleton exports
2. Remove BaseModule inheritance where possible
3. Add comprehensive tests
4. Update documentation

### Migration Checklist Per Service

```markdown
- [ ] Create interface file (IXxxService)
- [ ] Add @injectable() decorator
- [ ] Convert class fields to constructor injection
- [ ] Register with container (via @registry or module)
- [ ] Remove manual singleton export
- [ ] Update all import sites
- [ ] Write/update unit tests with mocked dependencies
- [ ] Test integration
```

---

## 7. Best Practices Checklist

### Container Setup

- [ ] `reflect-metadata` imported FIRST in entry point
- [ ] All dependencies have Symbol tokens
- [ ] Tokens are `as const` for type safety
- [ ] Services use `@singleton()` or `@injectable()` appropriately
- [ ] Child containers used for request scope when needed

### Service Design

- [ ] Services depend on interfaces, not concrete classes
- [ ] Constructor injection used (not property injection)
- [ ] Services don't instantiate their own dependencies
- [ ] No service inherits from BaseModule (use composition)
- [ ] Services have single responsibility

### Testing

- [ ] Tests use child containers for isolation
- [ ] Mock implementations provided via `registerInstance`
- [ ] No tests rely on global container state
- [ ] Each test cleans up its container

### Error Handling

- [ ] Errors thrown directly (not via inherited methods)
- [ ] Custom ApiError class used consistently
- [ ] No swallowed exceptions

### Code Organization

- [ ] One interface file per service/repository
- [ ] Feature modules register their own dependencies
- [ ] Tokens organized by layer (infra, repos, services, controllers)
- [ ] Clear dependency graph (no circular dependencies)

---

## Summary

Your current implementation has a solid foundation with the 3 infrastructure services, but the 19+ feature services bypass the DI container entirely. This creates:

1. **Inconsistency** - Two patterns for dependency management
2. **Tight coupling** - Services create their own dependencies
3. **Testing difficulty** - Can't easily mock dependencies
4. **No flexibility** - Can't swap implementations

**Key Actions:**

1. Expand TOKENS to include all services/repos
2. Create interfaces for dependency inversion
3. Refactor services to use constructor injection
4. Replace inheritance (BaseModule) with composition
5. Register all services with the container
6. Update routes to resolve controllers from container

Following this guide will give you a consistent, testable, and maintainable DI architecture across your entire application.

---

## 8. IModule Pattern Deep Dive

The `IModule` interface is a powerful pattern for organizing dependency injection in large applications. It's already defined in your codebase at `src/container/types.ts` but not being utilized.

### 8.1 What is IModule?

```typescript
// src/container/types.ts (already exists in your codebase)
import { DependencyContainer } from 'tsyringe';

export interface IModule {
  register(container: DependencyContainer): void;
}
```

**Purpose:** `IModule` provides a contract for organizing related dependencies into cohesive units (modules) that can register themselves with the DI container.

### 8.2 Why Use the Module Pattern?

| Benefit                | Description                                                    |
| ---------------------- | -------------------------------------------------------------- |
| **Organization**       | Group related services, repositories, and controllers together |
| **Encapsulation**      | Each feature owns its registration logic                       |
| **Scalability**        | Easy to add new features without touching core container setup |
| **Testability**        | Register mock modules for testing                              |
| **Lazy Loading**       | Conditionally load modules based on configuration              |
| **Clear Dependencies** | Each module explicitly declares what it provides               |

### 8.3 Module Pattern vs Self-Registration

**Self-Registration (@registry decorator):**

```typescript
// Each service registers itself - scattered across files
@singleton()
@registry([{ token: TOKENS.UserService, useClass: UserService }])
export class UserService {}
```

**Module Pattern (Centralized):**

```typescript
// All user-related registrations in one place
export class UserModule implements IModule {
  register(container: DependencyContainer): void {
    container.registerSingleton(TOKENS.UserRepository, UserRepository);
    container.registerSingleton(TOKENS.UserService, UserService);
    container.registerSingleton(TOKENS.UserController, UserController);
  }
}
```

### 8.4 Complete Module Implementation Examples

#### Basic Feature Module

```typescript
// src/container/modules/user.module.ts
import { DependencyContainer } from 'tsyringe';
import { IModule } from '../types';
import { TOKENS } from '../tokens';

// Import implementations
import { UserRepository } from '@features/user/repositories/user.repository';
import { UserService } from '@features/user/services/user.service';
import { UserController } from '@features/user/controllers/user.controller';

export class UserModule implements IModule {
  register(container: DependencyContainer): void {
    // Register in dependency order (dependencies first)

    // 1. Repository (no dependencies on other feature services)
    container.registerSingleton(TOKENS.UserRepository, UserRepository);

    // 2. Service (depends on repository)
    container.registerSingleton(TOKENS.UserService, UserService);

    // 3. Controller (depends on service)
    container.registerSingleton(TOKENS.UserController, UserController);
  }
}
```

#### Complex Feature Module with Multiple Services

```typescript
// src/container/modules/story.module.ts
import { DependencyContainer } from 'tsyringe';
import { IModule } from '../types';
import { TOKENS } from '../tokens';

import { StoryRepository } from '@features/story/repositories/story.repository';
import { StoryService } from '@features/story/services/story.service';
import { StoryController } from '@features/story/controllers/story.controller';
import { StoryPipelineBuilder } from '@features/story/pipelines/storyPipeline.builder';

export class StoryModule implements IModule {
  register(container: DependencyContainer): void {
    // Repositories
    container.registerSingleton(TOKENS.StoryRepository, StoryRepository);

    // Pipeline builders (if needed as injectable)
    container.register(TOKENS.StoryPipelineBuilder, StoryPipelineBuilder);

    // Services
    container.registerSingleton(TOKENS.StoryService, StoryService);

    // Controllers
    container.registerSingleton(TOKENS.StoryController, StoryController);
  }
}
```

#### Infrastructure Module

```typescript
// src/container/modules/infrastructure.module.ts
import { DependencyContainer } from 'tsyringe';
import { IModule } from '../types';
import { TOKENS } from '../tokens';

import { ConfigService } from '@config/services/config.service';
import { DatabaseService } from '@config/services/database.service';
import { RedisService } from '@config/services/redis.service';
import { LoggerService } from '@shared/services/logger.service';

export class InfrastructureModule implements IModule {
  register(container: DependencyContainer): void {
    // Config must be first (other services depend on it)
    container.registerSingleton(TOKENS.ConfigService, ConfigService);

    // Logger (used by many services)
    container.registerSingleton(TOKENS.Logger, LoggerService);

    // Database & Cache
    container.registerSingleton(TOKENS.DatabaseService, DatabaseService);
    container.registerSingleton(TOKENS.RedisService, RedisService);
  }
}
```

### 8.5 Advanced Module Patterns

#### Module with Lifecycle Hooks

```typescript
// src/container/modules/database.module.ts
import { DependencyContainer } from 'tsyringe';
import { TOKENS } from '../tokens';

export interface IModuleWithLifecycle extends IModule {
  register(container: DependencyContainer): void;
  onApplicationBootstrap?(container: DependencyContainer): Promise<void>;
  onApplicationShutdown?(container: DependencyContainer): Promise<void>;
}

export class DatabaseModule implements IModuleWithLifecycle {
  register(container: DependencyContainer): void {
    container.registerSingleton(TOKENS.DatabaseService, DatabaseService);
  }

  async onApplicationBootstrap(container: DependencyContainer): Promise<void> {
    const dbService = container.resolve<DatabaseService>(TOKENS.DatabaseService);
    await dbService.connect();
    console.log('Database connected');
  }

  async onApplicationShutdown(container: DependencyContainer): Promise<void> {
    const dbService = container.resolve<DatabaseService>(TOKENS.DatabaseService);
    await dbService.disconnect();
    console.log('Database disconnected');
  }
}
```

#### Conditional Module Registration

```typescript
// src/container/modules/cache.module.ts
import { DependencyContainer } from 'tsyringe';
import { IModule } from '../types';
import { TOKENS } from '../tokens';

import { RedisCacheService } from '@shared/services/redis-cache.service';
import { InMemoryCacheService } from '@shared/services/inmemory-cache.service';

export class CacheModule implements IModule {
  constructor(private readonly useRedis: boolean = true) {}

  register(container: DependencyContainer): void {
    if (this.useRedis) {
      container.registerSingleton(TOKENS.CacheService, RedisCacheService);
    } else {
      container.registerSingleton(TOKENS.CacheService, InMemoryCacheService);
    }
  }
}

// Usage
const cacheModule = new CacheModule(process.env.USE_REDIS === 'true');
```

#### Module with Factory Registration

```typescript
// src/container/modules/chapter.module.ts
import { DependencyContainer } from 'tsyringe';
import { IModule } from '../types';
import { TOKENS } from '../tokens';

export class ChapterModule implements IModule {
  register(container: DependencyContainer): void {
    // Standard registrations
    container.registerSingleton(TOKENS.ChapterRepository, ChapterRepository);
    container.registerSingleton(TOKENS.ChapterService, ChapterService);

    // Factory registration for complex object creation
    container.register(TOKENS.ChapterPipelineBuilder, {
      useFactory: (c: DependencyContainer) => {
        const config = c.resolve<ConfigService>(TOKENS.ConfigService);
        return new ChapterPipelineBuilder(config.get('PIPELINE_OPTIONS'));
      },
    });

    // Value registration
    container.register(TOKENS.MaxChapterDepth, { useValue: 10 });
  }
}
```

#### Testing Module (Mock Implementations)

```typescript
// src/container/modules/__mocks__/user.module.mock.ts
import { DependencyContainer } from 'tsyringe';
import { IModule } from '../../types';
import { TOKENS } from '../../tokens';

// Mock implementations
class MockUserRepository implements IUserRepository {
  private users: IUser[] = [];

  async create(data: Partial<IUser>): Promise<IUser> {
    const user = { _id: 'mock-id', clerkId: 'mock-clerk', ...data } as IUser;
    this.users.push(user);
    return user;
  }

  async findByClerkId(clerkId: string): Promise<IUser | null> {
    return this.users.find((u) => u.clerkId === clerkId) || null;
  }

  // ... other mock methods
}

class MockUserService implements IUserService {
  async loginUser(input: ILoginUserDTO): Promise<SignInToken> {
    return { token: 'mock-token' } as SignInToken;
  }

  async createUser(input: IUserCreateDTO): Promise<IUser> {
    return { _id: 'mock-id', ...input } as IUser;
  }

  // ... other mock methods
}

export class MockUserModule implements IModule {
  register(container: DependencyContainer): void {
    container.registerSingleton(TOKENS.UserRepository, MockUserRepository);
    container.registerSingleton(TOKENS.UserService, MockUserService);
  }
}
```

### 8.6 Module Registry and Bootstrap

```typescript
// src/container/module-registry.ts
import { DependencyContainer } from 'tsyringe';
import { IModule } from './types';

export class ModuleRegistry {
  private modules: IModule[] = [];
  private lifecycleModules: IModuleWithLifecycle[] = [];

  add(module: IModule): this {
    this.modules.push(module);

    // Check if module has lifecycle hooks
    if ('onApplicationBootstrap' in module || 'onApplicationShutdown' in module) {
      this.lifecycleModules.push(module as IModuleWithLifecycle);
    }

    return this;
  }

  registerAll(container: DependencyContainer): void {
    for (const module of this.modules) {
      module.register(container);
    }
  }

  async bootstrap(container: DependencyContainer): Promise<void> {
    for (const module of this.lifecycleModules) {
      if (module.onApplicationBootstrap) {
        await module.onApplicationBootstrap(container);
      }
    }
  }

  async shutdown(container: DependencyContainer): Promise<void> {
    // Shutdown in reverse order
    for (const module of [...this.lifecycleModules].reverse()) {
      if (module.onApplicationShutdown) {
        await module.onApplicationShutdown(container);
      }
    }
  }
}
```

### 8.7 Complete Container Setup with Modules

```typescript
// src/container/index.ts
import 'reflect-metadata';
import { container } from 'tsyringe';
import { ModuleRegistry } from './module-registry';

// Import all modules
import { InfrastructureModule } from './modules/infrastructure.module';
import { UserModule } from './modules/user.module';
import { StoryModule } from './modules/story.module';
import { ChapterModule } from './modules/chapter.module';
import { CommentModule } from './modules/comment.module';
import { BookmarkModule } from './modules/bookmark.module';
import { FollowModule } from './modules/follow.module';
import { VoteModule } from './modules/vote.module';
import { NotificationModule } from './modules/notification.module';
import { PlatformRoleModule } from './modules/platform-role.module';
import { PullRequestModule } from './modules/pull-request.module';
import { ReportModule } from './modules/report.module';
import { SessionModule } from './modules/session.module';
import { StoryCollaboratorModule } from './modules/story-collaborator.module';

// Create and configure registry
export const moduleRegistry = new ModuleRegistry()
  // Infrastructure first (other modules depend on these)
  .add(new InfrastructureModule())

  // Feature modules (order matters if there are cross-dependencies)
  .add(new PlatformRoleModule()) // No feature dependencies
  .add(new SessionModule()) // No feature dependencies
  .add(new NotificationModule()) // No feature dependencies
  .add(new UserModule()) // Depends on PlatformRoleModule
  .add(new BookmarkModule())
  .add(new FollowModule())
  .add(new VoteModule())
  .add(new CommentModule())
  .add(new StoryCollaboratorModule())
  .add(new ChapterModule())
  .add(new StoryModule()) // Depends on ChapterModule, StoryCollaboratorModule
  .add(new PullRequestModule())
  .add(new ReportModule());

// Register all modules
moduleRegistry.registerAll(container);

export { container };
export { TOKENS } from './tokens';
export type { IModule } from './types';
```

### 8.8 Application Bootstrap with Lifecycle

```typescript
// src/server.ts
import { container, moduleRegistry } from '@container/index';
import { createApp } from './app';
import { logger } from '@utils/logger';

async function bootstrap() {
  try {
    // Run module bootstrap hooks (connect DB, Redis, etc.)
    await moduleRegistry.bootstrap(container);

    // Create and start Fastify app
    const app = await createApp();

    const port = process.env.PORT || 3000;
    await app.listen({ port: Number(port), host: '0.0.0.0' });

    logger.info(`Server running on port ${port}`);

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);

      await app.close();
      await moduleRegistry.shutdown(container);

      logger.info('Shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

bootstrap();
```

### 8.9 Module Pattern File Structure

```
src/
├── container/
│   ├── index.ts              # Main container export + module registration
│   ├── tokens.ts             # All DI tokens
│   ├── types.ts              # IModule, ContainerConfig interfaces
│   ├── module-registry.ts    # ModuleRegistry class
│   └── modules/
│       ├── infrastructure.module.ts
│       ├── user.module.ts
│       ├── story.module.ts
│       ├── chapter.module.ts
│       ├── comment.module.ts
│       ├── bookmark.module.ts
│       ├── follow.module.ts
│       ├── vote.module.ts
│       ├── notification.module.ts
│       ├── platform-role.module.ts
│       ├── pull-request.module.ts
│       ├── report.module.ts
│       ├── session.module.ts
│       ├── story-collaborator.module.ts
│       └── __mocks__/
│           ├── user.module.mock.ts
│           └── story.module.mock.ts
```

### 8.10 IModule vs Other DI Patterns Comparison

| Pattern                         | Pros                          | Cons                                | Use When                         |
| ------------------------------- | ----------------------------- | ----------------------------------- | -------------------------------- |
| **@registry decorator**         | Simple, co-located with class | Scattered, hard to see full picture | Small apps, few services         |
| **Manual container.register()** | Explicit, centralized         | Verbose, one big file               | Medium apps                      |
| **IModule pattern**             | Organized, scalable, testable | More files, learning curve          | Large apps, teams                |
| **Auto-discovery**              | Zero config                   | Magic, hard to debug                | Very large apps with conventions |

### 8.11 Module Pattern Best Practices

1. **One module per feature/domain**

   ```
   UserModule, StoryModule, ChapterModule (not AllServicesModule)
   ```

2. **Register dependencies in order**

   ```typescript
   // Repository → Service → Controller
   container.registerSingleton(TOKENS.UserRepository, UserRepository);
   container.registerSingleton(TOKENS.UserService, UserService);
   container.registerSingleton(TOKENS.UserController, UserController);
   ```

3. **Keep modules focused**

   ```typescript
   // Good: Single responsibility
   class UserModule {} // Only user-related
   class AuthModule {} // Only auth-related

   // Bad: Kitchen sink
   class EverythingModule {} // Too many things
   ```

4. **Use lifecycle hooks for async initialization**

   ```typescript
   async onApplicationBootstrap(container) {
     await this.connectDatabase();
   }
   ```

5. **Create mock modules for testing**

   ```typescript
   // In tests
   moduleRegistry.add(new MockUserModule());
   ```

6. **Document module dependencies**
   ```typescript
   /**
    * StoryModule
    * @depends ChapterModule - for chapter operations
    * @depends StoryCollaboratorModule - for collaborator management
    */
   export class StoryModule implements IModule {}
   ```

### 8.12 When NOT to Use IModule

- **Very small applications** (< 5 services) - overhead not worth it
- **Prototype/MVP** - move fast, refactor later
- **Single-developer projects** - mental overhead of patterns
- **When using auto-discovery** - some DI frameworks auto-register

### 8.13 Summary

The `IModule` interface in your `types.ts` provides a powerful abstraction for organizing DI registration. By implementing this pattern:

1. **Each feature owns its registration** - UserModule registers UserService, UserRepository, etc.
2. **Container setup is clean** - Just import and add modules
3. **Testing is simplified** - Swap entire modules with mocks
4. **Lifecycle management** - Connect/disconnect resources properly
5. **Scalability** - Add new features without touching core setup

This pattern transforms your DI from scattered `@registry` decorators across 50+ files into organized, maintainable modules that clearly express the application's structure.
