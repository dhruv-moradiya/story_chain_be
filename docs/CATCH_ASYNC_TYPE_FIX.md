# catchAsync Type Fix Documentation

## The Problem

The original `catchAsync` utility used the loose `Function` type:

```typescript
export const catchAsync = (fn: Function) => {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await fn(req, reply);
    } catch (error) {
      reply.send(error);
    }
  };
};
```

### Issue 1: Loose `Function` Type

The `Function` type accepts any function-like value without type checking. This provides no type safety for:
- Parameter types
- Return types
- Number of arguments

**ESLint Warning:**
> The `Function` type accepts any function-like value. Prefer explicitly defining any function parameters and return type.

### Issue 2: Generic Route Types Lost

After the initial fix with a strict `AsyncHandler` type, a new error appeared:

```
Argument of type '(request: FastifyRequest<{ Params: TGetUserByIdSchema; }>, reply: FastifyReply) => Promise<never>'
is not assignable to parameter of type 'AsyncHandler'.
  Types of parameters 'request' and 'req' are incompatible.
    Type 'FastifyRequest<RouteGenericInterface, ...>' is not assignable to
    type 'FastifyRequest<{ Params: { username: string; }; }, ...>'.
      Types of property 'params' are incompatible.
        Type 'unknown' is not assignable to type '{ username: string; }'.
```

**Root Cause:** Fastify uses generics (`RouteGenericInterface`) to type route-specific data like `Params`, `Body`, `Query`, etc. A non-generic `AsyncHandler` type couldn't preserve these specific types.

### Issue 3: Route Handler Type Mismatch

Even with generics, another error occurred:

```
Argument of type '(req: FastifyRequest<{ Params: TGetUserByIdSchema; }>, ...) => Promise<...>'
is not assignable to parameter of type 'RouteHandlerMethod<...>'.
```

**Root Cause:** Fastify route methods expect `RouteHandlerMethod` as the handler type. When `catchAsync` returned a function with a specific generic type, it wasn't compatible with what Fastify expected.

## The Solution

```typescript
import { FastifyReply, FastifyRequest, RouteGenericInterface, RouteHandlerMethod } from 'fastify';

type AsyncHandler<T extends RouteGenericInterface = RouteGenericInterface> = (
  req: FastifyRequest<T>,
  reply: FastifyReply
) => Promise<unknown>;

export const catchAsync = <T extends RouteGenericInterface = RouteGenericInterface>(
  fn: AsyncHandler<T>
): RouteHandlerMethod => {
  return async (req, reply) => {
    try {
      await fn(req as FastifyRequest<T>, reply);
    } catch (error) {
      reply.send(error);
    }
  };
};
```

### Key Changes Explained

1. **Generic `AsyncHandler` Type**
   ```typescript
   type AsyncHandler<T extends RouteGenericInterface = RouteGenericInterface>
   ```
   - Uses a generic `T` that extends `RouteGenericInterface`
   - Allows specifying route-specific types (Params, Body, Query, etc.)
   - Defaults to `RouteGenericInterface` when no specific type is provided

2. **Generic `catchAsync` Function**
   ```typescript
   export const catchAsync = <T extends RouteGenericInterface = RouteGenericInterface>(
     fn: AsyncHandler<T>
   ): RouteHandlerMethod
   ```
   - The function itself is generic, inferring `T` from the passed handler
   - Returns `RouteHandlerMethod` which is what Fastify expects

3. **Type Assertion Inside**
   ```typescript
   await fn(req as FastifyRequest<T>, reply);
   ```
   - Casts `req` to the specific `FastifyRequest<T>` type
   - Safe because the handler defines what type it expects

4. **Return Type `Promise<unknown>`**
   ```typescript
   ) => Promise<unknown>;
   ```
   - More flexible than `Promise<void>`
   - Allows handlers that return values (redirects, etc.)

## Usage Example

```typescript
// In controller
getUserById = catchAsync(
  async (request: FastifyRequest<{ Params: TGetUserByIdSchema }>, reply: FastifyReply) => {
    const { userId } = request.params; // Fully typed!
    // ...
  }
);

// In routes - works without type errors
fastify.get(
  '/user/:userId',
  { schema: { params: zodToJsonSchema(GetUserByIdSchema) } },
  userController.getUserById  // No type error
);
```

## Why Not Just Remove catchAsync?

Fastify v4+ automatically handles async errors, so `catchAsync` is technically not required. However, keeping it provides:

1. **Consistent error handling pattern** across all controllers
2. **Centralized place** to add logging or error transformation
3. **Explicit intent** that the handler is async and errors are caught

## Alternative: Remove catchAsync Entirely

If you prefer, you can remove `catchAsync` and rely on Fastify's built-in async error handling:

```typescript
// Before
getUserById = catchAsync(async (request, reply) => { ... });

// After
getUserById = async (request: FastifyRequest<{ Params: TGetUserByIdSchema }>, reply: FastifyReply) => {
  // Fastify handles errors automatically
};
```

Then configure a global error handler in your Fastify setup to handle all errors consistently.
