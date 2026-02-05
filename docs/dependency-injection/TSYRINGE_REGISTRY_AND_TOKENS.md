# TSyringe: @registry Decorator and Symbol Tokens

## What is `@registry`?

The `@registry` decorator is used to register dependencies with tsyringe's dependency injection container at class definition time. It tells the container "when someone asks for this token, give them this class."

### Basic Syntax

```typescript
@registry([
  { token: TOKENS.MyService, useClass: MyService }
])
class MyService {}
```

### What `@registry` Does

1. **Registers the class with the container** - When the decorated class is loaded, it automatically registers itself
2. **Maps tokens to implementations** - Associates a token (identifier) with a concrete class
3. **Runs at import time** - Registration happens when the file is imported, before any `resolve()` calls

### Registry Options

```typescript
@registry([
  // Register a class
  { token: TOKENS.MyService, useClass: MyService },

  // Register a factory function
  { token: TOKENS.Config, useFactory: () => loadConfig() },

  // Register a constant value
  { token: TOKENS.ApiUrl, useValue: 'https://api.example.com' },
])
class MyService {}
```

## Why Use Symbol Tokens Instead of Strings?

### The Problem with Strings

```typescript
// Using strings as tokens
container.register('ConfigService', { useClass: ConfigService });
container.register('ConfigService', { useClass: AnotherConfigService }); // Oops! Overwrites!

// Easy to make typos
container.resolve('ConfigServic'); // Runtime error - typo not caught!
```

**Issues:**
1. **No compile-time checking** - Typos become runtime errors
2. **Name collisions** - Two different modules might use the same string
3. **Refactoring is dangerous** - Renaming requires find-and-replace across codebase
4. **No IDE autocomplete** - You're typing blind

### The Solution: Symbols

```typescript
// tokens.ts
export const TOKENS = {
  ConfigService: Symbol('ConfigService'),
  DatabaseService: Symbol('DatabaseService'),
};
```

**Every `Symbol()` call creates a globally unique value:**

```typescript
Symbol('ConfigService') === Symbol('ConfigService'); // false! Each is unique
```

### Benefits of Symbol Tokens

#### 1. Guaranteed Uniqueness

```typescript
// Even with the same description, symbols are unique
const token1 = Symbol('Service');
const token2 = Symbol('Service');

console.log(token1 === token2); // false

// No accidental overwrites possible
container.register(TOKENS.ConfigService, { useClass: ConfigService });
container.register(TOKENS.ConfigService, { useClass: Other }); // Intentional override
```

#### 2. Compile-Time Type Safety

```typescript
// With symbols in a TOKENS object, TypeScript catches errors
container.resolve(TOKENS.ConfigServic); // TS Error: Property 'ConfigServic' does not exist

// IDE autocomplete works
container.resolve(TOKENS.C); // Shows: ConfigService, etc.
```

#### 3. Refactoring Support

```typescript
// Rename the property, and all usages update automatically
export const TOKENS = {
  AppConfigService: Symbol('ConfigService'), // Renamed from ConfigService
};

// All resolve() calls using TOKENS.ConfigService will show errors
// IDE can rename all usages at once
```

#### 4. No String Collision Across Modules

```typescript
// module-a/tokens.ts
export const TOKENS_A = {
  Logger: Symbol('Logger'), // Unique to module A
};

// module-b/tokens.ts
export const TOKENS_B = {
  Logger: Symbol('Logger'), // Unique to module B, different from A
};

// These are completely different tokens - no collision
container.register(TOKENS_A.Logger, { useClass: FileLogger });
container.register(TOKENS_B.Logger, { useClass: ConsoleLogger });
```

## Comparison Table

| Aspect | String Tokens | Symbol Tokens |
|--------|--------------|---------------|
| Uniqueness | Not guaranteed | Globally unique |
| Typo detection | Runtime error | Compile-time error |
| IDE autocomplete | No | Yes |
| Refactoring | Manual find/replace | Automatic |
| Cross-module safety | Collisions possible | No collisions |
| Debugging | Shows string value | Shows Symbol(description) |

## Best Practices

### 1. Centralize Tokens

Keep all tokens in one file for easy management:

```typescript
// src/config/tokens.ts
export const TOKENS = {
  // Config
  ConfigService: Symbol('ConfigService'),

  // Database
  DatabaseService: Symbol('DatabaseService'),

  // Repositories
  UserRepository: Symbol('UserRepository'),
  StoryRepository: Symbol('StoryRepository'),

  // Services
  AuthService: Symbol('AuthService'),
  EmailService: Symbol('EmailService'),
};
```

### 2. Use Descriptive Symbol Names

The string passed to `Symbol()` is just a description for debugging:

```typescript
// Good - descriptive
Symbol('ConfigService')     // Shows as Symbol(ConfigService) in debugger

// Bad - not helpful
Symbol('cs')                // Shows as Symbol(cs) - unclear
```

### 3. Combine with Type Annotations

Use type annotations for better type safety when resolving:

```typescript
import type { DatabaseService } from './database.service';

// Type-safe resolution
const db = container.resolve<DatabaseService>(TOKENS.DatabaseService);
// db is typed as DatabaseService
```

### 4. Group Related Tokens

For larger applications, consider grouping tokens:

```typescript
export const TOKENS = {
  Services: {
    Config: Symbol('ConfigService'),
    Database: Symbol('DatabaseService'),
    Auth: Symbol('AuthService'),
  },
  Repositories: {
    User: Symbol('UserRepository'),
    Story: Symbol('StoryRepository'),
  },
  External: {
    Redis: Symbol('RedisClient'),
    Cloudinary: Symbol('CloudinaryClient'),
  },
};

// Usage
container.resolve(TOKENS.Services.Config);
container.resolve(TOKENS.Repositories.User);
```

## Complete Example

```typescript
// tokens.ts
export const TOKENS = {
  ConfigService: Symbol('ConfigService'),
  DatabaseService: Symbol('DatabaseService'),
};

// config.service.ts
import { registry, singleton } from 'tsyringe';
import { TOKENS } from './tokens';

@singleton()
@registry([{ token: TOKENS.ConfigService, useClass: ConfigService }])
class ConfigService {
  get mongoUri(): string {
    return process.env.MONGODB_URI!;
  }
}

export { ConfigService };

// database.service.ts
import { inject, registry, singleton } from 'tsyringe';
import { TOKENS } from './tokens';
import { ConfigService } from './config.service';

@singleton()
@registry([{ token: TOKENS.DatabaseService, useClass: DatabaseService }])
class DatabaseService {
  constructor(@inject(TOKENS.ConfigService) private config: ConfigService) {}

  async connect(): Promise<void> {
    await mongoose.connect(this.config.mongoUri);
  }
}

export { DatabaseService };

// server.ts
import 'reflect-metadata';
import './config/config.service';
import './config/database.service';
import { container } from 'tsyringe';
import { TOKENS } from './config/tokens';
import type { DatabaseService } from './config/database.service';

const db = container.resolve<DatabaseService>(TOKENS.DatabaseService);
await db.connect();
```

## When to Use What

| Use Case | Recommendation |
|----------|----------------|
| Small project, few services | Class references with `@inject(ClassName)` |
| Medium project | Symbol tokens in centralized file |
| Large project / monorepo | Grouped symbol tokens by domain |
| Library / shared code | Always use symbols to avoid collisions |
| Testing / mocking | Symbols make swapping implementations easy |

## Summary

- **`@registry`** registers classes with the DI container at import time
- **Symbol tokens** provide unique, type-safe identifiers for dependencies
- **Symbols > Strings** because of: uniqueness, type safety, IDE support, and refactoring
- **Centralize tokens** in a single file for maintainability
- **Use type annotations** with `container.resolve<T>()` for full type safety
