# Code Structure Improvement Guide

## Executive Summary

Your StoryChain backend is a **well-architected, enterprise-grade application** with solid foundations. The codebase demonstrates good separation of concerns, type safety, and modern best practices. However, there are strategic improvements that can enhance maintainability, scalability, testing, and developer experience.

**Current Strengths:**
- ✅ Clean layered architecture (Domain → Application → Infrastructure → Interface)
- ✅ Feature-based modular organization
- ✅ Type-safe with TypeScript and Zod validation
- ✅ Modern tech stack (Fastify, MongoDB, Redis, Clerk)
- ✅ RBAC implementation with comprehensive permissions
- ✅ Repository pattern with base classes
- ✅ Standardized error handling

**Key Areas for Improvement:**
- ⚠️ Missing automated testing infrastructure
- ⚠️ No dependency injection container
- ⚠️ Limited path aliases for imports
- ⚠️ Commented out critical infrastructure (Redis, queues, email)
- ⚠️ Missing API versioning strategy
- ⚠️ No comprehensive logging/monitoring/observability
- ⚠️ Security enhancements needed (rate limiting, input sanitization)

---

## Table of Contents

1. [Project Structure Overview](#1-project-structure-overview)
2. [Testing Infrastructure](#2-testing-infrastructure-critical)
3. [Dependency Injection](#3-dependency-injection-container)
4. [Import Path Aliases](#4-import-path-aliases)
5. [API Versioning](#5-api-versioning-strategy)
6. [Environment & Configuration](#6-environment--configuration-management)
7. [Logging & Monitoring](#7-logging--monitoring)
8. [Error Handling Enhancements](#8-error-handling-enhancements)
9. [Security Improvements](#9-security-improvements)
10. [Code Quality & Standards](#10-code-quality--standards)
11. [Database & Performance](#11-database--performance)
12. [Documentation](#12-documentation)
13. [CI/CD Pipeline](#13-cicd-pipeline)
14. [Feature Module Best Practices](#14-feature-module-best-practices)
15. [Implementation Roadmap](#15-implementation-roadmap)

---

## 1. Project Structure Overview

### Current Structure
```
src/
├── config/              # Configuration files (env, db, redis)
├── constants/           # Application constants
├── domain/             # Business rules
├── dto/                # Data Transfer Objects
├── features/           # Feature modules (19+ modules)
├── middlewares/        # Request middleware
├── models/             # Mongoose schemas (20+ models)
├── routes/             # Route registration
├── schema/             # Zod validation schemas
├── transformer/        # Data transformation
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── app.ts              # Fastify app setup
└── server.ts           # Entry point
```

### Recommended Enhanced Structure
```
src/
├── core/                          # NEW: Core application infrastructure
│   ├── di/                        # Dependency injection container
│   ├── base/                      # Base classes (move from utils)
│   ├── errors/                    # Error classes
│   └── types/                     # Shared types
├── config/                        # Configuration management
│   ├── env.ts
│   ├── database.config.ts
│   ├── redis.config.ts
│   ├── swagger.config.ts         # Extract from app.ts
│   └── index.ts
├── infrastructure/                # NEW: Technical implementations
│   ├── database/
│   │   ├── mongodb/
│   │   │   ├── connection.ts
│   │   │   └── models/           # Move from src/models
│   │   └── redis/
│   │       ├── connection.ts
│   │       └── client.ts
│   ├── cache/                    # Cache strategies
│   ├── queue/                    # BullMQ queue setup
│   ├── email/                    # Email service
│   ├── storage/                  # Cloudinary integration
│   └── logging/                  # Winston configuration
├── shared/                        # NEW: Shared across features
│   ├── constants/
│   ├── utils/
│   ├── validators/               # Shared validation utilities
│   ├── transformers/             # Move from src/transformer
│   └── middlewares/              # Move from src/middlewares
├── features/                      # Feature modules
│   ├── [feature-name]/
│   │   ├── domain/               # Business logic
│   │   │   ├── entities/
│   │   │   ├── rules/
│   │   │   └── events/          # NEW: Domain events
│   │   ├── application/          # Use cases
│   │   │   ├── services/
│   │   │   ├── validators/
│   │   │   └── handlers/
│   │   ├── infrastructure/
│   │   │   ├── repositories/
│   │   │   ├── models/
│   │   │   └── pipelines/
│   │   ├── interface/            # API layer
│   │   │   ├── http/
│   │   │   │   ├── controllers/
│   │   │   │   ├── routes/
│   │   │   │   ├── dto/
│   │   │   │   └── schemas/
│   │   │   └── webhooks/        # Webhook handlers
│   │   ├── tests/                # NEW: Co-located tests
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── fixtures/
│   │   └── index.ts              # Feature barrel export
│   └── ...
├── api/                          # NEW: API version management
│   ├── v1/
│   │   ├── routes.ts
│   │   └── index.ts
│   └── v2/
├── tests/                        # NEW: Global test setup
│   ├── setup.ts
│   ├── helpers/
│   ├── fixtures/
│   └── e2e/                     # End-to-end tests
├── scripts/                      # NEW: Utility scripts
│   ├── seed.ts
│   ├── migrate.ts
│   └── cleanup.ts
├── docs/                         # Documentation
│   ├── api/
│   ├── architecture/
│   └── guides/
├── app.ts                        # Fastify app factory
└── server.ts                     # Entry point
```

---

## 2. Testing Infrastructure (CRITICAL)

### Current State
❌ **No testing framework configured**
- No Jest, Mocha, or Vitest setup
- No test files exist
- Code coverage tracking unavailable
- Manual testing only

### Why This is Critical
Testing is the **#1 priority** for improving code quality and preventing regressions. Without tests:
- Refactoring is risky
- Bug fixes may introduce new bugs
- Collaboration is harder
- Deployment confidence is low

### Recommended Solution: Vitest + Supertest

**Why Vitest?**
- Native TypeScript support (no ts-jest needed)
- Fast (ESM-first, parallel execution)
- Jest-compatible API
- Built-in code coverage
- Watch mode with HMR

#### Implementation Steps

**1. Install Dependencies**
```bash
npm install -D vitest @vitest/ui supertest @types/supertest
npm install -D @vitest/coverage-v8  # For coverage reports
```

**2. Create `vitest.config.ts`**
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.spec.ts',
        '**/*.test.ts',
        'tests/',
        'src/config/',
        'src/server.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@features': path.resolve(__dirname, './src/features'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@config': path.resolve(__dirname, './src/config'),
      '@core': path.resolve(__dirname, './src/core'),
    },
  },
});
```

**3. Create Test Setup (`tests/setup.ts`)**
```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, afterEach } from 'vitest';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri);
});

afterEach(async () => {
  // Clean up database between tests
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
```

**4. Update `package.json` Scripts**
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "vitest run --config vitest.e2e.config.ts"
  }
}
```

**5. Example Test Structure**

**Unit Test Example (`src/features/story/tests/unit/story.service.test.ts`)**
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StoryService } from '../../story.service';
import { StoryRepository } from '../../repository/story.repository';

describe('StoryService', () => {
  let storyService: StoryService;
  let storyRepository: StoryRepository;

  beforeEach(() => {
    storyRepository = new StoryRepository();
    storyService = new StoryService(storyRepository);
  });

  describe('createStory', () => {
    it('should create a story with valid data', async () => {
      const storyData = {
        title: 'Test Story',
        description: 'A test story',
        creatorId: 'user_123',
      };

      const result = await storyService.createStory(storyData);

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Story');
      expect(result.status).toBe('draft');
    });

    it('should throw error when title is empty', async () => {
      const storyData = {
        title: '',
        description: 'A test story',
        creatorId: 'user_123',
      };

      await expect(storyService.createStory(storyData))
        .rejects
        .toThrow('Title is required');
    });
  });
});
```

**Integration Test Example (`src/features/story/tests/integration/story.integration.test.ts`)**
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createApp } from '../../../../app';
import { connectDB } from '../../../../config/db';

describe('Story API Integration Tests', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    await connectDB();
    app = await createApp();
    // Mock authentication or get test token
    authToken = 'mock_jwt_token';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/stories', () => {
    it('should create a new story', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/stories',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          title: 'Integration Test Story',
          description: 'Testing story creation',
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().success).toBe(true);
      expect(response.json().data.title).toBe('Integration Test Story');
    });

    it('should return 400 for invalid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/stories',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          // Missing required fields
          description: 'No title provided',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
```

**E2E Test Example (`tests/e2e/story-workflow.e2e.test.ts`)**
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createApp } from '../../src/app';

describe('Story Workflow E2E', () => {
  let app: FastifyInstance;
  let storyId: string;
  let authToken: string;

  beforeAll(async () => {
    app = await createApp();
    // Get auth token for test user
    authToken = await getTestUserToken();
  });

  it('should complete full story creation workflow', async () => {
    // 1. Create story
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/stories',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { title: 'E2E Test Story', description: 'Testing' },
    });

    expect(createResponse.statusCode).toBe(201);
    storyId = createResponse.json().data._id;

    // 2. Add chapter
    const chapterResponse = await app.inject({
      method: 'POST',
      url: `/api/stories/${storyId}/chapters`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { title: 'Chapter 1', content: 'Content' },
    });

    expect(chapterResponse.statusCode).toBe(201);

    // 3. Publish story
    const publishResponse = await app.inject({
      method: 'PATCH',
      url: `/api/stories/${storyId}/publish`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(publishResponse.statusCode).toBe(200);
    expect(publishResponse.json().data.status).toBe('published');
  });
});
```

**6. Test Coverage Goals**
```
Target Coverage:
├── Overall: 70%+
├── Services: 80%+
├── Controllers: 60%+
├── Repositories: 80%+
├── Domain Rules: 90%+
└── Utilities: 85%+
```

---

## 3. Dependency Injection Container

### Current Issue
Services and repositories are instantiated manually with `new` keyword:
```typescript
// story.service.ts
export const storyService = new StoryService();

// story.controller.ts
import { storyService } from './story.service';
```

**Problems:**
- Hard to test (can't easily mock dependencies)
- Tight coupling between modules
- Circular dependencies possible
- No lifecycle management

### Recommended Solution: TSyringe

**Why TSyringe?**
- Lightweight (~5KB)
- Decorator-based
- TypeScript-first
- Constructor injection
- Singleton/Transient/Scoped lifetimes

#### Implementation

**1. Install TSyringe**
```bash
npm install tsyringe reflect-metadata
```

**2. Enable Decorators in `tsconfig.json`**
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

**3. Create DI Container (`src/core/di/container.ts`)**
```typescript
import 'reflect-metadata';
import { container } from 'tsyringe';

// Register all services
export function setupDependencyInjection() {
  // Repositories
  container.register('StoryRepository', { useClass: StoryRepository });
  container.register('UserRepository', { useClass: UserRepository });
  container.register('ChapterRepository', { useClass: ChapterRepository });

  // Services
  container.register('StoryService', { useClass: StoryService });
  container.register('UserService', { useClass: UserService });
  container.register('ChapterService', { useClass: ChapterService });

  // Infrastructure
  container.register('EmailService', { useClass: EmailService });
  container.register('CacheService', { useClass: RedisCacheService });
  container.register('StorageService', { useClass: CloudinaryService });

  return container;
}
```

**4. Refactor Services with Injection**
```typescript
// BEFORE
export class StoryService extends BaseModule {
  constructor() {
    super();
    this.storyRepository = new StoryRepository();
    this.userRepository = new UserRepository();
  }
}

// AFTER
import { injectable, inject } from 'tsyringe';

@injectable()
export class StoryService extends BaseModule {
  constructor(
    @inject('StoryRepository') private storyRepository: StoryRepository,
    @inject('UserRepository') private userRepository: UserRepository,
    @inject('CacheService') private cacheService: CacheService
  ) {
    super();
  }

  async getStoryById(id: string) {
    // Check cache first
    const cached = await this.cacheService.get(`story:${id}`);
    if (cached) return cached;

    const story = await this.storyRepository.findById(id);
    await this.cacheService.set(`story:${id}`, story, 3600);
    return story;
  }
}
```

**5. Update Controllers**
```typescript
import { container } from 'tsyringe';

export class StoryController extends BaseModule {
  private storyService: StoryService;

  constructor() {
    super();
    this.storyService = container.resolve(StoryService);
  }

  // ... controller methods
}
```

**6. Testing Benefits**
```typescript
import { container } from 'tsyringe';
import { describe, it, expect, beforeEach } from 'vitest';

describe('StoryService', () => {
  let storyService: StoryService;
  let mockRepository: StoryRepository;

  beforeEach(() => {
    // Create a child container for testing
    const testContainer = container.createChildContainer();

    // Mock repository
    mockRepository = {
      findById: vi.fn(),
      create: vi.fn(),
    } as any;

    // Register mock
    testContainer.register('StoryRepository', { useValue: mockRepository });

    // Resolve service with mocked dependencies
    storyService = testContainer.resolve(StoryService);
  });

  it('should use cached story', async () => {
    mockRepository.findById.mockResolvedValue({ id: '1', title: 'Test' });

    await storyService.getStoryById('1');

    expect(mockRepository.findById).toHaveBeenCalledTimes(1);
  });
});
```

---

## 4. Import Path Aliases

### Current Issue
Messy relative imports:
```typescript
import { BaseModule } from '../../utils/baseClass';
import { storyService } from '../story/story.service';
import { HTTP_STATUS } from '../../constants/httpStatus';
```

### Solution: Path Mapping

**1. Update `tsconfig.json`**
```json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"],
      "@core/*": ["core/*"],
      "@features/*": ["features/*"],
      "@shared/*": ["shared/*"],
      "@config/*": ["config/*"],
      "@infrastructure/*": ["infrastructure/*"],
      "@models/*": ["models/*"],
      "@utils/*": ["utils/*"],
      "@constants/*": ["constants/*"],
      "@middlewares/*": ["middlewares/*"],
      "@dto/*": ["dto/*"],
      "@schema/*": ["schema/*"],
      "@domain/*": ["domain/*"],
      "@transformer/*": ["transformer/*"]
    }
  }
}
```

**2. Install Module Alias for Runtime**
```bash
npm install module-alias
npm install -D @types/module-alias
```

**3. Add to `package.json`**
```json
{
  "_moduleAliases": {
    "@": "dist",
    "@core": "dist/core",
    "@features": "dist/features",
    "@shared": "dist/shared",
    "@config": "dist/config",
    "@infrastructure": "dist/infrastructure"
  }
}
```

**4. Import in `server.ts` (before other imports)**
```typescript
import 'module-alias/register';
import { createApp } from './app';
// ... rest of imports
```

**5. Clean Imports**
```typescript
// BEFORE
import { BaseModule } from '../../utils/baseClass';
import { storyService } from '../story/story.service';
import { HTTP_STATUS } from '../../constants/httpStatus';

// AFTER
import { BaseModule } from '@core/base';
import { StoryService } from '@features/story/story.service';
import { HTTP_STATUS } from '@constants/httpStatus';
```

---

## 5. API Versioning Strategy

### Current State
No versioning system in place. All routes on `/api/*`.

### Why Versioning Matters
- Breaking changes without affecting existing clients
- Gradual migration paths
- Deprecation management
- Multiple client versions support

### Recommended Approach: URL-based Versioning

**1. Create Version Structure**
```
src/
├── api/
│   ├── v1/
│   │   ├── routes.ts          # v1 route aggregator
│   │   ├── features/          # v1-specific features
│   │   └── index.ts
│   └── v2/
│       ├── routes.ts
│       └── index.ts
└── features/
    └── story/
        ├── v1/                # Version-specific implementations
        │   ├── story.controller.ts
        │   └── story.routes.ts
        └── v2/
            ├── story.controller.ts
            └── story.routes.ts
```

**2. Version Router (`src/api/v1/routes.ts`)**
```typescript
import { FastifyInstance } from 'fastify';
import { storyRoutes } from '@features/story/v1/story.routes';
import { userRoutes } from '@features/user/v1/user.routes';

export async function registerV1Routes(app: FastifyInstance) {
  app.register(
    async (v1App) => {
      // Register all v1 routes
      v1App.register(storyRoutes, { prefix: '/stories' });
      v1App.register(userRoutes, { prefix: '/users' });
      // ... other routes
    },
    { prefix: '/v1' }
  );
}
```

**3. App Registration (`src/app.ts`)**
```typescript
import { registerV1Routes } from './api/v1/routes';
import { registerV2Routes } from './api/v2/routes';

export const createApp = async () => {
  const app = Fastify();

  // ... middleware setup

  // Register versioned APIs
  await app.register(registerV1Routes, { prefix: '/api' });
  await app.register(registerV2Routes, { prefix: '/api' });

  // Redirect /api to latest version
  app.get('/api', async (request, reply) => {
    return reply.redirect('/api/v1');
  });

  return app;
};
```

**4. Version Deprecation Header**
```typescript
// src/api/v1/index.ts
export async function registerV1Routes(app: FastifyInstance) {
  app.addHook('onSend', async (request, reply) => {
    reply.header('X-API-Version', 'v1');
    reply.header('X-API-Deprecated', 'false');
    // reply.header('X-API-Sunset', '2025-12-31'); // When deprecating
  });

  // ... route registration
}
```

**5. Shared Code Strategy**
```typescript
// Shared service logic
src/features/story/
├── domain/              # Shared domain logic (no versioning)
│   └── story.rules.ts
├── infrastructure/      # Shared data layer
│   └── repositories/
├── application/         # Shared services
│   └── story.service.ts
└── interface/           # Version-specific interfaces
    ├── v1/
    │   ├── story.controller.ts
    │   ├── story.routes.ts
    │   └── story.dto.ts
    └── v2/
        ├── story.controller.ts
        ├── story.routes.ts
        └── story.dto.ts
```

---

## 6. Environment & Configuration Management

### Current Issues
- Environment validation is good (using Zod ✅)
- But hardcoded values in `app.ts` (CORS, Swagger config)
- Redis and queue infrastructure commented out
- No environment-specific configs (dev/staging/production)

### Improvements

**1. Extract Configuration Files**

**`src/config/cors.config.ts`**
```typescript
import { FastifyCorsOptions } from '@fastify/cors';
import { env } from './env';

export const corsConfig: FastifyCorsOptions = {
  origin: env.CORS_ORIGIN || true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  maxAge: 86400, // 24 hours
};
```

**`src/config/swagger.config.ts`**
```typescript
import { FastifySwaggerOptions } from '@fastify/swagger';
import { FastifySwaggerUiOptions } from '@fastify/swagger-ui';
import { env } from './env';

export const swaggerConfig: FastifySwaggerOptions = {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'StoryChain API',
      description: 'API documentation for StoryChain - A collaborative storytelling platform',
      version: '1.0.0',
      contact: {
        name: 'StoryChain Team',
        email: 'support@storychain.io',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: env.NODE_ENV === 'production'
          ? env.RAILWAY_URL
          : `http://localhost:${env.PORT}`,
        description: env.NODE_ENV === 'production'
          ? 'Production server'
          : 'Development server',
      },
    ],
    tags: [
      { name: 'Users', description: 'User management endpoints' },
      { name: 'Stories', description: 'Story management endpoints' },
      // ... other tags
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your Clerk JWT token',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
};

export const swaggerUiConfig: FastifySwaggerUiOptions = {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
    persistAuthorization: true,
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
};
```

**2. Environment-Specific Configs**

**`src/config/index.ts`**
```typescript
import { env } from './env';

export interface AppConfig {
  port: number;
  host: string;
  nodeEnv: string;
  database: {
    uri: string;
    options: {
      maxPoolSize: number;
      minPoolSize: number;
      socketTimeoutMS: number;
    };
  };
  redis: {
    url: string;
    maxRetriesPerRequest: number;
  };
  cache: {
    ttl: number;
    max: number;
  };
  rateLimit: {
    max: number;
    timeWindow: string;
  };
  upload: {
    maxFileSize: number;
    allowedMimeTypes: string[];
  };
}

const developmentConfig: Partial<AppConfig> = {
  cache: { ttl: 300, max: 100 },
  rateLimit: { max: 1000, timeWindow: '1 minute' },
};

const productionConfig: Partial<AppConfig> = {
  cache: { ttl: 3600, max: 1000 },
  rateLimit: { max: 100, timeWindow: '15 minutes' },
};

const baseConfig: AppConfig = {
  port: env.PORT,
  host: env.HOST,
  nodeEnv: env.NODE_ENV,
  database: {
    uri: env.MONGODB_URI,
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
    },
  },
  redis: {
    url: env.REDIS_URL,
    maxRetriesPerRequest: 3,
  },
  cache: { ttl: 600, max: 500 },
  rateLimit: { max: 100, timeWindow: '15 minutes' },
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
};

export const config: AppConfig = {
  ...baseConfig,
  ...(env.NODE_ENV === 'production' ? productionConfig : developmentConfig),
};
```

**3. Uncomment and Configure Redis/Queues**

**`src/infrastructure/cache/redis.service.ts`**
```typescript
import { injectable } from 'tsyringe';
import Redis from 'ioredis';
import { config } from '@config';
import { logger } from '@utils/logger';

@injectable()
export class RedisCacheService {
  private client: Redis;

  constructor() {
    this.client = new Redis(config.redis.url, {
      maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => logger.info('Redis connected'));
    this.client.on('error', (err) => logger.error('Redis error', err));
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: any, ttl: number = config.cache.ttl): Promise<void> {
    await this.client.setex(key, ttl, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async flush(): Promise<void> {
    await this.client.flushdb();
  }
}
```

---

## 7. Logging & Monitoring

### Current State
- Winston configured ✅
- Basic logging in BaseModule ✅
- But no structured logging context
- No request ID tracking
- No performance monitoring
- No error tracking integration (Sentry, etc.)

### Enhancements

**1. Request ID Middleware**
```typescript
// src/middlewares/requestId.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';

export async function requestIdMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = request.headers['x-request-id'] || randomUUID();
  request.headers['x-request-id'] = requestId as string;
  reply.header('X-Request-ID', requestId);
}
```

**2. Structured Logging**
```typescript
// src/utils/logger.ts
import winston from 'winston';
import { env } from '@config/env';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata(),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'storychain-api', env: env.NODE_ENV },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

if (env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

// Add request context to logs
export function logWithContext(
  level: string,
  message: string,
  meta: Record<string, any> = {}
) {
  logger.log(level, message, {
    ...meta,
    timestamp: new Date().toISOString(),
  });
}
```

**3. Request Logging Middleware**
```typescript
// src/middlewares/requestLogger.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '@utils/logger';

export async function requestLoggerMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const start = Date.now();

  reply.addHook('onSend', async () => {
    const duration = Date.now() - start;

    logger.info('HTTP Request', {
      requestId: request.headers['x-request-id'],
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration: `${duration}ms`,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      userId: (request as any).user?.clerkId,
    });
  });
}
```

**4. Performance Monitoring**
```typescript
// src/utils/performance.ts
import { logger } from './logger';

export function measurePerformance(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const start = performance.now();

    try {
      const result = await originalMethod.apply(this, args);
      const duration = performance.now() - start;

      if (duration > 1000) {
        logger.warn('Slow operation detected', {
          class: target.constructor.name,
          method: propertyKey,
          duration: `${duration.toFixed(2)}ms`,
        });
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      logger.error('Operation failed', {
        class: target.constructor.name,
        method: propertyKey,
        duration: `${duration.toFixed(2)}ms`,
        error,
      });
      throw error;
    }
  };

  return descriptor;
}

// Usage:
export class StoryService {
  @measurePerformance
  async getStoryById(id: string) {
    // ... implementation
  }
}
```

**5. Error Tracking Integration (Sentry)**
```bash
npm install @sentry/node @sentry/profiling-node
```

```typescript
// src/config/sentry.ts
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { env } from './env';

export function initializeSentry() {
  if (env.NODE_ENV === 'production' && env.SENTRY_DSN) {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      integrations: [
        new ProfilingIntegration(),
      ],
      tracesSampleRate: 0.1,
      profilesSampleRate: 0.1,
    });
  }
}

// Add to app.ts
app.addHook('onError', async (request, reply, error) => {
  Sentry.captureException(error, {
    contexts: {
      request: {
        method: request.method,
        url: request.url,
        headers: request.headers,
      },
    },
    user: {
      id: (request as any).user?.clerkId,
    },
  });
});
```

---

## 8. Error Handling Enhancements

### Current State
- Good: ApiError class with HTTP status codes ✅
- Good: Global error handler ✅
- Good: catchAsync wrapper ✅

### Missing
- Error codes/types for client-side handling
- Validation error details formatting
- Error monitoring/alerting
- Retry logic for transient failures

### Improvements

**1. Error Codes Enum**
```typescript
// src/constants/errorCodes.ts
export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Resources
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',

  // Business Logic
  STORY_NOT_PUBLISHED = 'STORY_NOT_PUBLISHED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  COLLABORATOR_LIMIT_REACHED = 'COLLABORATOR_LIMIT_REACHED',

  // External Services
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Internal
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}
```

**2. Enhanced ApiError Class**
```typescript
// src/utils/apiError.ts
import { HTTP_STATUS } from '@constants/httpStatus';
import { ErrorCode } from '@constants/errorCodes';

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    errorCode: ErrorCode,
    details?: any,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  static unauthorized(message = 'Unauthorized', details?: any) {
    return new ApiError(
      HTTP_STATUS.UNAUTHORIZED.code,
      message,
      ErrorCode.UNAUTHORIZED,
      details
    );
  }

  static notFound(resource: string, details?: any) {
    return new ApiError(
      HTTP_STATUS.NOT_FOUND.code,
      `${resource} not found`,
      ErrorCode.RESOURCE_NOT_FOUND,
      details
    );
  }

  static validationError(message = 'Validation failed', details?: any) {
    return new ApiError(
      HTTP_STATUS.BAD_REQUEST.code,
      message,
      ErrorCode.VALIDATION_ERROR,
      details
    );
  }

  // ... other factory methods
}
```

**3. Enhanced Error Handler with Zod Support**
```typescript
// src/middlewares/errorHandler.ts
import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { ApiError } from '@utils/apiError';
import { HTTP_STATUS } from '@constants/httpStatus';
import { logger } from '@utils/logger';

export const globalErrorHandler = (isDevelopment: boolean) => {
  return async (
    error: FastifyError | ApiError | ZodError,
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    // Log error with context
    logger.error('Request error', {
      error: error.message,
      stack: error.stack,
      requestId: request.headers['x-request-id'],
      method: request.method,
      url: request.url,
      userId: (request as any).user?.clerkId,
    });

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));

      return reply.status(HTTP_STATUS.BAD_REQUEST.code).send({
        success: false,
        message: 'Validation failed',
        errorCode: 'VALIDATION_ERROR',
        errors: formattedErrors,
      });
    }

    // Handle custom ApiError
    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send({
        success: false,
        message: error.message,
        errorCode: error.errorCode,
        details: error.details,
        ...(isDevelopment && { stack: error.stack }),
      });
    }

    // Handle Fastify errors
    if ('statusCode' in error) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message,
        errorCode: 'INTERNAL_SERVER_ERROR',
        ...(isDevelopment && { stack: error.stack }),
      });
    }

    // Default error response
    return reply.status(HTTP_STATUS.INTERNAL_ERROR.code).send({
      success: false,
      message: isDevelopment ? error.message : 'Internal server error',
      errorCode: 'INTERNAL_SERVER_ERROR',
      ...(isDevelopment && { stack: error.stack }),
    });
  };
};
```

**4. Retry Logic for Transient Failures**
```typescript
// src/utils/retry.ts
import { logger } from './logger';

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    exponentialBackoff?: boolean;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    exponentialBackoff = true,
    onRetry,
  } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      const waitTime = exponentialBackoff ? delay * Math.pow(2, attempt - 1) : delay;

      logger.warn(`Retry attempt ${attempt}/${maxRetries}`, {
        error: (error as Error).message,
        waitTime,
      });

      if (onRetry) {
        onRetry(attempt, error as Error);
      }

      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw new Error('Max retries reached');
}

// Usage:
const story = await withRetry(
  () => storyRepository.findById(id),
  { maxRetries: 3, delay: 500 }
);
```

---

## 9. Security Improvements

### Current Security Measures
- ✅ Helmet for security headers
- ✅ CORS configured
- ✅ Clerk authentication
- ✅ RBAC implementation

### Additional Security Layers Needed

**1. Rate Limiting**
```bash
npm install @fastify/rate-limit
```

```typescript
// src/config/rateLimit.ts
import rateLimit from '@fastify/rate-limit';
import { config } from './index';

export const rateLimitConfig = {
  global: true,
  max: config.rateLimit.max,
  timeWindow: config.rateLimit.timeWindow,
  cache: 10000,
  allowList: ['127.0.0.1'], // Whitelist IPs
  redis: redisClient, // Use Redis for distributed rate limiting
  keyGenerator: (request: FastifyRequest) => {
    return (request as any).user?.clerkId || request.ip;
  },
  errorResponseBuilder: () => ({
    success: false,
    message: 'Rate limit exceeded. Please try again later.',
    errorCode: 'RATE_LIMIT_EXCEEDED',
  }),
};

// Different limits for different routes
export const strictRateLimit = {
  max: 5,
  timeWindow: '1 minute',
};

export const authRateLimit = {
  max: 10,
  timeWindow: '5 minutes',
};
```

```typescript
// In app.ts
await app.register(rateLimit, rateLimitConfig);

// In specific routes
app.register(async (authRoutes) => {
  authRoutes.post('/login', {
    config: {
      rateLimit: authRateLimit,
    },
  }, loginHandler);
});
```

**2. Input Sanitization**
```bash
npm install dompurify jsdom
npm install -D @types/dompurify @types/jsdom
```

```typescript
// src/utils/sanitize.ts
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

export function sanitizeHtml(dirty: string): string {
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
  });
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .substring(0, 10000); // Limit length
}

// Middleware for sanitizing request body
export async function sanitizeRequestBody(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (request.body && typeof request.body === 'object') {
    sanitizeObject(request.body);
  }
}

function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = sanitizeInput(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}
```

**3. SQL Injection Prevention (MongoDB)**
```typescript
// src/utils/mongoSanitize.ts
export function sanitizeMongoQuery(query: any): any {
  if (typeof query !== 'object' || query === null) {
    return query;
  }

  const sanitized: any = Array.isArray(query) ? [] : {};

  for (const key in query) {
    // Remove keys starting with $ (MongoDB operators)
    if (key.startsWith('$')) {
      continue;
    }

    const value = query[key];

    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeMongoQuery(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// Usage in repository
async findOne(filter: FilterQuery<TDocument>) {
  const sanitizedFilter = sanitizeMongoQuery(filter);
  return this.model.findOne(sanitizedFilter).lean().exec();
}
```

**4. CSRF Protection**
```bash
npm install @fastify/csrf-protection
```

```typescript
// In app.ts
import csrf from '@fastify/csrf-protection';

await app.register(csrf, {
  cookieOpts: { signed: true },
});

// For forms
app.get('/form', async (request, reply) => {
  const token = await reply.generateCsrf();
  return { csrfToken: token };
});

app.post('/form', async (request, reply) => {
  // CSRF token automatically verified
  // ...
});
```

**5. Security Headers Enhancement**
```typescript
// src/config/helmet.ts
export const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
};
```

**6. Secrets Management**
```bash
# Use environment variables, never commit secrets
# Consider using a secrets manager for production

# .env.example (commit this)
MONGODB_URI=mongodb://localhost:27017/storychain
REDIS_URL=redis://localhost:6379
CLERK_SECRET_KEY=your_clerk_secret
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

# .env (never commit this)
# Actual secrets go here
```

**7. Audit Logging**
```typescript
// src/middlewares/auditLog.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuditLogModel } from '@models/auditLog.model';

const SENSITIVE_ROUTES = [
  '/api/users',
  '/api/stories/*/collaborators',
  '/api/platform-roles',
];

export async function auditLogMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const shouldLog = SENSITIVE_ROUTES.some((route) =>
    request.url.includes(route)
  );

  if (!shouldLog) return;

  reply.addHook('onSend', async () => {
    await AuditLogModel.create({
      userId: (request as any).user?.clerkId,
      action: `${request.method} ${request.url}`,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      timestamp: new Date(),
      statusCode: reply.statusCode,
    });
  });
}
```

---

## 10. Code Quality & Standards

### ESLint Configuration Enhancements

**Update `.eslintrc.json`**
```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint", "import"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }
    ],
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-unsafe-assignment": "warn",
    "@typescript-eslint/no-unsafe-member-access": "warn",
    "@typescript-eslint/no-unsafe-call": "warn",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "import/order": [
      "error",
      {
        "groups": [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index"
        ],
        "newlines-between": "always",
        "alphabetize": { "order": "asc" }
      }
    ],
    "import/no-duplicates": "error",
    "import/no-cycle": "error",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### Prettier Configuration

**Create `.prettierrc`**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### Husky + Lint-Staged (Pre-commit Hooks)

```bash
npm install -D husky lint-staged
npx husky init
```

**`.husky/pre-commit`**
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

**`package.json`**
```json
{
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write",
      "vitest related --run"
    ]
  }
}
```

### TypeScript Strict Mode Enhancements

**Update `tsconfig.json`**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true
  }
}
```

---

## 11. Database & Performance

### Database Indexing Strategy

**Create `src/scripts/createIndexes.ts`**
```typescript
import mongoose from 'mongoose';
import { StoryModel } from '@models/story.model';
import { UserModel } from '@models/user.model';
import { ChapterModel } from '@models/chapter.model';

export async function createDatabaseIndexes() {
  // Story indexes
  await StoryModel.collection.createIndex({ slug: 1 }, { unique: true });
  await StoryModel.collection.createIndex({ creatorId: 1 });
  await StoryModel.collection.createIndex({ status: 1, createdAt: -1 });
  await StoryModel.collection.createIndex({ genre: 1 });
  await StoryModel.collection.createIndex({
    title: 'text',
    description: 'text'
  }, {
    weights: { title: 10, description: 5 }
  });

  // User indexes
  await UserModel.collection.createIndex({ clerkId: 1 }, { unique: true });
  await UserModel.collection.createIndex({ username: 1 }, { unique: true });
  await UserModel.collection.createIndex({ email: 1 }, { unique: true });

  // Chapter indexes
  await ChapterModel.collection.createIndex({ storyId: 1, chapterNumber: 1 });
  await ChapterModel.collection.createIndex({ storyId: 1, status: 1 });

  console.log('✅ Database indexes created successfully');
}

// Run: tsx src/scripts/createIndexes.ts
```

### Query Optimization

**1. Add Projection to Queries**
```typescript
// BEFORE - fetches all fields
const story = await StoryModel.findById(id);

// AFTER - only fetch needed fields
const story = await StoryModel.findById(id)
  .select('title description status creatorId')
  .lean();
```

**2. Use Lean Queries**
```typescript
// BaseRepository already uses .lean() ✅
// Converts Mongoose documents to plain objects (faster)
```

**3. Implement Pagination Helper**
```typescript
// src/utils/pagination.ts
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export async function paginate<T>(
  query: any,
  params: PaginationParams = {}
): Promise<PaginatedResponse<T>> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 10));
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    query.skip(skip).limit(limit).lean().exec(),
    query.model.countDocuments(query.getFilter()),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

// Usage:
const result = await paginate<Story>(
  StoryModel.find({ status: 'published' }).sort({ createdAt: -1 }),
  { page: 1, limit: 20 }
);
```

### Caching Strategy

**1. Cache Decorator**
```typescript
// src/utils/cache.ts
import { container } from 'tsyringe';
import { RedisCacheService } from '@infrastructure/cache/redis.service';

export function Cacheable(keyPrefix: string, ttl: number = 3600) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheService = container.resolve(RedisCacheService);
      const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`;

      // Try to get from cache
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Execute method
      const result = await originalMethod.apply(this, args);

      // Store in cache
      await cacheService.set(cacheKey, result, ttl);

      return result;
    };

    return descriptor;
  };
}

// Usage:
export class StoryService {
  @Cacheable('story', 3600)
  async getStoryById(id: string) {
    return this.storyRepository.findById(id);
  }
}
```

**2. Cache Invalidation**
```typescript
// src/utils/cache.ts
export function InvalidateCache(keyPattern: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      // Invalidate cache after successful operation
      const cacheService = container.resolve(RedisCacheService);
      await cacheService.deletePattern(keyPattern);

      return result;
    };

    return descriptor;
  };
}

// Usage:
export class StoryService {
  @InvalidateCache('story:*')
  async updateStory(id: string, data: Partial<Story>) {
    return this.storyRepository.findOneAndUpdate({ _id: id }, data);
  }
}
```

---

## 12. Documentation

### API Documentation Enhancements

**1. Add Response Examples to Swagger**
```typescript
// src/features/story/story.routes.ts
export async function storyRoutes(app: FastifyInstance) {
  app.post('/stories', {
    schema: {
      tags: ['Stories'],
      summary: 'Create a new story',
      description: 'Creates a new story in draft status',
      body: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          genre: {
            type: 'array',
            items: { type: 'string' },
            maxItems: 3
          },
        },
      },
      response: {
        201: {
          description: 'Story created successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Story created successfully' },
            data: {
              type: 'object',
              properties: {
                _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                title: { type: 'string', example: 'My Awesome Story' },
                status: { type: 'string', example: 'draft' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        400: {
          description: 'Validation error',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errorCode: { type: 'string' },
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  }, storyController.createStory);
}
```

### Code Documentation

**1. JSDoc Comments**
```typescript
/**
 * Service for managing stories in the StoryChain platform.
 * Handles story creation, updates, publishing, and collaboration.
 *
 * @class StoryService
 * @extends {BaseModule}
 */
@injectable()
export class StoryService extends BaseModule {
  constructor(
    @inject('StoryRepository') private storyRepository: StoryRepository,
    @inject('UserRepository') private userRepository: UserRepository
  ) {
    super();
  }

  /**
   * Creates a new story in draft status.
   *
   * @param {IStoryCreateDTO} data - Story creation data
   * @returns {Promise<Story>} The created story
   * @throws {ApiError} If validation fails or user not found
   *
   * @example
   * const story = await storyService.createStory({
   *   title: 'My Story',
   *   description: 'A great story',
   *   creatorId: 'user_123'
   * });
   */
  async createStory(data: IStoryCreateDTO): Promise<Story> {
    // Implementation
  }
}
```

### Architecture Documentation

**Create `docs/architecture/README.md`**
```markdown
# StoryChain Architecture Documentation

## Overview
StoryChain follows a layered architecture with domain-driven design principles.

## Layers

### 1. Domain Layer
Contains business logic and rules independent of infrastructure.

**Location:** `src/features/*/domain/`

**Contents:**
- Business rules
- Domain entities
- Domain events

### 2. Application Layer
Contains use cases and application services.

**Location:** `src/features/*/application/`

**Contents:**
- Services (orchestration)
- Validators
- Handlers

### 3. Infrastructure Layer
Contains technical implementations and data access.

**Location:** `src/features/*/infrastructure/`

**Contents:**
- Repositories
- Database models
- External service integrations

### 4. Interface Layer
Contains API controllers, routes, and DTOs.

**Location:** `src/features/*/interface/`

**Contents:**
- Controllers
- Routes
- DTOs
- Request/Response schemas

## Data Flow

```
Request → Route → Middleware → Controller → Service → Repository → Database
                                    ↓
                              Domain Rules
```

## Key Patterns

- **Repository Pattern**: Abstracts data access
- **Dependency Injection**: Manages dependencies
- **Factory Pattern**: Creates complex objects
- **Builder Pattern**: Constructs aggregation pipelines
- **Decorator Pattern**: Adds cross-cutting concerns (caching, logging)
```

---

## 13. CI/CD Pipeline

### GitHub Actions Workflow

**Create `.github/workflows/ci.yml`**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:7.0
        ports:
          - 27017:27017
        options: >-
          --health-cmd "mongosh --eval 'db.adminCommand({ ping: 1 })'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Run tests
        run: npm run test:coverage
        env:
          NODE_ENV: test
          MONGODB_URI: mongodb://localhost:27017/storychain_test
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: test

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build project
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: dist/

  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Deploy to Railway
        run: |
          echo "Deploying to Railway..."
          # Railway deployment happens automatically via GitHub integration
```

**Create `.github/workflows/security.yml`**
```yaml
name: Security Scan

on:
  push:
    branches: [ main, develop ]
  schedule:
    - cron: '0 0 * * 0' # Weekly on Sundays

jobs:
  security:
    name: Security Audit
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run npm audit
        run: npm audit --audit-level=moderate

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

---

## 14. Feature Module Best Practices

### Standardized Feature Structure

Each feature should follow this structure:

```
features/[feature-name]/
├── domain/
│   ├── entities/
│   │   └── [feature].entity.ts      # Pure domain objects
│   ├── rules/
│   │   └── [feature].rules.ts       # Business validation rules
│   └── events/
│       └── [feature].events.ts      # Domain events
├── application/
│   ├── services/
│   │   └── [feature].service.ts     # Business logic orchestration
│   ├── validators/
│   │   └── [feature].validator.ts   # Application-level validation
│   └── handlers/
│       └── [feature].handler.ts     # Command/query handlers
├── infrastructure/
│   ├── repositories/
│   │   └── [feature].repository.ts  # Data access layer
│   ├── models/
│   │   └── [feature].model.ts       # Mongoose schema
│   └── pipelines/
│       └── [feature].pipeline.ts    # MongoDB aggregations
├── interface/
│   ├── http/
│   │   ├── controllers/
│   │   │   └── [feature].controller.ts
│   │   ├── routes/
│   │   │   └── [feature].routes.ts
│   │   ├── dto/
│   │   │   └── [feature].dto.ts
│   │   └── schemas/
│   │       └── [feature].schema.ts  # Zod schemas
│   └── webhooks/
│       └── [feature].webhook.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
└── index.ts                         # Barrel export
```

### Example: Refactored Story Feature

**Current:**
```
features/story/
├── story.controller.ts
├── story.service.ts
├── story.routes.ts
├── story.types.ts
├── repository/
│   └── story.repository.ts
└── pipelines/
    └── ...
```

**Proposed:**
```
features/story/
├── domain/
│   ├── entities/
│   │   └── story.entity.ts
│   ├── rules/
│   │   └── story.rules.ts
│   └── events/
│       ├── storyCreated.event.ts
│       └── storyPublished.event.ts
├── application/
│   ├── services/
│   │   ├── storyCreation.service.ts
│   │   ├── storyPublishing.service.ts
│   │   └── storyCollaboration.service.ts
│   └── validators/
│       └── storyValidation.service.ts
├── infrastructure/
│   ├── repositories/
│   │   └── story.repository.ts
│   ├── models/
│   │   └── story.model.ts
│   └── pipelines/
│       ├── storySearch.pipeline.ts
│       └── storyStatistics.pipeline.ts
├── interface/
│   ├── http/
│   │   ├── controllers/
│   │   │   ├── story.controller.ts
│   │   │   └── storyPublic.controller.ts
│   │   ├── routes/
│   │   │   └── story.routes.ts
│   │   ├── dto/
│   │   │   ├── createStory.dto.ts
│   │   │   ├── updateStory.dto.ts
│   │   │   └── storyResponse.dto.ts
│   │   └── schemas/
│   │       └── story.schema.ts
│   └── webhooks/
│       └── storyWebhook.controller.ts
├── tests/
│   ├── unit/
│   │   ├── storyCreation.service.test.ts
│   │   └── story.rules.test.ts
│   ├── integration/
│   │   └── story.integration.test.ts
│   └─�� fixtures/
│       └── story.fixtures.ts
└── index.ts
```

### Domain Events Example

```typescript
// src/features/story/domain/events/storyPublished.event.ts
export class StoryPublishedEvent {
  constructor(
    public readonly storyId: string,
    public readonly title: string,
    public readonly creatorId: string,
    public readonly publishedAt: Date
  ) {}
}

// src/infrastructure/events/eventBus.ts
import { injectable } from 'tsyringe';

@injectable()
export class EventBus {
  private handlers: Map<string, Array<(event: any) => Promise<void>>> = new Map();

  subscribe<T>(eventType: string, handler: (event: T) => Promise<void>) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  async publish<T>(eventType: string, event: T): Promise<void> {
    const handlers = this.handlers.get(eventType) || [];
    await Promise.all(handlers.map((handler) => handler(event)));
  }
}

// Usage in service
@injectable()
export class StoryPublishingService {
  constructor(
    @inject('StoryRepository') private repo: StoryRepository,
    @inject('EventBus') private eventBus: EventBus
  ) {}

  async publishStory(storyId: string): Promise<void> {
    const story = await this.repo.findById(storyId);
    story.status = 'published';
    await this.repo.update(storyId, story);

    // Publish domain event
    await this.eventBus.publish(
      'StoryPublished',
      new StoryPublishedEvent(story._id, story.title, story.creatorId, new Date())
    );
  }
}

// Event handler for notifications
@injectable()
export class StoryPublishedHandler {
  constructor(
    @inject('NotificationService') private notificationService: NotificationService
  ) {}

  async handle(event: StoryPublishedEvent): Promise<void> {
    // Send notifications to followers
    await this.notificationService.notifyFollowers(event.creatorId, {
      type: 'STORY_PUBLISHED',
      storyId: event.storyId,
      title: event.title,
    });
  }
}
```

---

## 15. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
**Priority: Critical**

- [ ] **Testing Infrastructure**
  - Install Vitest and dependencies
  - Create test setup and configuration
  - Write first unit tests for core utilities
  - Setup coverage reporting
  - Target: 30% coverage

- [ ] **Path Aliases**
  - Configure TypeScript path mapping
  - Setup module-alias for runtime
  - Refactor imports in core files

- [ ] **CI/CD Pipeline**
  - Setup GitHub Actions for tests
  - Configure linting in CI
  - Add build verification

### Phase 2: Architecture (Week 3-4)
**Priority: High**

- [ ] **Dependency Injection**
  - Install TSyringe
  - Refactor 3 core services (Story, User, Chapter)
  - Update controllers to use DI
  - Document pattern for team

- [ ] **Configuration Management**
  - Extract configs from app.ts
  - Create environment-specific configs
  - Uncomment and configure Redis
  - Setup queue infrastructure

- [ ] **Logging Enhancement**
  - Add request ID middleware
  - Implement structured logging
  - Add performance monitoring decorator
  - Configure Sentry (optional)

### Phase 3: Security & Performance (Week 5-6)
**Priority: High**

- [ ] **Security Hardening**
  - Implement rate limiting
  - Add input sanitization
  - Configure CSRF protection
  - Add audit logging for sensitive operations

- [ ] **Database Optimization**
  - Create database indexes script
  - Implement caching strategy
  - Add pagination helpers
  - Optimize N+1 queries

- [ ] **Error Handling**
  - Add error codes enum
  - Enhance ApiError class
  - Improve validation error formatting
  - Add retry logic for transient failures

### Phase 4: Testing & Documentation (Week 7-8)
**Priority: Medium**

- [ ] **Comprehensive Testing**
  - Write unit tests for all services
  - Add integration tests for key workflows
  - Create E2E tests for critical paths
  - Target: 70% coverage

- [ ] **Documentation**
  - Enhance Swagger documentation
  - Add JSDoc comments to public APIs
  - Create architecture documentation
  - Write contributing guidelines

- [ ] **Code Quality**
  - Enhance ESLint configuration
  - Setup Prettier
  - Configure Husky pre-commit hooks
  - Run full codebase lint and fix

### Phase 5: Advanced Features (Week 9-10)
**Priority: Low**

- [ ] **API Versioning**
  - Create v1/v2 structure
  - Migrate current routes to v1
  - Setup version routing
  - Add deprecation headers

- [ ] **Feature Module Refactoring**
  - Refactor Story module to new structure
  - Document pattern
  - Gradually migrate other modules

- [ ] **Monitoring & Observability**
  - Setup application metrics
  - Add health check endpoints
  - Configure alerting
  - Create monitoring dashboard

---

## Conclusion

Your StoryChain backend has a solid foundation with good architecture and patterns. The improvements outlined in this guide will:

1. **Increase Reliability**: Through comprehensive testing and error handling
2. **Enhance Security**: Via rate limiting, input sanitization, and audit logging
3. **Improve Performance**: Through caching, database optimization, and query improvements
4. **Boost Maintainability**: With dependency injection, better structure, and documentation
5. **Facilitate Collaboration**: Through CI/CD, code quality tools, and clear patterns

### Quick Wins (Start Here)

1. **Testing Infrastructure** - Most critical improvement
2. **Path Aliases** - Immediate DX improvement
3. **Rate Limiting** - Essential security
4. **Database Indexes** - Easy performance boost
5. **CI/CD Pipeline** - Catch issues early

### Key Metrics to Track

- Test coverage: Target 70%+
- API response time: < 200ms (95th percentile)
- Error rate: < 0.1%
- Build time: < 5 minutes
- Code review time: < 1 day

---

**Next Steps:**

1. Review this document with your team
2. Prioritize improvements based on your needs
3. Start with Phase 1 (Testing + CI/CD)
4. Implement incrementally, feature by feature
5. Update documentation as you go

Good luck with your improvements! 🚀
