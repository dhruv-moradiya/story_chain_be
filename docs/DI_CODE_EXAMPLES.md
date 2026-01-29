# TSyringe Code Examples for Your Project

## Practical Examples Based on Your Codebase

---

## Part 1: Setup

### Installing TSyringe

```bash
npm install tsyringe reflect-metadata
```

---

### TypeScript Configuration

**File:** `tsconfig.json`

Add these compiler options:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

---

### Import reflect-metadata Once

**File:** `src/server.ts` (at the very top, before anything else)

```typescript
import 'reflect-metadata'; // Must be first import!

import { connectDB } from './config/db';
import { createApp } from './app';
// ... rest of imports
```

---

## Part 2: Basic Repository Example

### Before (Your Current Code)

```typescript
// src/features/user/repository/user.repository.ts

import { BaseRepository } from '../../../utils/baseClass';
import { User } from '../../../models/user.model';
import { IUser, IUserDoc } from '../../../types/user.types';

export class UserRepository extends BaseRepository<IUser, IUserDoc> {
  constructor() {
    super(User); // Mongoose model passed here
  }

  async findByClerkId(clerkId: string): Promise<IUser | null> {
    return this.findOne({ clerkId });
  }

  async findByUsername(username: string): Promise<IUser[]> {
    return this.findMany({
      username: { $regex: username, $options: 'i' },
    });
  }
}
```

---

### After (With TSyringe)

```typescript
// src/features/user/repository/user.repository.ts

import { singleton } from 'tsyringe';
import { BaseRepository } from '../../../utils/baseClass';
import { User } from '../../../models/user.model';
import { IUser, IUserDoc } from '../../../types/user.types';

@singleton() // Add this decorator
export class UserRepository extends BaseRepository<IUser, IUserDoc> {
  constructor() {
    super(User);
  }

  async findByClerkId(clerkId: string): Promise<IUser | null> {
    return this.findOne({ clerkId });
  }

  async findByUsername(username: string): Promise<IUser[]> {
    return this.findMany({
      username: { $regex: username, $options: 'i' },
    });
  }
}

// Remove this line: export const userRepository = new UserRepository();
// TSyringe will manage the singleton
```

---

## Part 3: Basic Service Example

### Before (Your Current Code)

```typescript
// src/features/user/user.service.ts

import { BaseModule } from '../../utils/baseClass';
import { UserRepository } from './repository/user.repository';
import { PlatformRoleService } from '../platformRole/platformRole.service';
import { IUserCreateDTO } from '../../dto/user.dto';
import { withTransaction } from '../../utils/withTransaction';

export class UserService extends BaseModule {
  // Dependencies created internally - tight coupling
  private readonly userRepo = new UserRepository();
  private readonly platformRoleService = new PlatformRoleService();

  async createUser(input: IUserCreateDTO) {
    return await withTransaction('Creating new user', async (session) => {
      const newUser = await this.userRepo.create(input, { session });
      // ... more logic
      return newUser;
    });
  }

  async getUserById(userId: string) {
    return await this.userRepo.findByClerkId(userId);
  }

  async loginUser(input: { userId: string }) {
    const user = await this.userRepo.findByClerkId(input.userId);
    if (!user) {
      this.throwNotFoundError('User not found');
    }
    // ... generate token
    return { token: 'xxx' };
  }
}

export const userService = new UserService(); // Manual singleton
```

---

### After (With TSyringe)

```typescript
// src/features/user/user.service.ts

import { singleton, inject } from 'tsyringe';
import { BaseModule } from '../../utils/baseClass';
import { UserRepository } from './repository/user.repository';
import { PlatformRoleService } from '../platformRole/platformRole.service';
import { IUserCreateDTO } from '../../dto/user.dto';
import { withTransaction } from '../../utils/withTransaction';

@singleton() // TSyringe manages this as singleton
export class UserService extends BaseModule {
  // Dependencies injected via constructor - loose coupling
  constructor(
    private readonly userRepo: UserRepository,
    private readonly platformRoleService: PlatformRoleService
  ) {
    super(); // Call parent constructor
  }

  async createUser(input: IUserCreateDTO) {
    return await withTransaction('Creating new user', async (session) => {
      const newUser = await this.userRepo.create(input, { session });
      // ... more logic
      return newUser;
    });
  }

  async getUserById(userId: string) {
    return await this.userRepo.findByClerkId(userId);
  }

  async loginUser(input: { userId: string }) {
    const user = await this.userRepo.findByClerkId(input.userId);
    if (!user) {
      this.throwNotFoundError('User not found');
    }
    // ... generate token
    return { token: 'xxx' };
  }
}

// Remove: export const userService = new UserService();
// TSyringe handles singleton creation
```

---

## Part 4: Basic Controller Example

### Before (Your Current Code)

```typescript
// src/features/user/user.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseModule } from '../../utils/baseClass';
import { userService } from './user.service'; // Import singleton
import { ApiResponse } from '../../utils/apiResponse';
import { HTTP_STATUS } from '../../constants/httpStatus';
import { catchAsync } from '../../utils/catchAsync';

export class UserController extends BaseModule {
  login = catchAsync(
    async (request: FastifyRequest<{ Body: TLoginUserSchema }>, reply: FastifyReply) => {
      const { userId } = request.body;
      const token = await userService.loginUser({ userId }); // Use imported singleton
      return reply.code(HTTP_STATUS.OK.code).send(new ApiResponse(true, 'Login successful', token));
    }
  );

  getUserById = catchAsync(
    async (request: FastifyRequest<{ Params: TGetUserByIdSchema }>, reply: FastifyReply) => {
      const { userId } = request.params;
      const user = await userService.getUserById(userId); // Use imported singleton
      if (!user) {
        this.throwNotFoundError('User not found');
      }
      return reply.code(HTTP_STATUS.OK.code).send(new ApiResponse(true, 'User fetched', user));
    }
  );
}

export const userController = new UserController(); // Manual singleton
```

---

### After (With TSyringe)

```typescript
// src/features/user/user.controller.ts

import { singleton } from 'tsyringe';
import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseModule } from '../../utils/baseClass';
import { UserService } from './user.service'; // Import class, not instance
import { ApiResponse } from '../../utils/apiResponse';
import { HTTP_STATUS } from '../../constants/httpStatus';
import { catchAsync } from '../../utils/catchAsync';

@singleton()
export class UserController extends BaseModule {
  constructor(
    private readonly userService: UserService // Injected via constructor
  ) {
    super();
  }

  login = catchAsync(
    async (request: FastifyRequest<{ Body: TLoginUserSchema }>, reply: FastifyReply) => {
      const { userId } = request.body;
      const token = await this.userService.loginUser({ userId }); // Use injected service
      return reply.code(HTTP_STATUS.OK.code).send(new ApiResponse(true, 'Login successful', token));
    }
  );

  getUserById = catchAsync(
    async (request: FastifyRequest<{ Params: TGetUserByIdSchema }>, reply: FastifyReply) => {
      const { userId } = request.params;
      const user = await this.userService.getUserById(userId); // Use injected service
      if (!user) {
        this.throwNotFoundError('User not found');
      }
      return reply.code(HTTP_STATUS.OK.code).send(new ApiResponse(true, 'User fetched', user));
    }
  );
}

// Remove: export const userController = new UserController();
```

---

## Part 5: Routes Example

### Before (Your Current Code)

```typescript
// src/features/user/user.routes.ts

import { FastifyInstance } from 'fastify';
import { userController } from './user.controller'; // Import singleton

export async function userRoutes(fastify: FastifyInstance) {
  fastify.post('/login', userController.login);
  fastify.get('/:userId', userController.getUserById);
  fastify.post('/', userController.createUser);
}
```

---

### After (With TSyringe)

```typescript
// src/features/user/user.routes.ts

import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { UserController } from './user.controller'; // Import class

export async function userRoutes(fastify: FastifyInstance) {
  // Resolve controller from container
  const userController = container.resolve(UserController);

  fastify.post('/login', userController.login);
  fastify.get('/:userId', userController.getUserById);
  fastify.post('/', userController.createUser);
}
```

---

## Part 6: Configuration Service Example

### Before (Your Current Code)

```typescript
// src/config/env.ts

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  MONGODB_URI: z.string(),
  REDIS_URL: z.string(),
  // ... more fields
});

export const env = envSchema.parse(process.env);

// Usage in other files:
// import { env } from '../config/env';
// console.log(env.PORT);
```

---

### After (With TSyringe)

```typescript
// src/config/config.service.ts

import { singleton } from 'tsyringe';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  MONGODB_URI: z.string(),
  REDIS_URL: z.string(),
  // ... more fields
});

type EnvConfig = z.infer<typeof envSchema>;

@singleton()
export class ConfigService {
  private readonly config: EnvConfig;

  constructor() {
    this.config = envSchema.parse(process.env);
  }

  get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    return this.config[key];
  }

  get isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  get isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  get isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }

  get port(): number {
    return this.config.PORT;
  }

  get mongoUri(): string {
    return this.config.MONGODB_URI;
  }

  get redisUrl(): string {
    return this.config.REDIS_URL;
  }
}
```

---

### Using ConfigService

```typescript
// src/features/someFeature/some.service.ts

import { singleton } from 'tsyringe';
import { ConfigService } from '../../config/config.service';

@singleton()
export class SomeService {
  constructor(
    private readonly config: ConfigService // Injected
  ) {}

  doSomething() {
    if (this.config.isDevelopment) {
      console.log('Running in development mode');
    }

    const port = this.config.port;
    // ... use config values
  }
}
```

---

## Part 7: Database Connection Example

### Before (Your Current Code)

```typescript
// src/config/db.ts

import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export const connectDB = async () => {
  mongoose.set('strictQuery', true);

  const connectionInstance = await mongoose.connect(env.MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  logger.info(`MongoDB connected: ${connectionInstance.connection.host}`);
};
```

---

### After (With TSyringe)

```typescript
// src/config/database.service.ts

import { singleton } from 'tsyringe';
import mongoose, { Connection } from 'mongoose';
import { ConfigService } from './config.service';
import { logger } from '../utils/logger';

@singleton()
export class DatabaseService {
  private connection: Connection | null = null;

  constructor(
    private readonly config: ConfigService // Config injected
  ) {}

  async connect(): Promise<void> {
    if (this.connection) {
      logger.warn('Database already connected');
      return;
    }

    mongoose.set('strictQuery', true);

    const connectionInstance = await mongoose.connect(this.config.mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    this.connection = connectionInstance.connection;
    logger.info(`MongoDB connected: ${this.connection.host}`);
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await mongoose.disconnect();
      this.connection = null;
      logger.info('MongoDB disconnected');
    }
  }

  getConnection(): Connection {
    if (!this.connection) {
      throw new Error('Database not connected');
    }
    return this.connection;
  }

  get isConnected(): boolean {
    return this.connection !== null && this.connection.readyState === 1;
  }
}
```

---

### Using DatabaseService

```typescript
// src/server.ts

import 'reflect-metadata';
import { container } from 'tsyringe';
import { DatabaseService } from './config/database.service';
import { createApp } from './app';

const start = async () => {
  try {
    // Resolve and connect database
    const databaseService = container.resolve(DatabaseService);
    await databaseService.connect();

    const app = await createApp();
    await app.listen({ port: 3000 });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
```

---

## Part 8: Redis Service Example

### Before (Your Current Code)

```typescript
// src/config/redis.ts

import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;

export const connectRedis = async (): Promise<void> => {
  redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redisClient.on('connect', () => {
    logger.info('Redis connected');
  });

  redisClient.on('error', (error) => {
    logger.error('Redis error:', error);
  });
};

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};
```

---

### After (With TSyringe)

```typescript
// src/config/redis.service.ts

import { singleton } from 'tsyringe';
import Redis from 'ioredis';
import { ConfigService } from './config.service';
import { logger } from '../utils/logger';

@singleton()
export class RedisService {
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  async connect(): Promise<void> {
    if (this.client) {
      logger.warn('Redis already connected');
      return;
    }

    this.client = new Redis(this.config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      logger.info('Redis connected');
    });

    this.client.on('error', (error) => {
      logger.error('Redis error:', error);
    });
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      logger.info('Redis disconnected');
    }
  }

  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client;
  }

  // Convenience methods
  async get(key: string): Promise<string | null> {
    return this.getClient().get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.getClient().set(key, value, 'EX', ttlSeconds);
    } else {
      await this.getClient().set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.getClient().del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.getClient().exists(key);
    return result === 1;
  }
}
```

---

### Using RedisService in a Cache Service

```typescript
// src/services/cache.service.ts

import { singleton } from 'tsyringe';
import { RedisService } from '../config/redis.service';

@singleton()
export class CacheService {
  private readonly DEFAULT_TTL = 3600; // 1 hour

  constructor(private readonly redis: RedisService) {}

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = this.DEFAULT_TTL
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    // Fetch fresh data
    const data = await fetcher();

    // Store in cache
    await this.redis.set(key, JSON.stringify(data), ttlSeconds);

    return data;
  }

  async invalidate(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const client = this.redis.getClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  }
}
```

---

## Part 9: Story Service Example (Complex)

### Before (Your Current Code)

```typescript
// src/features/story/story.service.ts

import { BaseModule } from '../../utils/baseClass';
import { StoryRepository } from './repository/story.repository';
import { ChapterService } from '../chapter/chapter.service';
import { ChapterRepository } from '../chapter/repository/chapter.repository';
import { StoryCollaboratorService } from '../storyCollaborator/storyCollaborator.service';
import { withTransaction } from '../../utils/withTransaction';

export class StoryService extends BaseModule {
  // All dependencies created internally
  private readonly storyRepo = new StoryRepository();
  private readonly chapterService = new ChapterService();
  private readonly chapterRepo = new ChapterRepository();
  private readonly storyCollaboratorService = new StoryCollaboratorService();

  async createStory(input: IStoryCreateDTO) {
    return await withTransaction('Creating story', async (session) => {
      const story = await this.storyRepo.create(input, { session });

      // Create initial chapter
      await this.chapterService.createChapter(
        {
          storyId: story._id,
          title: 'Chapter 1',
          order: 1,
        },
        { session }
      );

      return story;
    });
  }

  async getStoryById(storyId: string) {
    const story = await this.storyRepo.findById(storyId);
    if (!story) {
      this.throwNotFoundError('Story not found');
    }
    return story;
  }

  async deleteStory(storyId: string, userId: string) {
    return await withTransaction('Deleting story', async (session) => {
      const story = await this.storyRepo.findById(storyId);

      if (!story) {
        this.throwNotFoundError('Story not found');
      }

      if (story.creatorId !== userId) {
        this.throwUnauthorizedError('Not authorized to delete this story');
      }

      // Delete all chapters
      await this.chapterRepo.deleteMany({ storyId }, { session });

      // Delete story
      await this.storyRepo.softDelete(storyId, { session });

      return { message: 'Story deleted' };
    });
  }
}

export const storyService = new StoryService();
```

---

### After (With TSyringe)

```typescript
// src/features/story/story.service.ts

import { singleton } from 'tsyringe';
import { BaseModule } from '../../utils/baseClass';
import { StoryRepository } from './repository/story.repository';
import { ChapterService } from '../chapter/chapter.service';
import { ChapterRepository } from '../chapter/repository/chapter.repository';
import { StoryCollaboratorService } from '../storyCollaborator/storyCollaborator.service';
import { withTransaction } from '../../utils/withTransaction';

@singleton()
export class StoryService extends BaseModule {
  // All dependencies injected via constructor
  constructor(
    private readonly storyRepo: StoryRepository,
    private readonly chapterService: ChapterService,
    private readonly chapterRepo: ChapterRepository,
    private readonly storyCollaboratorService: StoryCollaboratorService
  ) {
    super();
  }

  async createStory(input: IStoryCreateDTO) {
    return await withTransaction('Creating story', async (session) => {
      const story = await this.storyRepo.create(input, { session });

      await this.chapterService.createChapter(
        {
          storyId: story._id,
          title: 'Chapter 1',
          order: 1,
        },
        { session }
      );

      return story;
    });
  }

  async getStoryById(storyId: string) {
    const story = await this.storyRepo.findById(storyId);
    if (!story) {
      this.throwNotFoundError('Story not found');
    }
    return story;
  }

  async deleteStory(storyId: string, userId: string) {
    return await withTransaction('Deleting story', async (session) => {
      const story = await this.storyRepo.findById(storyId);

      if (!story) {
        this.throwNotFoundError('Story not found');
      }

      if (story.creatorId !== userId) {
        this.throwUnauthorizedError('Not authorized to delete this story');
      }

      await this.chapterRepo.deleteMany({ storyId }, { session });
      await this.storyRepo.softDelete(storyId, { session });

      return { message: 'Story deleted' };
    });
  }
}
```

---

## Part 10: Injecting Interfaces (Using Tokens)

### When You Need Tokens

TypeScript interfaces disappear at runtime. TSyringe can't see them.
Use tokens when injecting interfaces.

---

### Creating Tokens

```typescript
// src/di/tokens.ts

export const TOKENS = {
  // Services
  Logger: Symbol('Logger'),
  EmailService: Symbol('EmailService'),
  StorageService: Symbol('StorageService'),

  // Repositories
  UserRepository: Symbol('UserRepository'),
  StoryRepository: Symbol('StoryRepository'),

  // Config
  Config: Symbol('Config'),

  // External Services
  CloudinaryClient: Symbol('CloudinaryClient'),
} as const;
```

---

### Registering with Tokens

```typescript
// src/di/container.ts

import { container } from 'tsyringe';
import { TOKENS } from './tokens';

// Register implementations for interfaces
container.register(TOKENS.EmailService, {
  useClass: SendGridEmailService, // Production implementation
});

container.register(TOKENS.StorageService, {
  useClass: CloudinaryStorageService,
});

container.register(TOKENS.Logger, {
  useClass: WinstonLogger,
});
```

---

### Using Tokens for Injection

```typescript
// src/features/notification/notification.service.ts

import { singleton, inject } from 'tsyringe';
import { TOKENS } from '../../di/tokens';
import { IEmailService } from '../../interfaces/email.interface';
import { ILogger } from '../../interfaces/logger.interface';

@singleton()
export class NotificationService {
  constructor(
    @inject(TOKENS.EmailService) private readonly emailService: IEmailService,
    @inject(TOKENS.Logger) private readonly logger: ILogger
  ) {}

  async sendWelcomeEmail(userId: string, email: string) {
    this.logger.info(`Sending welcome email to ${email}`);

    await this.emailService.send({
      to: email,
      subject: 'Welcome!',
      body: 'Thanks for joining...',
    });

    this.logger.info(`Welcome email sent to ${email}`);
  }
}
```

---

## Part 11: Testing with DI

### Creating Mock Repository

```typescript
// src/features/user/__tests__/mocks/user.repository.mock.ts

import { IUser } from '../../../../types/user.types';

export class MockUserRepository {
  private users: IUser[] = [];

  async create(input: Partial<IUser>): Promise<IUser> {
    const user = {
      _id: 'mock-id-' + Date.now(),
      clerkId: input.clerkId || 'clerk-123',
      username: input.username || 'testuser',
      email: input.email || 'test@test.com',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...input,
    } as IUser;

    this.users.push(user);
    return user;
  }

  async findByClerkId(clerkId: string): Promise<IUser | null> {
    return this.users.find((u) => u.clerkId === clerkId) || null;
  }

  async findOne(filter: any): Promise<IUser | null> {
    return this.users[0] || null;
  }

  // Reset for clean tests
  reset() {
    this.users = [];
  }
}
```

---

### Writing Tests with DI

```typescript
// src/features/user/__tests__/user.service.test.ts

import 'reflect-metadata';
import { container } from 'tsyringe';
import { UserService } from '../user.service';
import { UserRepository } from '../repository/user.repository';
import { MockUserRepository } from './mocks/user.repository.mock';
import { PlatformRoleService } from '../../platformRole/platformRole.service';
import { MockPlatformRoleService } from './mocks/platformRole.service.mock';

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepo: MockUserRepository;

  beforeEach(() => {
    // Clear container before each test
    container.clearInstances();

    // Create mock instances
    mockUserRepo = new MockUserRepository();
    const mockPlatformRoleService = new MockPlatformRoleService();

    // Register mocks in container
    container.registerInstance(UserRepository, mockUserRepo as any);
    container.registerInstance(PlatformRoleService, mockPlatformRoleService as any);

    // Resolve service (will use mocks)
    userService = container.resolve(UserService);
  });

  afterEach(() => {
    mockUserRepo.reset();
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const input = {
        clerkId: 'clerk-123',
        username: 'testuser',
        email: 'test@example.com',
      };

      const result = await userService.createUser(input);

      expect(result).toBeDefined();
      expect(result.clerkId).toBe('clerk-123');
      expect(result.username).toBe('testuser');
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      // Setup: create a user first
      await mockUserRepo.create({ clerkId: 'clerk-456', username: 'john' });

      const result = await userService.getUserById('clerk-456');

      expect(result).toBeDefined();
      expect(result?.username).toBe('john');
    });

    it('should return null when user not found', async () => {
      const result = await userService.getUserById('non-existent');

      expect(result).toBeNull();
    });
  });
});
```

---

### Test Setup File

```typescript
// src/test/setup.ts

import 'reflect-metadata';
import { container } from 'tsyringe';

// Run before all tests
beforeAll(() => {
  // Any global setup
});

// Run before each test
beforeEach(() => {
  // Clear all registered instances
  container.clearInstances();
});

// Run after all tests
afterAll(() => {
  // Cleanup
});
```

---

### Jest Configuration

```json
// jest.config.js or package.json

{
  "jest": {
    "setupFilesAfterEnv": ["./src/test/setup.ts"],
    "moduleFileExtensions": ["ts", "js"],
    "transform": {
      "^.+\\.ts$": "ts-jest"
    }
  }
}
```

---

## Part 12: Full Container Setup

### Container File

```typescript
// src/di/container.ts

import 'reflect-metadata';
import { container } from 'tsyringe';

// Import all services, repositories, controllers
// Just importing them registers them (due to decorators)

// Config
import '../config/config.service';
import '../config/database.service';
import '../config/redis.service';

// Repositories
import '../features/user/repository/user.repository';
import '../features/story/repository/story.repository';
import '../features/chapter/repository/chapter.repository';
// ... other repositories

// Services
import '../features/user/user.service';
import '../features/story/story.service';
import '../features/chapter/chapter.service';
import '../features/platformRole/platformRole.service';
// ... other services

// Controllers
import '../features/user/user.controller';
import '../features/story/story.controller';
// ... other controllers

export { container };
```

---

### Updated Server File

```typescript
// src/server.ts

import 'reflect-metadata'; // Must be first!
import './di/container'; // Initialize container
import { container } from 'tsyringe';
import { DatabaseService } from './config/database.service';
import { RedisService } from './config/redis.service';
import { createApp } from './app';
import { logger } from './utils/logger';

const start = async () => {
  try {
    // Resolve services from container
    const databaseService = container.resolve(DatabaseService);
    const redisService = container.resolve(RedisService);

    // Connect to databases
    await databaseService.connect();
    await redisService.connect();

    // Create and start app
    const app = await createApp();
    await app.listen({
      port: 3000,
      host: '0.0.0.0',
    });

    logger.info('Server started successfully');
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
```

---

## Part 13: Quick Reference

### Decorators Cheat Sheet

| Decorator           | Usage                                         | When to Use                    |
| ------------------- | --------------------------------------------- | ------------------------------ |
| `@injectable()`     | `@injectable() class MyClass {}`              | Any class managed by container |
| `@singleton()`      | `@singleton() class MyClass {}`               | One instance shared everywhere |
| `@inject(token)`    | `@inject(TOKEN) private dep: Interface`       | When injecting interfaces      |
| `@injectAll(token)` | `@injectAll(TOKEN) private deps: Interface[]` | Get all implementations        |

---

### Registration Methods

```typescript
// Class registration (auto via decorators)
@singleton()
class MyService {}

// Manual class registration
container.register(MyService, { useClass: MyService });

// Instance registration
container.registerInstance(MyService, myServiceInstance);

// Factory registration
container.register(MyService, {
  useFactory: (c) => new MyService(c.resolve(Dependency)),
});

// Value registration
container.register('API_KEY', { useValue: 'abc123' });
```

---

### Resolution Methods

```typescript
// Resolve single instance
const service = container.resolve(MyService);

// Resolve with token
const service = container.resolve<IMyService>(TOKENS.MyService);

// Resolve all
const services = container.resolveAll<IHandler>(TOKENS.Handler);

// Check if registered
const isRegistered = container.isRegistered(MyService);
```

---

### Common Patterns

```typescript
// Singleton service with dependencies
@singleton()
class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly config: ConfigService
  ) {}
}

// Interface injection with token
@singleton()
class NotificationService {
  constructor(@inject(TOKENS.EmailService) private readonly email: IEmailService) {}
}

// Optional dependency
@singleton()
class AnalyticsService {
  constructor(@inject(TOKENS.Analytics) @optional() private readonly analytics?: IAnalytics) {}
}
```

---

## Summary

| File Type  | Before                    | After                                   |
| ---------- | ------------------------- | --------------------------------------- |
| Repository | `export class X {}`       | `@singleton() export class X {}`        |
| Service    | `private dep = new Dep()` | `constructor(private dep: Dep)`         |
| Controller | `import { service }`      | `constructor(private service: Service)` |
| Routes     | `import { controller }`   | `container.resolve(Controller)`         |
| Config     | `export const env = ...`  | `@singleton() class ConfigService`      |
| Tests      | Difficult mocking         | Easy mock injection                     |
