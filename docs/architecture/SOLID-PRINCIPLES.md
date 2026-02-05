# SOLID Principles Guide for StoryChain Backend

This document provides a comprehensive guide on applying SOLID principles to the StoryChain backend codebase, with specific examples and refactoring recommendations.

---

## Table of Contents

1. [Current Architecture Overview](#current-architecture-overview)
2. [Single Responsibility Principle (SRP)](#1-single-responsibility-principle-srp)
3. [Open/Closed Principle (OCP)](#2-openclosed-principle-ocp)
4. [Liskov Substitution Principle (LSP)](#3-liskov-substitution-principle-lsp)
5. [Interface Segregation Principle (ISP)](#4-interface-segregation-principle-isp)
6. [Dependency Inversion Principle (DIP)](#5-dependency-inversion-principle-dip)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Quick Reference Checklist](#quick-reference-checklist)

---

## Current Architecture Overview

StoryChain uses a **feature-based modular architecture** with three main layers:

```
Routes → Controllers → Services → Repositories → Models
              ↓
        Domain Rules
              ↓
        Transformers
```

**Current Stack:**
- **DI Container:** tsyringe (partially implemented)
- **Validation:** Zod schemas
- **Database:** MongoDB with Mongoose
- **Base Classes:** `BaseModule`, `BaseRepository`, `BaseHandler`

---

## 1. Single Responsibility Principle (SRP)

> **"A class should have only one reason to change."**

### Current Violations

#### Problem: Monolithic Services

`StoryService` currently handles 25+ responsibilities:

```typescript
// ❌ CURRENT: story.service.ts has too many responsibilities
export class StoryService extends BaseModule {
  // Story CRUD (5+ methods)
  async createStory() { }
  async updateStory() { }
  async deleteStory() { }

  // Publishing (3+ methods)
  async publishStory() { }
  async unpublishStory() { }

  // Chapter Management (5+ methods)
  async addChapter() { }
  async reorderChapters() { }

  // Collaboration (4+ methods)
  async inviteCollaborator() { }
  async handleInvitationResponse() { }

  // Media (2+ methods)
  async uploadCoverImage() { }

  // Queries (6+ methods)
  async getStoryBySlug() { }
  async getUserStories() { }
  async getPublicStories() { }
  // ... and more
}
```

### Recommended Refactoring

Split into focused services:

```typescript
// ✅ REFACTORED: Separate services by responsibility

// src/features/story/services/story-crud.service.ts
export class StoryCrudService implements IStoryCrudService {
  async create(input: CreateStoryDTO): Promise<IStory> { }
  async update(id: string, input: UpdateStoryDTO): Promise<IStory> { }
  async delete(id: string): Promise<void> { }
  async findById(id: string): Promise<IStory | null> { }
  async findBySlug(slug: string): Promise<IStory | null> { }
}

// src/features/story/services/story-publishing.service.ts
export class StoryPublishingService implements IStoryPublishingService {
  async publish(storyId: string): Promise<IStory> { }
  async unpublish(storyId: string): Promise<IStory> { }
  async schedulePublish(storyId: string, date: Date): Promise<void> { }
}

// src/features/story/services/story-query.service.ts
export class StoryQueryService implements IStoryQueryService {
  async getPublicStories(filters: StoryFilters): Promise<PaginatedResult<IStory>> { }
  async getUserStories(userId: string): Promise<IStory[]> { }
  async getTrendingStories(): Promise<IStory[]> { }
  async searchStories(query: string): Promise<IStory[]> { }
}

// src/features/story/services/story-media.service.ts
export class StoryMediaService implements IStoryMediaService {
  async uploadCoverImage(storyId: string, file: File): Promise<string> { }
  async deleteCoverImage(storyId: string): Promise<void> { }
}
```

### Folder Structure After SRP Refactoring

```
features/story/
├── services/
│   ├── interfaces/
│   │   ├── story-crud.interface.ts
│   │   ├── story-publishing.interface.ts
│   │   ├── story-query.interface.ts
│   │   └── story-media.interface.ts
│   ├── story-crud.service.ts
│   ├── story-publishing.service.ts
│   ├── story-query.service.ts
│   ├── story-media.service.ts
│   └── index.ts                    # Barrel export
```

### Controller SRP

Controllers should only handle HTTP concerns:

```typescript
// ❌ CURRENT: Controller doing validation logic
export class StoryController extends BaseHandler {
  async createStory(req: Request, res: Response) {
    const { title, description } = req.body;

    // Validation logic mixed in controller
    if (!title || title.length < 3) {
      throw new ApiError('Title must be at least 3 characters', 400);
    }

    const story = await this.storyService.createStory(req.body);
    return ApiResponse.success(res, story);
  }
}

// ✅ REFACTORED: Controller only handles HTTP
export class StoryController extends BaseHandler {
  async createStory(req: Request, res: Response) {
    // Validation handled by middleware (Zod schema)
    // Business rules handled by service
    const story = await this.storyCrudService.create({
      ...req.body,
      creatorId: req.user.id
    });

    return ApiResponse.created(res, StoryTransformer.toDTO(story));
  }
}
```

---

## 2. Open/Closed Principle (OCP)

> **"Software entities should be open for extension but closed for modification."**

### Current Violations

#### Problem: Hardcoded Notification Types

```typescript
// ❌ CURRENT: Adding new notification requires modifying this file
// src/shared/services/notification/notification.factory.ts

const NOTIFICATION_CONFIG: Record<TNotificationType, NotificationConfig> = {
  NEW_BRANCH: {
    title: 'New Branch Created',
    message: (data) => `${data.actorName} created a branch`,
  },
  CHAPTER_UPVOTE: {
    title: 'Chapter Upvoted',
    message: (data) => `${data.actorName} upvoted your chapter`,
  },
  // Adding STORY_REPORTED requires editing this object
};
```

### Recommended Refactoring

Use the Strategy Pattern:

```typescript
// ✅ REFACTORED: Strategy Pattern for notifications

// src/shared/services/notification/strategies/notification.strategy.ts
export interface INotificationStrategy {
  readonly type: TNotificationType;
  buildNotification(data: NotificationData): NotificationPayload;
  getRecipients(data: NotificationData): Promise<string[]>;
}

// src/shared/services/notification/strategies/new-branch.strategy.ts
@injectable()
export class NewBranchNotificationStrategy implements INotificationStrategy {
  readonly type = 'NEW_BRANCH' as const;

  buildNotification(data: NotificationData): NotificationPayload {
    return {
      title: 'New Branch Created',
      message: `${data.actorName} created a new branch on "${data.storyTitle}"`,
      actionUrl: `/stories/${data.storySlug}/branches/${data.branchId}`,
    };
  }

  async getRecipients(data: NotificationData): Promise<string[]> {
    // Get story collaborators
    return data.collaboratorIds;
  }
}

// src/shared/services/notification/strategies/chapter-upvote.strategy.ts
@injectable()
export class ChapterUpvoteNotificationStrategy implements INotificationStrategy {
  readonly type = 'CHAPTER_UPVOTE' as const;

  buildNotification(data: NotificationData): NotificationPayload {
    return {
      title: 'Chapter Upvoted',
      message: `${data.actorName} upvoted your chapter "${data.chapterTitle}"`,
      actionUrl: `/chapters/${data.chapterId}`,
    };
  }

  async getRecipients(data: NotificationData): Promise<string[]> {
    return [data.authorId];
  }
}

// src/shared/services/notification/notification.service.ts
@injectable()
export class NotificationService implements INotificationService {
  private strategies: Map<TNotificationType, INotificationStrategy>;

  constructor(
    @injectAll(TOKENS.NotificationStrategy) strategies: INotificationStrategy[]
  ) {
    this.strategies = new Map(strategies.map(s => [s.type, s]));
  }

  async send(type: TNotificationType, data: NotificationData): Promise<void> {
    const strategy = this.strategies.get(type);
    if (!strategy) {
      throw new Error(`No strategy registered for notification type: ${type}`);
    }

    const payload = strategy.buildNotification(data);
    const recipients = await strategy.getRecipients(data);

    await this.dispatchNotifications(recipients, payload);
  }

  // Adding new notification type: Just create a new strategy class
  // No modification to this service needed!
}
```

#### Problem: Hardcoded Domain Rules

```typescript
// ❌ CURRENT: Rules are hardcoded, require modification to extend
// src/domain/story.rules.ts

export class StoryRules {
  static canPublish(story: IStory, userId: string): boolean {
    // Hardcoded rule
    return story.creatorId === userId && story.chapters.length > 0;
  }
}
```

### Recommended Refactoring

Use Rule Engine Pattern:

```typescript
// ✅ REFACTORED: Extensible Rule Engine

// src/domain/rules/rule.interface.ts
export interface IRule<TContext> {
  readonly name: string;
  readonly errorMessage: string;
  evaluate(context: TContext): boolean | Promise<boolean>;
}

// src/domain/rules/story/can-publish.rule.ts
export class HasChaptersRule implements IRule<StoryPublishContext> {
  readonly name = 'has-chapters';
  readonly errorMessage = 'Story must have at least one chapter to publish';

  evaluate(context: StoryPublishContext): boolean {
    return context.story.chapters.length > 0;
  }
}

export class IsOwnerOrEditorRule implements IRule<StoryPublishContext> {
  readonly name = 'is-owner-or-editor';
  readonly errorMessage = 'Only story owner or editors can publish';

  evaluate(context: StoryPublishContext): boolean {
    const { story, userId, userRole } = context;
    return story.creatorId === userId || userRole === 'editor';
  }
}

export class HasRequiredFieldsRule implements IRule<StoryPublishContext> {
  readonly name = 'has-required-fields';
  readonly errorMessage = 'Story must have title, description, and cover image';

  evaluate(context: StoryPublishContext): boolean {
    const { story } = context;
    return !!(story.title && story.description && story.coverImage);
  }
}

// src/domain/rules/rule-engine.ts
export class RuleEngine<TContext> {
  private rules: IRule<TContext>[] = [];

  addRule(rule: IRule<TContext>): this {
    this.rules.push(rule);
    return this;
  }

  async validate(context: TContext): Promise<RuleValidationResult> {
    const failures: string[] = [];

    for (const rule of this.rules) {
      const passed = await rule.evaluate(context);
      if (!passed) {
        failures.push(rule.errorMessage);
      }
    }

    return {
      isValid: failures.length === 0,
      errors: failures,
    };
  }
}

// Usage in service
const publishRuleEngine = new RuleEngine<StoryPublishContext>()
  .addRule(new HasChaptersRule())
  .addRule(new IsOwnerOrEditorRule())
  .addRule(new HasRequiredFieldsRule());

// Easy to add new rules without modifying existing code!
```

---

## 3. Liskov Substitution Principle (LSP)

> **"Subtypes must be substitutable for their base types."**

### Current Implementation

Your `BaseRepository` provides a good foundation:

```typescript
// src/utils/baseClass.ts
export class BaseRepository<TEntity, TDocument> {
  protected model: Model<TDocument>;

  async findById(id: string): Promise<TEntity | null> { }
  async findOne(query: FilterQuery<TDocument>): Promise<TEntity | null> { }
  async create(data: Partial<TEntity>): Promise<TEntity> { }
  async update(id: string, data: Partial<TEntity>): Promise<TEntity | null> { }
  async delete(id: string): Promise<boolean> { }
}
```

### Potential Violations

```typescript
// ❌ VIOLATION: Subclass changes expected behavior
export class StoryRepository extends BaseRepository<IStory, StoryDocument> {
  // This overrides base method but returns different structure
  async findById(id: string): Promise<IStory | null> {
    // Returns populated data instead of raw document
    return this.model.findById(id)
      .populate('creator')
      .populate('chapters')
      .lean();
  }
}

// Code expecting base behavior breaks:
const repo: BaseRepository<IStory, StoryDocument> = new StoryRepository();
const story = await repo.findById(id); // Expects raw, gets populated - LSP violation!
```

### Recommended Refactoring

```typescript
// ✅ REFACTORED: Separate methods for different behaviors

export class StoryRepository extends BaseRepository<IStory, StoryDocument> {
  // Base method remains unchanged (raw document)
  async findById(id: string): Promise<IStory | null> {
    return super.findById(id);
  }

  // New method for populated data
  async findByIdWithRelations(id: string): Promise<IStoryWithRelations | null> {
    return this.model.findById(id)
      .populate('creator')
      .populate('chapters')
      .lean();
  }

  // Use options pattern for flexibility
  async findByIdWithOptions(
    id: string,
    options?: { populate?: string[] }
  ): Promise<IStory | null> {
    let query = this.model.findById(id);

    if (options?.populate) {
      options.populate.forEach(field => {
        query = query.populate(field);
      });
    }

    return query.lean();
  }
}
```

### Generic Repository Interface

```typescript
// src/shared/interfaces/repository.interface.ts
export interface IRepository<TEntity, TId = string> {
  findById(id: TId): Promise<TEntity | null>;
  findOne(query: Partial<TEntity>): Promise<TEntity | null>;
  findMany(query: Partial<TEntity>): Promise<TEntity[]>;
  create(data: Omit<TEntity, 'id'>): Promise<TEntity>;
  update(id: TId, data: Partial<TEntity>): Promise<TEntity | null>;
  delete(id: TId): Promise<boolean>;
  exists(id: TId): Promise<boolean>;
}

// All repositories implement this interface consistently
export class StoryRepository
  extends BaseRepository<IStory, StoryDocument>
  implements IRepository<IStory> {
  // Guaranteed consistent behavior
}
```

---

## 4. Interface Segregation Principle (ISP)

> **"Clients should not be forced to depend on interfaces they don't use."**

### Current Violations

#### Problem: Large DTOs with Many Optional Fields

```typescript
// ❌ CURRENT: One large DTO for all update scenarios
// src/dto/story.dto.ts

const StoryUpdateDTO = z.object({
  title: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  coverImage: z.object({
    url: z.string(),
    publicId: z.string(),
  }).optional(),
  settings: z.object({
    allowComments: z.boolean(),
    allowBranching: z.boolean(),
    isPrivate: z.boolean(),
    collaboratorPermissions: z.object({/* ... */}),
  }).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  genres: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  // 15+ more optional fields...
});
```

### Recommended Refactoring

Split into focused DTOs:

```typescript
// ✅ REFACTORED: Segregated DTOs for specific operations

// src/features/story/dto/story-basic-info.dto.ts
export const UpdateStoryBasicInfoDTO = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500),
  genres: z.array(z.string()).max(5),
  tags: z.array(z.string()).max(10),
});

// src/features/story/dto/story-settings.dto.ts
export const UpdateStorySettingsDTO = z.object({
  allowComments: z.boolean(),
  allowBranching: z.boolean(),
  isPrivate: z.boolean(),
});

// src/features/story/dto/story-cover.dto.ts
export const UpdateStoryCoverDTO = z.object({
  coverImage: z.object({
    url: z.string().url(),
    publicId: z.string(),
  }),
});

// src/features/story/dto/story-collaborator-settings.dto.ts
export const UpdateCollaboratorPermissionsDTO = z.object({
  collaboratorPermissions: z.object({
    canEdit: z.boolean(),
    canPublish: z.boolean(),
    canInvite: z.boolean(),
    canDeleteChapters: z.boolean(),
  }),
});

// Routes use specific DTOs
router.patch('/stories/:id/basic-info',
  validateRequest(UpdateStoryBasicInfoDTO),
  storyController.updateBasicInfo
);

router.patch('/stories/:id/settings',
  validateRequest(UpdateStorySettingsDTO),
  storyController.updateSettings
);

router.patch('/stories/:id/cover',
  validateRequest(UpdateStoryCoverDTO),
  storyController.updateCover
);
```

#### Problem: Monolithic Service Interfaces

```typescript
// ❌ CURRENT: One interface with all methods
interface IStoryService {
  // CRUD
  createStory(): Promise<IStory>;
  updateStory(): Promise<IStory>;
  deleteStory(): Promise<void>;

  // Publishing
  publishStory(): Promise<IStory>;
  unpublishStory(): Promise<IStory>;

  // Queries
  getStoryBySlug(): Promise<IStory>;
  getUserStories(): Promise<IStory[]>;
  getPublicStories(): Promise<IStory[]>;

  // Media
  uploadCoverImage(): Promise<string>;

  // ... 20 more methods
}

// Controller depends on ALL methods even if it only uses 2
class PublicStoryController {
  constructor(private storyService: IStoryService) { }

  // Only uses getPublicStories and getStoryBySlug
  // But depends on entire IStoryService interface!
}
```

### Recommended Refactoring

```typescript
// ✅ REFACTORED: Segregated interfaces

// src/features/story/services/interfaces/story-reader.interface.ts
export interface IStoryReader {
  findById(id: string): Promise<IStory | null>;
  findBySlug(slug: string): Promise<IStory | null>;
  findMany(query: StoryQuery): Promise<PaginatedResult<IStory>>;
}

// src/features/story/services/interfaces/story-writer.interface.ts
export interface IStoryWriter {
  create(data: CreateStoryDTO): Promise<IStory>;
  update(id: string, data: UpdateStoryDTO): Promise<IStory>;
  delete(id: string): Promise<void>;
}

// src/features/story/services/interfaces/story-publisher.interface.ts
export interface IStoryPublisher {
  publish(storyId: string): Promise<IStory>;
  unpublish(storyId: string): Promise<IStory>;
  schedulePublish(storyId: string, date: Date): Promise<void>;
}

// src/features/story/services/interfaces/story-media-handler.interface.ts
export interface IStoryMediaHandler {
  uploadCover(storyId: string, file: Buffer): Promise<string>;
  deleteCover(storyId: string): Promise<void>;
}

// Controllers only depend on what they need
class PublicStoryController {
  constructor(
    @inject(TOKENS.StoryReader) private storyReader: IStoryReader
  ) { }

  async getStory(req: Request, res: Response) {
    const story = await this.storyReader.findBySlug(req.params.slug);
    return ApiResponse.success(res, story);
  }
}

class AdminStoryController {
  constructor(
    @inject(TOKENS.StoryReader) private storyReader: IStoryReader,
    @inject(TOKENS.StoryWriter) private storyWriter: IStoryWriter,
    @inject(TOKENS.StoryPublisher) private storyPublisher: IStoryPublisher
  ) { }
}
```

---

## 5. Dependency Inversion Principle (DIP)

> **"High-level modules should not depend on low-level modules. Both should depend on abstractions."**

### Current Violations

This is the **most significant issue** in the current codebase.

```typescript
// ❌ CURRENT: Direct instantiation everywhere
// src/features/story/services/story.service.ts

export class StoryService extends BaseModule {
  // Concrete dependencies - tightly coupled!
  private readonly storyRepo = new StoryRepository();
  private readonly chapterService = new ChapterService();
  private readonly chapterRepo = new ChapterRepository();
  private readonly storyCollaboratorService = new StoryCollaboratorService();
  private readonly notificationService = new NotificationService();

  // Problems:
  // 1. Cannot mock for testing
  // 2. Cannot swap implementations
  // 3. Circular dependency risk
  // 4. Tight coupling
}

// ❌ CURRENT: Controller instantiation
// src/features/story/controllers/story.controller.ts
export const storyController = new StoryController();
```

### Recommended Refactoring

#### Step 1: Define Interfaces

```typescript
// src/features/story/repositories/interfaces/story-repository.interface.ts
export interface IStoryRepository extends IRepository<IStory> {
  findBySlug(slug: string): Promise<IStory | null>;
  findByCreator(creatorId: string): Promise<IStory[]>;
  findPublished(options: PaginationOptions): Promise<PaginatedResult<IStory>>;
  updateStatus(id: string, status: StoryStatus): Promise<IStory | null>;
}

// src/features/story/services/interfaces/story-service.interface.ts
export interface IStoryCrudService {
  create(data: CreateStoryDTO): Promise<IStory>;
  update(id: string, data: UpdateStoryDTO): Promise<IStory>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<IStory>;
  findBySlug(slug: string): Promise<IStory>;
}

// src/features/chapter/services/interfaces/chapter-service.interface.ts
export interface IChapterService {
  create(storyId: string, data: CreateChapterDTO): Promise<IChapter>;
  findByStory(storyId: string): Promise<IChapter[]>;
  reorder(storyId: string, chapterIds: string[]): Promise<void>;
}
```

#### Step 2: Update Token Registry

```typescript
// src/container/tokens.ts
export const TOKENS = {
  // Repositories
  StoryRepository: Symbol.for('IStoryRepository'),
  ChapterRepository: Symbol.for('IChapterRepository'),
  UserRepository: Symbol.for('IUserRepository'),

  // Services - Segregated
  StoryCrudService: Symbol.for('IStoryCrudService'),
  StoryQueryService: Symbol.for('IStoryQueryService'),
  StoryPublishingService: Symbol.for('IStoryPublishingService'),
  StoryMediaService: Symbol.for('IStoryMediaService'),

  ChapterService: Symbol.for('IChapterService'),
  NotificationService: Symbol.for('INotificationService'),

  // Controllers
  StoryController: Symbol.for('StoryController'),

  // Shared
  CacheService: Symbol.for('ICacheService'),
  EmailService: Symbol.for('IEmailService'),
} as const;
```

#### Step 3: Implement with DI Decorators

```typescript
// src/features/story/repositories/story.repository.ts
import { injectable } from 'tsyringe';

@injectable()
export class StoryRepository
  extends BaseRepository<IStory, StoryDocument>
  implements IStoryRepository {

  constructor() {
    super(StoryModel);
  }

  async findBySlug(slug: string): Promise<IStory | null> {
    return this.model.findOne({ slug }).lean();
  }

  async findByCreator(creatorId: string): Promise<IStory[]> {
    return this.model.find({ creatorId }).lean();
  }

  async findPublished(options: PaginationOptions): Promise<PaginatedResult<IStory>> {
    // Implementation
  }
}
```

```typescript
// src/features/story/services/story-crud.service.ts
import { inject, injectable } from 'tsyringe';
import { TOKENS } from '@/container/tokens';

@injectable()
export class StoryCrudService implements IStoryCrudService {
  constructor(
    @inject(TOKENS.StoryRepository)
    private readonly storyRepository: IStoryRepository,

    @inject(TOKENS.ChapterService)
    private readonly chapterService: IChapterService,

    @inject(TOKENS.NotificationService)
    private readonly notificationService: INotificationService,
  ) {}

  async create(data: CreateStoryDTO): Promise<IStory> {
    return withTransaction('Creating story', async (session) => {
      const story = await this.storyRepository.create(data, { session });

      await this.notificationService.send('STORY_CREATED', {
        storyId: story.id,
        creatorId: data.creatorId,
      });

      return story;
    });
  }

  async update(id: string, data: UpdateStoryDTO): Promise<IStory> {
    const story = await this.storyRepository.update(id, data);
    if (!story) {
      throw new ApiError('Story not found', HttpStatus.NOT_FOUND);
    }
    return story;
  }

  // ... other methods
}
```

#### Step 4: Register in Container

```typescript
// src/container/index.ts
import { container } from 'tsyringe';
import { TOKENS } from './tokens';

// Repositories
container.register(TOKENS.StoryRepository, { useClass: StoryRepository });
container.register(TOKENS.ChapterRepository, { useClass: ChapterRepository });
container.register(TOKENS.UserRepository, { useClass: UserRepository });

// Services
container.register(TOKENS.StoryCrudService, { useClass: StoryCrudService });
container.register(TOKENS.StoryQueryService, { useClass: StoryQueryService });
container.register(TOKENS.StoryPublishingService, { useClass: StoryPublishingService });
container.register(TOKENS.ChapterService, { useClass: ChapterService });
container.register(TOKENS.NotificationService, { useClass: NotificationService });

// Controllers
container.register(TOKENS.StoryController, { useClass: StoryController });

export { container };
```

#### Step 5: Resolve Dependencies

```typescript
// src/features/story/routes/story.routes.ts
import { container } from '@/container';
import { TOKENS } from '@/container/tokens';

const storyController = container.resolve<StoryController>(TOKENS.StoryController);

router.post('/stories',
  authMiddleware,
  validateRequest(CreateStoryDTO),
  (req, res) => storyController.create(req, res)
);
```

### Testing with DI

```typescript
// src/features/story/services/__tests__/story-crud.service.test.ts
import { container } from 'tsyringe';
import { TOKENS } from '@/container/tokens';

describe('StoryCrudService', () => {
  let service: StoryCrudService;
  let mockStoryRepository: jest.Mocked<IStoryRepository>;
  let mockChapterService: jest.Mocked<IChapterService>;
  let mockNotificationService: jest.Mocked<INotificationService>;

  beforeEach(() => {
    // Create mocks
    mockStoryRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockChapterService = {
      findByStory: jest.fn(),
    } as any;

    mockNotificationService = {
      send: jest.fn(),
    } as any;

    // Register mocks in container
    container.registerInstance(TOKENS.StoryRepository, mockStoryRepository);
    container.registerInstance(TOKENS.ChapterService, mockChapterService);
    container.registerInstance(TOKENS.NotificationService, mockNotificationService);

    // Resolve service with mocked dependencies
    service = container.resolve(StoryCrudService);
  });

  afterEach(() => {
    container.clearInstances();
  });

  describe('create', () => {
    it('should create a story and send notification', async () => {
      const createData: CreateStoryDTO = {
        title: 'Test Story',
        description: 'A test story',
        creatorId: 'user-123',
      };

      const createdStory: IStory = {
        id: 'story-123',
        ...createData,
        status: 'draft',
        createdAt: new Date(),
      };

      mockStoryRepository.create.mockResolvedValue(createdStory);

      const result = await service.create(createData);

      expect(mockStoryRepository.create).toHaveBeenCalledWith(createData, expect.any(Object));
      expect(mockNotificationService.send).toHaveBeenCalledWith('STORY_CREATED', {
        storyId: 'story-123',
        creatorId: 'user-123',
      });
      expect(result).toEqual(createdStory);
    });
  });
});
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

1. **Define all interfaces**
   - [ ] Repository interfaces (`IStoryRepository`, `IChapterRepository`, etc.)
   - [ ] Service interfaces (segregated by responsibility)
   - [ ] Create `src/shared/interfaces/` directory

2. **Update token registry**
   - [ ] Add tokens for all interfaces
   - [ ] Use consistent naming convention

### Phase 2: Repository Layer (Week 2-3)

3. **Refactor repositories**
   - [ ] Implement interfaces in all repositories
   - [ ] Add `@injectable()` decorators
   - [ ] Register in container

4. **Update base repository**
   - [ ] Ensure LSP compliance
   - [ ] Add consistent error handling

### Phase 3: Service Layer (Week 3-5)

5. **Split monolithic services** (Start with `StoryService`)
   - [ ] `StoryCrudService`
   - [ ] `StoryQueryService`
   - [ ] `StoryPublishingService`
   - [ ] `StoryMediaService`

6. **Inject dependencies**
   - [ ] Replace `new` with `@inject()`
   - [ ] Add constructors with injected dependencies
   - [ ] Register services in container

### Phase 4: Controllers & Routes (Week 5-6)

7. **Update controllers**
   - [ ] Add `@injectable()` decorators
   - [ ] Inject required services
   - [ ] Register in container

8. **Update routes**
   - [ ] Resolve controllers from container
   - [ ] Remove direct instantiation

### Phase 5: DTOs & Domain Rules (Week 6-7)

9. **Segregate DTOs**
   - [ ] Split large DTOs into focused ones
   - [ ] Update route validations

10. **Implement Rule Engine**
    - [ ] Create rule interfaces
    - [ ] Refactor domain rules
    - [ ] Make rules extensible

### Phase 6: Testing & Cleanup (Week 7-8)

11. **Add unit tests**
    - [ ] Test services with mocked dependencies
    - [ ] Test repositories
    - [ ] Test domain rules

12. **Remove dead code**
    - [ ] Remove unused exports
    - [ ] Clean up old implementations

---

## Quick Reference Checklist

Use this checklist when creating new features or refactoring existing code:

### Creating a New Feature

- [ ] **Define interfaces first** (repository, service interfaces)
- [ ] **Keep services focused** (single responsibility)
- [ ] **Use constructor injection** (`@inject()` decorator)
- [ ] **Register in container** (tokens.ts + container/index.ts)
- [ ] **Create focused DTOs** (one DTO per operation type)
- [ ] **Write tests with mocks** (use DI for easy mocking)

### Code Review Checklist

- [ ] No `new ServiceName()` - use DI instead
- [ ] No `new RepositoryName()` - use DI instead
- [ ] Service has < 10 public methods (SRP)
- [ ] DTOs are focused (< 10 fields each)
- [ ] Interfaces defined for all dependencies
- [ ] Base class methods not overridden with different behavior (LSP)
- [ ] New notification/rule types don't modify existing files (OCP)

### Anti-Patterns to Avoid

```typescript
// ❌ Direct instantiation
private service = new SomeService();

// ❌ God service with 20+ methods
class EverythingService { /* 50 methods */ }

// ❌ Mega DTO
const UpdateEverythingDTO = z.object({ /* 30 optional fields */ });

// ❌ Modifying switch/if chains for new types
switch(type) {
  case 'A': /* ... */
  case 'B': /* ... */
  // Adding case 'C' modifies existing code
}

// ❌ Override that changes behavior
class Child extends Parent {
  findById() { /* returns different structure than parent */ }
}
```

### Patterns to Follow

```typescript
// ✅ Dependency injection
constructor(@inject(TOKENS.Service) private service: IService) {}

// ✅ Focused services
class StoryCreationService { /* 5 methods related to creation */ }

// ✅ Specific DTOs
const UpdateStoryTitleDTO = z.object({ title: z.string() });

// ✅ Strategy pattern for extensibility
interface INotificationStrategy { /* ... */ }
class NewTypeStrategy implements INotificationStrategy { /* ... */ }

// ✅ New methods instead of overrides
findByIdWithRelations() { /* new method, doesn't break parent contract */ }
```

---

## Resources

- [tsyringe Documentation](https://github.com/microsoft/tsyringe)
- [SOLID Principles in TypeScript](https://www.digitalocean.com/community/conceptual-articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Dependency Injection Patterns](https://martinfowler.com/articles/injection.html)

---

*Last Updated: January 2026*
*Version: 1.0*
