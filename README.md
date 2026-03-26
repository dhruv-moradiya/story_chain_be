# StoryChain Backend API

A high-performance, collaborative storytelling platform backend built with **Fastify**, **TypeScript**, and **MongoDB**. This project leverages a mature **Feature-Modular Layered Architecture** with a robust **Dependency Injection** system and a tiered **Redis caching strategy**.

---

## 1. Project Summary

**StoryChain** is designed to facilitate complex, multi-author narrative creation. It allows for non-linear storytelling through narrative branching, collaborative editing via an asynchronous Pull Request (PR) system, and real-time interaction through chapter autosaves.

### Tech Stack

- **Runtime**: Node.js 20+ (ESM)
- **Framework**: [Fastify v5](https://fastify.io/) (optimized for low overhead)
- **Database**: [MongoDB](https://www.mongodb.com/) (Document storage)
- **ODM**: [Mongoose v8](https://mongoosejs.com/)
- **Caching**: [Redis](https://redis.io/) (via `ioredis`)
- **DI Container**: [tsyringe](https://github.com/microsoft/tsyringe)
- **Validation**: [Zod](https://zod.dev/)
- **Auth**: [Clerk](https://clerk.com/)
- **Jobs**: [BullMQ](https://docs.bullmq.io/)

---

## 2. Folder Structure Explanation

The project is structured to scale by feature while maintaining a strict separation of technical concerns.

```text
/
├── dist/                # Compiled JavaScript output
├── docs/                # API documentation and OpenAPI schemas
├── logs/                # Application runtime logs (winston)
├── src/
│   ├── config/          # Technical configuration (Database, Redis, Env)
│   ├── constants/       # Global constants (HTTP statuses, Rate limits)
│   ├── container/       # Dependency Injection Brain (Tokens, Registry)
│   ├── dto/             # Data Transfer Objects (Interface contracts)
│   ├── features/        # Modular Feature Domains
│   │   └── [feature]/   # e.g., story, chapter, user
│   │       ├── controllers/
│   │       ├── services/
│   │       ├── repositories/
│   │       ├── routes/
│   │       └── pipelines/  # MongoDB Aggregation Builders
│   ├── infrastructure/  # Cross-cutting systems (Cache, Errors, Queue)
│   ├── jobs/            # BullMQ Workers and Job definitions
│   ├── middlewares/     # Fastify Hooks (Auth, RBAC, Validation)
│   ├── models/          # Shared Mongoose Schemas & Models
│   ├── routes/          # Central Route Registry
│   ├── schema/          # Zod schemas for runtime validaton
│   ├── shared/          # Base classes and Generic Pipelines
│   ├── types/           # Global type definitions
│   └── utils/           # Shared helpers (Logger, API Response)
└── fly.toml             # Deployment orchestration for Fly.io
```

---

## 3. Application Architecture

### 3.1 Architectural Pattern: Feature-Modular Layered

We use a **Layered Pattern** within **Feature Modules**. This ensures that domain-specific logic (e.g., Story logic) is encapsulated in its own directory, while maintaining a predictable execution flow from transport layer down to data layer.

### 3.2 Request Lifecycle

1.  **Transport**: Fastify receives request → executes global plugins (CORS, Helmet).
2.  **Rate Limiting**: Checks Redis-backed usage counters.
3.  **Validation**: Zod parses `params`, `query`, and `body` before the controller is reached.
4.  **Auth Middleware**: `validateAuth` verifies JWT via Clerk and attaches a cached `authUser` profile.
5.  **RBAC Middleware**: `loadStoryContext` fetches resource state and permissions.
6.  **Controller**: Resolves Service from DI container and calls methods.
7.  **Service**: Orchestrates business logic, checks cache, and interacts with repositories.
8.  **Repository**: Executes optimized MongoDB queries or Aggregations.
9.  **Response**: Results are serialized and wrapped in a standardized `ApiResponse` JSON structure.

---

## 4. Core Layers

### 4.1 Controllers

Controllers handle HTTP semantics. They extract inputs, call the appropriate service, and determine the status code.

- **Rules**: Zero business logic. They act only as orchestrators.
- **Injection**: Resolves all feature services through the `@inject` decorator.

### 4.2 Services

The Service layer contains the **Domain Core**.

- **Orchestration**: Manages the flow between multiple repositories.
- **Caching**: Utilizes the `CacheService` to implement read-through caching.
- **Transactions**: Handles atomicity for complex writes (e.g., adding a chapter and updating story stats).

### 4.3 Repositories

Repositories abstract the data layer.

- **Aggregations**: Use specialized "Pipeline Builders" for complex narrative joins.
- **Abstractions**: Hides Mongoose specific logic so Services remain pure business logic.

### 4.4 Dependency Injection

Managed via `tsyringe`.

- **Tokens**: Use `src/container/tokens.ts` for all identifiers to avoid circular imports.
- **Registry**: Centralized in `src/container/registry.ts`.
- **Lifecycle**: Most services are registered as `Lifecycle.Singleton`.

---

## 5. Type System

We employ a strict 4-tier typing system:

1.  **Mongoose Models**: Define the physical storage shape.
2.  **DTOs**: Define internal data passing interfaces (`src/dto/`).
3.  **Zod Schemas**: Used for runtime validation and type inference for HTTP I/O.
4.  **Response Types**: Specialized shapes for complex aggregated API responses.

---

## 6. Database Architecture

- **Primary Database**: MongoDB.
- **Modeling**: Mongoose schemas with strict validation.
- **Performance**:
  - **Indices**: Unique slugs, text search indices on titles, and compound indices for filtering.
  - **Projections**: Dedicated projection objects ensure we never fetch unneeded data from Mongo.

---

## 7. Redis & Caching

### 7.1 Caching Strategy

A Read-Through cache is implemented in the Service layer.

- **naming**: Consistent key generation via `CacheKeyBuilder`.
- **TTL**: Organized by volatility (e.g., Stories cached for 1hr, search results for 3m).
- **Invalidation**: Proactive invalidation triggered in CRUD services on data mutation.

### 7.2 Rate Limiting

Configured in `src/constants/rateLimits.ts`.

- **Backend**: Redis fixed-window.
- **Resolution**: Identity-based (UserID) with fallback to IP.
- **Limits**: Configurable per operation (e.g., `FAST_WRITE` for autosave, `CRITICAL` for publishing).

---

## 8. Background Jobs

Powered by **BullMQ** and Redis.

- **Jobs**: `EmailJob`, `ScheduledJob`.
- **Isolation**: Workers are defined in `src/jobs/` and process tasks asynchronously from the main request thread.

---

## 9. Error Handling

A unified system based on the `AppError` class.

- **Error Codes**: 100+ unique machine-readable codes (`AUTH_UNAUTHORIZED`, `STORY_NOT_FOUND`).
- **Global Handler**: Standardizes all errors (infrastructure, validation, or business) into a consistent JSON format.

---

## 🛠 10. Installation & Setup

### 1. Clone & Install

```bash
git clone <repository-url>
cd storychain-be
npm install
```

### 2. Environment Variables

Create a `.env` file based on `.env.example`:

```env
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://localhost:27017/storychain
REDIS_URL=redis://localhost:6379
CLERK_SECRET_KEY=your_key
CLOUDINARY_CLOUD_NAME=name
CLOUDINARY_API_KEY=key
CLOUDINARY_API_SECRET=secret
```

### 3. Running the Application

- **Development**: `npm run dev` (uses `tsx watch`)
- **Production Build**: `npm run build`
- **Start Production**: `npm start`

---

## 🧪 11. Scripts

- `npm run dev`: Starts the dev server with hot-reload.
- `npm run build`: Compiles TypeScript and resolves `@` path aliases.
- `npm run start`: Runs the compiled JavaScript from `dist/`.
- `npm run lint`: Runs ESLint for code quality checks.
- `npm run format`: Standardizes code style via Prettier.
- `npm run type-check`: Validates TypeScript types without emitting files.

---

## 🐳 12. Docker & Containerization

The project uses a **Multi-Stage Dockerfile** to minimize image size and maximize security.

- **Stage 1 (Builder)**: Uses `node:20-alpine` to compile TS and install all dev dependencies.
- **Stage 2 (Runner)**: Uses `node:20-alpine`, installs only production dependencies, and copies the `dist/` folder.

### 12.1 Local Development (Recommended)

Use `docker compose` to run the entire stack (App + MongoDB with Replica Set + Redis). This is the fastest way to get a local environment identical to the dependencies in production.

| Scenario                        | Command                                      |
| :------------------------------ | :------------------------------------------- |
| **Start everything (detached)** | `docker compose up -d`                       |
| **Start existing containers**   | `docker compose start`                       |
| **Start and show logs**         | `docker compose up`                          |
| **Rebuild & Restart**           | `docker compose up -d --build`               |
| **Stop everything**             | `docker compose down`                        |
| **View logs for app only**      | `docker compose logs -f app`                 |
| **Stop but keep volumes**       | `docker compose stop`                        |
| **Remove volumes (reset DB)**   | `docker compose down -v`                     |
| **Remove volumes (reset DB)**   | `docker volume rm story_chain_be_redis-data` |
| **Remove volumes (reset DB)**   | `docker volume rm story_chain_be_mongo-data` |

> [!IMPORTANT]
> The app is exposed at **`http://localhost:4000`** while running via Docker Compose.

### 12.2 Building Individual Images

If you only want to build or run the backend container without compose:

**Build Command**:

```bash
docker build -t story-chain-be .
```

**Run New Container**:
Ensure your `.env` file is present in the root directory:

```bash
docker run --name story-chain-be -p 4000:4000 --env-file .env story-chain-be
```

**Start Existing Container**:

```bash
docker start story-chain-be
```

### 12.3 Docker Maintenance

- **Clean up unused images**: `docker image prune -f`
- **Clean up all unused resources**: `docker system prune -a --volumes`
- **List running containers**: `docker ps`

---

## 📡 13. Deployment

**Fly.io Configuration**:

- **Setup**: Managed via `fly.toml`.
- **Region**: Defaults to `bom` (Mumbai).
- **Resources**: Configured for 1GB RAM / 1 Shared CPU.
- **Health Checks**: Configured to poll `/health` endpoint.

---

## 📈 14. Performance Considerations

- **Redis Caching**: Removes ~90% of DB load for authenticated read-heavy operations.
- **Mongoose MaxPool**: Increased to 50 connections to handle high concurrency.
- **Lean Reads**: All data retrieval uses `.lean()` to avoid Mongoose instance overhead.
- **Zero-Logic Middleware**: Auth and Context middlewares are highly optimized to fail fast.

---

## 🔐 15. Security

- **Authentication**: Mandatory Clerk JWT verification via `validateAuth`.
- **RBAC**: Multi-layered permission check (Platform level + Story level).
- **Input Sanitization**: Content is sanitized before storage (via builders/transformers).
- **Content Security**: `helmet` plugin applied to set secure HTTP headers.

---

## 🤝 16. Contributing

1.  **Branch Naming**: Use `feature/story-branch`, `bugfix/fix-issue`, or `refactor/api-logic`.
2.  **Commits**: Strictly follows **Conventional Commits** (enforced by `husky` and `commitlint`).
3.  **PR Process**: Ensure `npm run type-check` passes before submitting.

---

## 📄 17. License

This project is licensed under the **ISC License**.

---

_Maintained by the StoryChain Dev Team_
