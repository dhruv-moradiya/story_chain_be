# TSyringe Folder Structure Guide

Recommended folder organization for a TSyringe-based application.

---

## Current vs Recommended Structure

### Your Current Structure

```
src/
├── config/
│   ├── config.service.ts      ✅ Has DI
│   ├── database.service.ts    ✅ Has DI
│   ├── redis.service.ts       ✅ Has DI
│   ├── tokens.ts              ✅ Partial tokens
│   ├── env.ts
│   └── db.ts
├── features/
│   └── [feature]/
│       ├── [feature].service.ts      ❌ Manual singleton
│       ├── [feature].controller.ts   ❌ Manual singleton
│       ├── [feature].router.ts
│       ├── [feature].types.ts
│       └── repository/
│           └── [feature].repository.ts  ❌ Manual instantiation
├── services/                  ❌ Shared services without DI
├── container.ts               ✅ Exists but minimal
├── server.ts
└── app.ts
```

### Recommended Structure

```
src/
├── container/
│   ├── index.ts               # Main container setup & exports
│   ├── tokens.ts              # All DI tokens (symbols)
│   └── types.ts               # Container type helpers
│
├── config/
│   ├── services/
│   │   ├── index.ts           # Barrel export
│   │   ├── config.service.ts
│   │   ├── database.service.ts
│   │   └── redis.service.ts
│   └── env.ts
│
├── shared/
│   ├── services/
│   │   ├── index.ts           # Barrel export
│   │   ├── cache.service.ts
│   │   ├── email.service.ts
│   │   ├── queue.service.ts
│   │   └── notification-factory.service.ts
│   ├── interfaces/
│   │   ├── index.ts
│   │   ├── cache.interface.ts
│   │   └── email.interface.ts
│   └── base/
│       ├── base.module.ts
│       ├── base.repository.ts
│       └── base.controller.ts
│
├── features/
│   └── [feature]/
│       ├── index.ts                    # Barrel export for feature
│       ├── [feature].module.ts         # Optional: Feature module registration
│       ├── services/
│       │   ├── index.ts
│       │   └── [feature].service.ts
│       ├── controllers/
│       │   ├── index.ts
│       │   └── [feature].controller.ts
│       ├── repositories/
│       │   ├── index.ts
│       │   └── [feature].repository.ts
│       ├── routes/
│       │   └── [feature].routes.ts
│       ├── interfaces/
│       │   ├── [feature].interface.ts
│       │   └── [feature].repository.interface.ts
│       ├── dto/
│       │   ├── create-[feature].dto.ts
│       │   └── update-[feature].dto.ts
│       └── types/
│           └── [feature].types.ts
│
├── routes/
│   └── index.ts               # Main route aggregator
│
├── app.ts
└── server.ts
```

---

## Detailed File Contents

### 1. Container Folder

```
src/container/
├── index.ts        # Main entry - imports all, exports container
├── tokens.ts       # Symbol definitions
└── types.ts        # Type utilities
```

#### `container/tokens.ts`

```typescript
/**
 * Dependency Injection Tokens
 * All tokens are Symbols for unique identification
 */

export const TOKENS = {
  // ═══════════════════════════════════════════
  // CONFIG SERVICES
  // ═══════════════════════════════════════════
  ConfigService: Symbol.for('ConfigService'),
  DatabaseService: Symbol.for('DatabaseService'),
  RedisService: Symbol.for('RedisService'),

  // ═══════════════════════════════════════════
  // SHARED SERVICES
  // ═══════════════════════════════════════════
  CacheService: Symbol.for('CacheService'),
  EmailService: Symbol.for('EmailService'),
  QueueService: Symbol.for('QueueService'),
  InviteTokenService: Symbol.for('InviteTokenService'),
  NotificationFactoryService: Symbol.for('NotificationFactoryService'),

  // ═══════════════════════════════════════════
  // REPOSITORIES
  // ═══════════════════════════════════════════
  UserRepository: Symbol.for('UserRepository'),
  StoryRepository: Symbol.for('StoryRepository'),
  ChapterRepository: Symbol.for('ChapterRepository'),
  ChapterVersionRepository: Symbol.for('ChapterVersionRepository'),
  ChapterAutoSaveRepository: Symbol.for('ChapterAutoSaveRepository'),
  PullRequestRepository: Symbol.for('PullRequestRepository'),
  NotificationRepository: Symbol.for('NotificationRepository'),
  PlatformRoleRepository: Symbol.for('PlatformRoleRepository'),
  StoryCollaboratorRepository: Symbol.for('StoryCollaboratorRepository'),

  // ═══════════════════════════════════════════
  // FEATURE SERVICES
  // ═══════════════════════════════════════════
  UserService: Symbol.for('UserService'),
  StoryService: Symbol.for('StoryService'),
  ChapterService: Symbol.for('ChapterService'),
  ChapterVersionService: Symbol.for('ChapterVersionService'),
  ChapterAutoSaveService: Symbol.for('ChapterAutoSaveService'),
  CommentService: Symbol.for('CommentService'),
  VoteService: Symbol.for('VoteService'),
  BookmarkService: Symbol.for('BookmarkService'),
  FollowService: Symbol.for('FollowService'),
  NotificationService: Symbol.for('NotificationService'),
  PullRequestService: Symbol.for('PullRequestService'),
  PrCommentService: Symbol.for('PrCommentService'),
  PrReviewService: Symbol.for('PrReviewService'),
  PrVoteService: Symbol.for('PrVoteService'),
  ReportService: Symbol.for('ReportService'),
  ReadingHistoryService: Symbol.for('ReadingHistoryService'),
  SessionService: Symbol.for('SessionService'),
  StoryCollaboratorService: Symbol.for('StoryCollaboratorService'),
  PlatformRoleService: Symbol.for('PlatformRoleService'),

  // ═══════════════════════════════════════════
  // CONTROLLERS
  // ═══════════════════════════════════════════
  UserController: Symbol.for('UserController'),
  StoryController: Symbol.for('StoryController'),
  ChapterController: Symbol.for('ChapterController'),
  ChapterVersionController: Symbol.for('ChapterVersionController'),
  ChapterAutoSaveController: Symbol.for('ChapterAutoSaveController'),
  CommentController: Symbol.for('CommentController'),
  VoteController: Symbol.for('VoteController'),
  BookmarkController: Symbol.for('BookmarkController'),
  FollowController: Symbol.for('FollowController'),
  NotificationController: Symbol.for('NotificationController'),
  PullRequestController: Symbol.for('PullRequestController'),
  PrCommentController: Symbol.for('PrCommentController'),
  PrReviewController: Symbol.for('PrReviewController'),
  PrVoteController: Symbol.for('PrVoteController'),
  ReportController: Symbol.for('ReportController'),
  ReadingHistoryController: Symbol.for('ReadingHistoryController'),
  SessionController: Symbol.for('SessionController'),
  StoryCollaboratorController: Symbol.for('StoryCollaboratorController'),
} as const;

// Type for all token keys
export type TokenKey = keyof typeof TOKENS;

// Type for token values
export type Token = (typeof TOKENS)[TokenKey];
```

#### `container/types.ts`

```typescript
import { DependencyContainer } from 'tsyringe';

/**
 * Type helper for resolving dependencies
 */
export type ResolveType<T> = T extends new (...args: any[]) => infer R ? R : T;

/**
 * Container configuration options
 */
export interface ContainerConfig {
  enableLogging?: boolean;
  environment?: 'development' | 'production' | 'test';
}

/**
 * Module registration interface
 */
export interface IModule {
  register(container: DependencyContainer): void;
}
```

#### `container/index.ts`

```typescript
import 'reflect-metadata';

// ═══════════════════════════════════════════
// CONFIG SERVICES (must be first)
// ═══════════════════════════════════════════
import '../config/services/config.service';
import '../config/services/database.service';
import '../config/services/redis.service';

// ═══════════════════════════════════════════
// SHARED SERVICES
// ═══════════════════════════════════════════
import '../shared/services/cache.service';
import '../shared/services/email.service';
import '../shared/services/queue.service';

// ═══════════════════════════════════════════
// FEATURE MODULES (alphabetical order)
// ═══════════════════════════════════════════

// Bookmark
import '../features/bookmark/repositories/bookmark.repository';
import '../features/bookmark/services/bookmark.service';
import '../features/bookmark/controllers/bookmark.controller';

// Chapter
import '../features/chapter/repositories/chapter.repository';
import '../features/chapter/services/chapter.service';
import '../features/chapter/controllers/chapter.controller';

// ChapterAutoSave
import '../features/chapterAutoSave/repositories/chapterAutoSave.repository';
import '../features/chapterAutoSave/services/chapterAutoSave.service';
import '../features/chapterAutoSave/controllers/chapterAutoSave.controller';

// ... (continue for all features)

// User
import '../features/user/repositories/user.repository';
import '../features/user/services/user.service';
import '../features/user/controllers/user.controller';

// ═══════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════
import { container } from 'tsyringe';

export { container };
export { TOKENS, TokenKey, Token } from './tokens';
export type { ContainerConfig, IModule } from './types';
```

---

### 2. Feature Module Structure

```
src/features/user/
├── index.ts                           # Barrel export
├── user.module.ts                     # Optional module config
├── services/
│   ├── index.ts
│   └── user.service.ts
├── controllers/
│   ├── index.ts
│   └── user.controller.ts
├── repositories/
│   ├── index.ts
│   └── user.repository.ts
├── routes/
│   └── user.routes.ts
├── interfaces/
│   ├── index.ts
│   ├── user.interface.ts
│   └── user-repository.interface.ts
├── dto/
│   ├── create-user.dto.ts
│   └── update-user.dto.ts
└── types/
    └── user.types.ts
```

#### `features/user/index.ts` (Barrel Export)

```typescript
// Services
export * from './services';

// Controllers
export * from './controllers';

// Repositories
export * from './repositories';

// Routes
export * from './routes/user.routes';

// Interfaces
export * from './interfaces';

// Types
export * from './types/user.types';

// DTOs
export * from './dto/create-user.dto';
export * from './dto/update-user.dto';
```

#### `features/user/interfaces/user-repository.interface.ts`

```typescript
import { IUser } from '../types/user.types';

export interface IUserRepository {
  findById(id: string): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  findByClerkId(clerkId: string): Promise<IUser | null>;
  create(data: Partial<IUser>): Promise<IUser>;
  update(id: string, data: Partial<IUser>): Promise<IUser | null>;
  delete(id: string): Promise<boolean>;
}
```

#### `features/user/interfaces/user-service.interface.ts`

```typescript
import { IUser } from '../types/user.types';

export interface IUserService {
  getUserById(id: string): Promise<IUser>;
  getUserByEmail(email: string): Promise<IUser>;
  createUser(data: Partial<IUser>): Promise<IUser>;
  updateUser(id: string, data: Partial<IUser>): Promise<IUser>;
  deleteUser(id: string): Promise<void>;
}
```

#### `features/user/repositories/user.repository.ts`

```typescript
import { singleton, registry } from 'tsyringe';
import { TOKENS } from '../../../container/tokens';
import { BaseRepository } from '../../../shared/base/base.repository';
import { User } from '../../../models/User';
import { IUser } from '../types/user.types';
import { IUserRepository } from '../interfaces/user-repository.interface';

@singleton()
@registry([{ token: TOKENS.UserRepository, useClass: UserRepository }])
export class UserRepository
  extends BaseRepository<IUser, IUser>
  implements IUserRepository
{
  constructor() {
    super(User);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.findOne({ email });
  }

  async findByClerkId(clerkId: string): Promise<IUser | null> {
    return this.findOne({ clerkId });
  }
}
```

#### `features/user/services/user.service.ts`

```typescript
import { inject, singleton, registry } from 'tsyringe';
import { TOKENS } from '../../../container/tokens';
import { BaseModule } from '../../../shared/base/base.module';
import { IUserService } from '../interfaces/user-service.interface';
import { IUserRepository } from '../interfaces/user-repository.interface';
import { IUser } from '../types/user.types';

@singleton()
@registry([{ token: TOKENS.UserService, useClass: UserService }])
export class UserService extends BaseModule implements IUserService {
  constructor(
    @inject(TOKENS.UserRepository)
    private readonly userRepository: IUserRepository
  ) {
    super();
  }

  async getUserById(id: string): Promise<IUser> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      this.throwNotFound('User not found');
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<IUser> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      this.throwNotFound('User not found');
    }
    return user;
  }

  async createUser(data: Partial<IUser>): Promise<IUser> {
    return this.userRepository.create(data);
  }

  async updateUser(id: string, data: Partial<IUser>): Promise<IUser> {
    const user = await this.userRepository.update(id, data);
    if (!user) {
      this.throwNotFound('User not found');
    }
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    const deleted = await this.userRepository.delete(id);
    if (!deleted) {
      this.throwNotFound('User not found');
    }
  }
}
```

#### `features/user/controllers/user.controller.ts`

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { inject, singleton, registry } from 'tsyringe';
import { TOKENS } from '../../../container/tokens';
import { BaseModule } from '../../../shared/base/base.module';
import { IUserService } from '../interfaces/user-service.interface';

@singleton()
@registry([{ token: TOKENS.UserController, useClass: UserController }])
export class UserController extends BaseModule {
  constructor(
    @inject(TOKENS.UserService)
    private readonly userService: IUserService
  ) {
    super();
  }

  getUser = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = await this.userService.getUserById(id);
    return reply.send({ success: true, data: user });
  };

  createUser = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await this.userService.createUser(request.body as any);
    return reply.status(201).send({ success: true, data: user });
  };

  updateUser = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = await this.userService.updateUser(id, request.body as any);
    return reply.send({ success: true, data: user });
  };

  deleteUser = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await this.userService.deleteUser(id);
    return reply.send({ success: true, message: 'User deleted' });
  };
}
```

#### `features/user/routes/user.routes.ts`

```typescript
import { FastifyInstance } from 'fastify';
import { container, TOKENS } from '../../../container';
import type { UserController } from '../controllers/user.controller';

export async function userRoutes(fastify: FastifyInstance) {
  const controller = container.resolve<UserController>(TOKENS.UserController);

  // GET /users/:id
  fastify.get('/:id', controller.getUser);

  // POST /users
  fastify.post('/', controller.createUser);

  // PATCH /users/:id
  fastify.patch('/:id', controller.updateUser);

  // DELETE /users/:id
  fastify.delete('/:id', controller.deleteUser);
}
```

---

### 3. Shared Folder

```
src/shared/
├── base/
│   ├── base.module.ts
│   ├── base.repository.ts
│   └── base.controller.ts
├── services/
│   ├── index.ts
│   ├── cache.service.ts
│   └── email.service.ts
└── interfaces/
    ├── index.ts
    ├── cache.interface.ts
    └── email.interface.ts
```

#### `shared/interfaces/cache.interface.ts`

```typescript
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
```

#### `shared/services/cache.service.ts`

```typescript
import { inject, singleton, registry } from 'tsyringe';
import { TOKENS } from '../../container/tokens';
import { ICacheService } from '../interfaces/cache.interface';
import type { RedisService } from '../../config/services/redis.service';

@singleton()
@registry([{ token: TOKENS.CacheService, useClass: CacheService }])
export class CacheService implements ICacheService {
  constructor(
    @inject(TOKENS.RedisService)
    private readonly redis: RedisService
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), ttl);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.redis.exists(key);
  }
}
```

---

### 4. Entry Points

#### `server.ts`

```typescript
import { container, TOKENS } from './container';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import type { DatabaseService } from './config/services/database.service';
import type { RedisService } from './config/services/redis.service';

const start = async () => {
  try {
    // Resolve and connect infrastructure services
    const databaseService = container.resolve<DatabaseService>(TOKENS.DatabaseService);
    await databaseService.connect();

    const redisService = container.resolve<RedisService>(TOKENS.RedisService);
    await redisService.connect();

    // Create and start app
    const app = await createApp();
    await app.listen({ port: env.PORT, host: env.HOST });

    logger.info(`Server running on http://localhost:${env.PORT}`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
```

#### `app.ts`

```typescript
import Fastify from 'fastify';
import { registerRoutes } from './routes';

export async function createApp() {
  const app = Fastify({ logger: true });

  // Register plugins
  // await app.register(cors);
  // await app.register(helmet);

  // Register routes
  await registerRoutes(app);

  return app;
}
```

#### `routes/index.ts`

```typescript
import { FastifyInstance } from 'fastify';

// Import all route modules
import { userRoutes } from '../features/user/routes/user.routes';
import { storyRoutes } from '../features/story/routes/story.routes';
import { chapterRoutes } from '../features/chapter/routes/chapter.routes';
// ... other routes

export async function registerRoutes(app: FastifyInstance) {
  // API v1 routes
  app.register(
    async (api) => {
      api.register(userRoutes, { prefix: '/users' });
      api.register(storyRoutes, { prefix: '/stories' });
      api.register(chapterRoutes, { prefix: '/chapters' });
      // ... other routes
    },
    { prefix: '/api/v1' }
  );

  // Health check
  app.get('/health', async () => ({ status: 'ok' }));
}
```

---

## Summary: Import Flow

```
server.ts
    │
    └── imports → container/index.ts
                      │
                      ├── imports 'reflect-metadata' (FIRST!)
                      │
                      ├── imports → config/services/*.ts
                      │                 └── @registry decorators run
                      │
                      ├── imports → shared/services/*.ts
                      │                 └── @registry decorators run
                      │
                      └── imports → features/*/
                                        ├── repositories/*.ts
                                        ├── services/*.ts
                                        └── controllers/*.ts
                                              └── All @registry decorators run
```

---

## Quick Reference

| Layer | Location | Naming | DI Decorators |
|-------|----------|--------|---------------|
| Tokens | `container/tokens.ts` | `TOKENS.XxxService` | N/A |
| Repository | `features/xxx/repositories/` | `xxx.repository.ts` | `@singleton`, `@registry` |
| Service | `features/xxx/services/` | `xxx.service.ts` | `@singleton`, `@registry`, `@inject` |
| Controller | `features/xxx/controllers/` | `xxx.controller.ts` | `@singleton`, `@registry`, `@inject` |
| Routes | `features/xxx/routes/` | `xxx.routes.ts` | Uses `container.resolve()` |
| Interface | `features/xxx/interfaces/` | `xxx.interface.ts` | N/A |

---

## Migration Steps (Folder Restructure)

1. Create `src/container/` folder with `index.ts`, `tokens.ts`, `types.ts`
2. Move current `tokens.ts` content to `container/tokens.ts`
3. Create `src/shared/` folder for common services and base classes
4. For each feature module:
   - Create subfolders: `services/`, `controllers/`, `repositories/`, `interfaces/`
   - Move files to appropriate subfolders
   - Add barrel exports (`index.ts`)
5. Update all imports to use new paths
6. Update `container/index.ts` with new import paths
