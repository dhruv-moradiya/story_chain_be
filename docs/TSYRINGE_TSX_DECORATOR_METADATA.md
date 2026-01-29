# TSyringe with TSX: Decorator Metadata Issue

## The Error

```
Error: TypeInfo not known for "DatabaseService"
    at dependency-container.js:298:27
    at InternalDependencyContainer.construct
    ...
```

## Root Cause

### The Problem Chain

1. **TSyringe relies on TypeScript's `emitDecoratorMetadata`** to automatically determine what dependencies to inject into a class constructor.

2. **TSX uses esbuild under the hood** for fast TypeScript transpilation.

3. **esbuild does NOT support `emitDecoratorMetadata`** - it simply strips out decorator metadata during transpilation, even if the option is enabled in `tsconfig.json`.

### How Decorator Metadata Works

When `emitDecoratorMetadata` is enabled in `tsconfig.json`, the TypeScript compiler (tsc) emits additional metadata about:

- Parameter types in constructors
- Property types
- Method parameter and return types

This metadata is stored using the `Reflect.metadata` API from `reflect-metadata`.

**Example: What TypeScript compiler generates:**

```typescript
// Your code
@singleton()
class DatabaseService {
  constructor(private readonly config: ConfigService) {}
}

// What tsc emits (simplified)
@singleton()
@Reflect.metadata('design:paramtypes', [ConfigService])
class DatabaseService {
  constructor(private readonly config: ConfigService) {}
}
```

TSyringe reads `design:paramtypes` to know what to inject. But **esbuild/tsx doesn't emit this metadata**, so TSyringe sees an empty parameter list and throws "TypeInfo not known".

### Why TSX/esbuild Doesn't Support This

From the esbuild documentation:

> "This feature is not supported because it relies on TypeScript-specific behavior that is not part of the ECMAScript specification. It also has issues with circular dependencies and is generally considered a legacy feature."

esbuild prioritizes:

- Speed over feature completeness
- Standards compliance
- Avoiding complex TypeScript-specific transformations

## The Solution

### Use Explicit `@inject()` Decorators

Instead of relying on automatic type inference, explicitly tell TSyringe what to inject:

**Before (doesn't work with tsx):**

```typescript
import { singleton } from 'tsyringe';
import { ConfigService } from './config.service';

@singleton()
class DatabaseService {
  constructor(private readonly config: ConfigService) {}
}
```

**After (works with tsx):**

```typescript
import { inject, singleton } from 'tsyringe';
import { ConfigService } from './config.service';

@singleton()
class DatabaseService {
  constructor(@inject(ConfigService) private readonly config: ConfigService) {}
}
```

### Why This Works

The `@inject()` decorator explicitly registers the injection token at runtime, bypassing the need for `emitDecoratorMetadata`. TSyringe stores this information directly rather than trying to read it from reflection metadata.

## Additional Requirements

### 1. Import `reflect-metadata` First

`reflect-metadata` must be imported at the very top of your entry file, before any other imports:

```typescript
// server.ts
import 'reflect-metadata'; // MUST be first!
import './config/config.service';
import './config/database.service';
// ... other imports
```

### 2. Side-Effect Imports for Services

Classes decorated with `@singleton()` or `@injectable()` must be imported (even as side effects) before calling `container.resolve()`:

```typescript
import 'reflect-metadata';
import './config/config.service'; // Side-effect import - runs the decorator
import './config/database.service'; // Side-effect import - runs the decorator

import { container } from 'tsyringe';
import { DatabaseService } from './config/database.service';

// Now this works because the decorators have already run
const db = container.resolve(DatabaseService);
```

### 3. tsconfig.json Settings

Even though esbuild doesn't use these, keep them for IDE support and if you ever switch to tsc:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Alternative Solutions

### Option 1: Use ts-node Instead of tsx

`ts-node` uses the TypeScript compiler and fully supports `emitDecoratorMetadata`:

```json
{
  "scripts": {
    "dev": "cross-env NODE_ENV=development ts-node --transpile-only src/server.ts"
  }
}
```

**Trade-off:** Slower startup time compared to tsx.

### Option 2: Use Token-Based Injection

Use string or symbol tokens instead of class references:

```typescript
// tokens.ts
export const TOKENS = {
  ConfigService: Symbol('ConfigService'),
  DatabaseService: Symbol('DatabaseService'),
};

// config.service.ts
@singleton()
@registry([{ token: TOKENS.ConfigService, useClass: ConfigService }])
class ConfigService {}

// database.service.ts
@singleton()
class DatabaseService {
  constructor(@inject(TOKENS.ConfigService) private config: ConfigService) {}
}
```

### Option 3: Manual Registration

Register classes manually in a central location:

```typescript
// container.ts
import 'reflect-metadata';
import { container } from 'tsyringe';
import { ConfigService } from './config/config.service';
import { DatabaseService } from './config/database.service';

container.registerSingleton(ConfigService);
container.registerSingleton(DatabaseService);

export { container };
```

## Best Practices for TSyringe + TSX

1. **Always use `@inject()` for constructor parameters** - Don't rely on automatic type inference.

2. **Import `reflect-metadata` first** - Before any other imports in your entry file.

3. **Use side-effect imports** - Import service files before resolving them.

4. **Keep services in a predictable location** - Makes it easier to manage imports.

5. **Consider a container setup file** - Centralize all registrations in one place:

```typescript
// src/container.ts
import 'reflect-metadata';
import { container } from 'tsyringe';

// Import all services (runs their decorators)
import './config/config.service';
import './config/database.service';
// ... other services

export { container };
```

Then in your entry file:

```typescript
// server.ts
import { container } from './container';
import { DatabaseService } from './config/database.service';

const db = container.resolve(DatabaseService);
```

## Summary

| Transpiler  | `emitDecoratorMetadata` Support | Solution                     |
| ----------- | ------------------------------- | ---------------------------- |
| tsc         | Yes                             | Works automatically          |
| ts-node     | Yes                             | Works automatically          |
| tsx/esbuild | No                              | Use `@inject()` explicitly   |
| swc         | Partial (opt-in)                | Configure or use `@inject()` |

The safest approach is to **always use explicit `@inject()` decorators** - this works regardless of which transpiler you use and makes dependencies explicit in your code.
