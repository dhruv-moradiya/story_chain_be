# Project Skills & Patterns

This document defines the "skills" and patterns required to work effectively on the **StoryChain Backend**.

## 1. 🏗️ Architecture Design

We follow a **Modular Feature-Based Architecture**. Code is organized by domain features rather than technical layers.

### Directory Structure

```
src/features/{featureName}/
├── controllers/    # Request handlers (HTTP layer)
├── services/       # Business logic (Focused, Single Responsibility)
├── repositories/   # Database access (Mongoose wrappers)
├── routes/         # Route definitions
├── types/          # Feature-specific interfaces/enums
├── schemas/        # Zod validation schemas
├── pipelines/      # MongoDB Aggregation Builders
└── dto/            # Data Transfer Objects
```

---

## 2. 💉 Dependency Injection (DI)

We use **tsyringe** for dependency injection. This describes how to create and wire up services.

### Skill: Create a New Service

1.  **Define Interface**: Create `I{Name}Service` in `services/interfaces/`.
2.  **Implement Service**:
    ```typescript
    @singleton()
    export class MyService extends BaseModule implements IMyService {
      constructor(@inject(TOKENS.OtherService) private readonly otherService: OtherService) {
        super();
      }
    }
    ```
3.  **Define Token**: Add a `Symbol` in `src/container/tokens.ts`.
4.  **Register**: Bind the class to the token in `src/container/registry.ts`.
    ```typescript
    container.register(TOKENS.MyService, { useClass: MyService });
    ```

---

## 3. 🧩 Focused Service Pattern

**Anti-Pattern**: Monolithic Services (e.g., `StoryService` handling detailed CRUD, Media, and Publishing).
**Pattern**: Break down into specific domains.

- `FeatureCrudService`: Basic Create/Update/Delete.
- `FeatureQueryService`: Read operations, complex listings.
- `FeatureMediaService`: Handling file uploads/media.
- `FeatureLifecycleService`: Managing state transitions/relationships.

---

## 4. 🛡️ Error Handling & Response

### Skill: Handling Requests

Always use `catchAsync` in controllers and extends `BaseModule`.

```typescript
export class MyController extends BaseModule {
  myMethod = catchAsync(async (req, reply) => {
    // Logic...
    // Success:
    return reply.code(200).send(new ApiResponse(true, 'Success', data));

    // Error:
    this.throwBadRequest('Invalid input'); // from BaseModule
    this.throwNotFoundError('Resource not found');
  });
}
```

---

## 5. 🔐 Security & RBAC

### Skill: Securing Routes

Use `loadStoryContextBySlug` middleware followed by `StoryRoleGuards`.

```typescript
// src/features/story/routes/story.routes.ts
fastify.post(
  '/endpoint',
  {
    preHandler: [
      validateAuth, // 1. Check Authentication
      loadStoryContextBySlug, // 2. Load context & role
      StoryRoleGuards.canEditSettings, // 3. Check permission
    ],
  },
  controller.handler
);
```

### Roles

- `OWNER`: Full access.
- `CO_AUTHOR`: Edit & Publish.
- `CONTRIBUTOR`: Write chapters.
- `MODERATOR`: Approve/Reject PRs.

---

## 6. 📊 Database & Pipelines

### Skill: Aggregation Pipelines

Use the **Builder Pattern** for complex MongoDB aggregations. Do not write raw pipeline arrays in services.

```typescript
// pipelines/storyPipeline.builder.ts
class StoryPipelineBuilder {
  isPublished() {
    this.pipeline.push({ $match: { status: 'published' } });
    return this;
  }
  build() {
    return this.pipeline;
  }
}

// Usage in Service
const pipeline = new StoryPipelineBuilder().isPublished().build();
```

---

## 7. 📝 Developing a New Feature (Checklist)

1.  [ ] Define Mongoose Model (`src/models/`)
2.  [ ] Define Zod Schemas (`src/schema/`) and DTOs (`src/dto/`)
3.  [ ] Create `Repository` extending `BaseRepository`.
4.  [ ] Create Focused `Services` (Crud, Query, etc.).
5.  [ ] Register Tokens & Services in DI Container.
6.  [ ] Create `Controller` extending `BaseModule`.
7.  [ ] Define Routes and Register in `src/server.ts` or parent route.
8.  [ ] Verify RBAC and Validation.
