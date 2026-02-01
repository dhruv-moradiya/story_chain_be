# StoryChain Backend

A collaborative storytelling platform backend built with **Fastify**, **TypeScript**, **MongoDB**, and **tsyringe** for dependency injection.

## 🏗️ Architecture Overview

This project follows a **modular, feature-based architecture** with clear separation of concerns:

```
src/
├── config/                 # Configuration services (database, redis, etc.)
├── container/              # Dependency injection setup (tokens, registry)
├── constants/              # HTTP status codes, error messages
├── domain/                 # Business rules and domain logic
├── dto/                    # Data Transfer Objects
├── features/               # Feature modules (see below)
├── middlewares/            # Auth, RBAC, validation middlewares
├── models/                 # Mongoose models
├── schema/                 # Zod validation schemas
├── types/                  # TypeScript type definitions
└── utils/                  # Shared utilities
```

### Feature Module Structure

Each feature follows the same pattern:

```
features/{feature}/
├── controllers/            # HTTP request handlers
├── services/               # Business logic (focused services)
├── repositories/           # Data access layer
├── routes/                 # Route definitions
├── types/                  # Feature-specific types
├── validators/             # Feature-specific validation
└── pipelines/              # MongoDB aggregation pipelines
```

---

## 🎯 Service Architecture Pattern

### Focused Services Design

We use **focused, single-responsibility services** instead of monolithic ones for better maintainability and testability.

#### Story Feature Services

| Service                  | Responsibility                             |
| ------------------------ | ------------------------------------------ |
| `StoryCrudService`       | Create, update settings, delete stories    |
| `StoryQueryService`      | Get stories by ID/slug, list, search, tree |
| `StoryMediaService`      | Cover image, card image uploads            |
| `StoryPublishingService` | Publish/unpublish stories                  |

#### Story Collaborator Feature Services

| Service                         | Responsibility                      |
| ------------------------------- | ----------------------------------- |
| `CollaboratorQueryService`      | Get collaborators, check user roles |
| `CollaboratorInvitationService` | Create invitations, accept/decline  |
| `CollaboratorLifecycleService`  | Create/remove collaborators         |

---

## 📁 Features

### Core Features

| Feature             | Description                                        |
| ------------------- | -------------------------------------------------- |
| `user`              | User management, Clerk webhook integration         |
| `story`             | Story CRUD, publishing, media, chapter management  |
| `storyCollaborator` | Invitation system, role management                 |
| `chapter`           | Chapter creation, tree structure                   |
| `chapterAutoSave`   | Real-time chapter auto-saving                      |
| `chapterVersion`    | Version control for chapters                       |
| `notification`      | In-app notification system                         |
| `pullRequest`       | PR system for collaborative editing                |
| `platformRole`      | Platform-wide role management (Admin, Super Admin) |

---

## 🔐 Role-Based Access Control (RBAC)

### Platform Roles

- `SUPER_ADMIN` - Full platform access
- `ADMIN` - Administrative access
- `USER` - Standard user

### Story Collaborator Roles

| Role          | Permissions                                      |
| ------------- | ------------------------------------------------ |
| `OWNER`       | Full control, delete story, remove collaborators |
| `CO_AUTHOR`   | Write chapters, approve PRs, moderate            |
| `MODERATOR`   | Approve/reject PRs, moderate comments            |
| `REVIEWER`    | Review PRs (can comment, cannot approve)         |
| `CONTRIBUTOR` | Write chapters directly                          |

---

## 🛠️ Dependency Injection

We use **tsyringe** for DI. All services are registered in `src/container/registry.ts`:

```typescript
// Tokens are symbols defined in src/container/tokens.ts
container.register(TOKENS.StoryCrudService, { useClass: StoryCrudService });
container.register(TOKENS.StoryQueryService, { useClass: StoryQueryService });
```

### Controller Injection Example

```typescript
@singleton()
export class StoryController extends BaseModule {
  constructor(
    @inject(TOKENS.StoryCrudService)
    private readonly storyCrudService: StoryCrudService,
    @inject(TOKENS.StoryQueryService)
    private readonly storyQueryService: StoryQueryService
  ) {
    super();
  }
}
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB
- Redis (optional, for caching)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

### Environment Variables

```env
DATABASE_URL=mongodb://localhost:27017/storychain
REDIS_URL=redis://localhost:6379
CLERK_SECRET_KEY=your_clerk_secret
PORT=3000
```

---

## 📚 API Routes

### Story Routes (`/api/stories`)

| Method | Endpoint                  | Description                   |
| ------ | ------------------------- | ----------------------------- |
| POST   | `/`                       | Create new story              |
| GET    | `/`                       | List all stories (Admin)      |
| GET    | `/new`                    | Get new stories (public feed) |
| GET    | `/my`                     | Get user's stories            |
| GET    | `/draft`                  | Get user's draft stories      |
| GET    | `/search`                 | Search stories by title       |
| GET    | `/slug/:slug`             | Get story by slug             |
| POST   | `/slug/:slug/publish`     | Publish story                 |
| POST   | `/slug/:slug/settings`    | Update story settings         |
| GET    | `/slug/:slug/tree`        | Get chapter tree              |
| GET    | `/slug/:slug/overview`    | Get story overview            |
| PATCH  | `/slug/:slug/cover-image` | Update cover image            |
| PATCH  | `/slug/:slug/card-image`  | Update card image             |
| POST   | `/slug/:slug/chapters`    | Add chapter to story          |

### Story Collaborator Routes (within Story routes)

| Method | Endpoint                                       | Description             |
| ------ | ---------------------------------------------- | ----------------------- |
| GET    | `/slug/:slug/collaborators`                    | Get story collaborators |
| POST   | `/slug/:slug/collaborators`                    | Create invitation       |
| POST   | `/slug/:slug/collaborators/accept-invitation`  | Accept invitation       |
| POST   | `/slug/:slug/collaborators/decline-invitation` | Decline invitation      |

---

## 🧪 Testing

```bash
# Run tests
npm test

# Type check
npm run type-check
# or
npx tsc --noEmit --skipLibCheck
```

---

## 📝 Code Style

- **Controllers**: Handle HTTP requests, delegate to services
- **Services**: Contain business logic, use repositories
- **Repositories**: Data access, MongoDB operations
- **DTOs**: Input validation types
- **Schemas**: Zod validation schemas

### Base Classes

All services and controllers extend `BaseModule` which provides:

- `logInfo()`, `logError()`, `logWarn()` - Logging
- `throwNotFoundError()`, `throwForbiddenError()`, etc. - Error handling

---

## 🔧 Development Notes

### Adding a New Feature

1. Create feature folder: `src/features/{feature}/`
2. Create services with single responsibility
3. Create repository for data access
4. Create controller for HTTP handlers
5. Register tokens in `src/container/tokens.ts`
6. Register services in `src/container/registry.ts`
7. Add routes in feature's `routes/` folder

### Service Naming Convention

- `{Feature}CrudService` - Create, Update, Delete operations
- `{Feature}QueryService` - Read/query operations
- `{Feature}MediaService` - File/media operations
- `{Feature}PublishingService` - Publishing workflows
- `{Feature}LifecycleService` - Create/remove entity lifecycle

---

## 📄 License

Private - All rights reserved.
