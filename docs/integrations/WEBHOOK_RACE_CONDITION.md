# Handling Clerk Webhook Race Conditions

## The Problem

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CURRENT SIGNUP FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

    FRONTEND                    CLERK                     BACKEND
        │                         │                          │
        │  1. Create Account      │                          │
        ├────────────────────────►│                          │
        │                         │                          │
        │  2. Success Response    │  3. Send Webhook         │
        │◄────────────────────────┤─────────────────────────►│
        │                         │                          │
        │  4. Redirect to Home    │                          │ 5. Save User
        │  5. Call GET /me        │                          │    to DB
        │─────────────────────────┼─────────────────────────►│
        │                         │                          │
        │                    ⚠️ RACE CONDITION ⚠️              │
        │         /me arrives BEFORE webhook is processed    │
        │                         │                          │
        │  6. 404 User Not Found  │                          │
        │◄────────────────────────┼──────────────────────────┤
        │                         │                          │
```

### Failure Scenarios

| Scenario              | Cause                                 | Result                               |
| --------------------- | ------------------------------------- | ------------------------------------ |
| **Race Condition**    | `/me` called before webhook processed | 404 User Not Found                   |
| **Webhook Failure**   | Network issue, server down            | User never created in DB             |
| **DB Write Failure**  | MongoDB connection issue              | Webhook received but user not saved  |
| **Webhook Not Sent**  | Clerk misconfiguration                | User exists in Clerk, not in your DB |
| **Duplicate Webhook** | Clerk retry mechanism                 | Duplicate user error                 |

---

## Solution Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RECOMMENDED FLOW                                      │
└─────────────────────────────────────────────────────────────────────────────┘

    FRONTEND                    CLERK                     BACKEND
        │                         │                          │
        │  1. Create Account      │                          │
        ├────────────────────────►│                          │
        │                         │                          │
        │  2. Success Response    │  3. Send Webhook         │
        │◄────────────────────────┤─────────────────────────►│
        │                         │                          │
        │  4. Redirect to Home    │                          │ 5. Save User
        │  5. Call GET /me        │                          │    to DB
        │─────────────────────────┼─────────────────────────►│
        │                         │                          │
        │                    USER NOT FOUND?                 │
        │                         │                          │
        │                         │  6. Fetch from Clerk API │
        │                         │◄─────────────────────────┤
        │                         │                          │
        │                         │  7. Return User Data     │
        │                         ├─────────────────────────►│
        │                         │                          │
        │                         │                          │ 8. Create User
        │                         │                          │    (Just-in-Time)
        │  9. Return User         │                          │
        │◄────────────────────────┼──────────────────────────┤
        │                         │                          │
```

---

## Solution 1: Just-In-Time (JIT) User Creation

**The most robust solution** - Create user on-demand if webhook hasn't arrived yet.

### Backend Implementation

#### 1. Install Clerk Backend SDK

```bash
npm install @clerk/backend
```

#### 2. Create Clerk Client Utility

```typescript
// src/utils/clerk.client.ts
import { createClerkClient } from '@clerk/backend';
import { env } from '../config/env';

export const clerkClient = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY,
});

export async function fetchClerkUser(clerkId: string) {
  try {
    const user = await clerkClient.users.getUser(clerkId);
    return {
      clerkId: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      username: user.username || user.firstName || `user_${user.id.slice(-8)}`,
      avatarUrl: user.imageUrl,
    };
  } catch (error) {
    console.error('Failed to fetch user from Clerk:', error);
    return null;
  }
}
```

#### 3. Update User Service with JIT Creation

```typescript
// src/features/user/user.service.ts
import { fetchClerkUser } from '../../utils/clerk.client';

class UserService {
  // ... existing code ...

  /**
   * Get or create user - handles race condition
   * Called by /me endpoint and auth middleware
   */
  async getOrCreateUser(clerkId: string): Promise<IUser> {
    // 1. Try to find existing user
    let user = await this.userRepo.findOne({ clerkId });

    if (user) {
      return user;
    }

    // 2. User not found - fetch from Clerk and create (JIT)
    console.log(`[JIT] User ${clerkId} not found in DB, fetching from Clerk...`);

    const clerkUser = await fetchClerkUser(clerkId);

    if (!clerkUser) {
      throw ApiError.NotFound('User not found in Clerk');
    }

    // 3. Create user with transaction
    user = await this.createUser({
      clerkId: clerkUser.clerkId,
      email: clerkUser.email,
      username: clerkUser.username,
      avatarUrl: clerkUser.avatarUrl,
    });

    console.log(`[JIT] User ${clerkId} created successfully`);

    return user;
  }

  /**
   * Create user - handles duplicates gracefully
   * Used by both webhook and JIT creation
   */
  async createUser(input: IUserCreateDTO): Promise<IUser> {
    return await withTransaction('Creating new user', async (session) => {
      // Check if user already exists (handle race between webhook and JIT)
      const existingUser = await this.userRepo.findOne({ clerkId: input.clerkId }, undefined, {
        session,
      });

      if (existingUser) {
        console.log(`[CreateUser] User ${input.clerkId} already exists, returning existing`);
        return existingUser;
      }

      // Create new user
      const newUser = await this.userRepo.create(input, { session });

      // Determine and assign role
      const totalUsers = await this.userRepo.count({}, { session });
      const role = UserRules.determineInitialRole(totalUsers);

      await this.platformRoleService.assignRole({ userId: newUser.clerkId, role }, { session });

      return newUser;
    });
  }
}
```

#### 4. Update Auth Middleware

```typescript
// src/middlewares/authHandler.ts
import { userService } from '../features/user/user.service';

export const validateAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { userId: clerkId } = getAuth(request);

    if (!clerkId) {
      throw ApiError.Unauthorized('Authentication required');
    }

    // Use getOrCreateUser instead of just findOne
    const user = await userService.getOrCreateUser(clerkId);

    // Get platform role
    const platformRole = await platformRoleService.getRoleByUserId(clerkId);

    // Attach to request
    request.user = {
      ...user.toObject(),
      platformRole: platformRole?.role || PlatformRoleEnum.USER,
    };

    request.auth = { userId: clerkId };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw ApiError.Unauthorized('Invalid authentication');
  }
};
```

#### 5. Update /me Controller

```typescript
// src/features/user/user.controller.ts
getCurrentUserDetails = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
  // User is already fetched/created by auth middleware
  const user = request.user;

  if (!user) {
    throw ApiError.NotFound('User not found');
  }

  const responseData = UserTransformer.currentUserResponse(user);

  return reply
    .code(HTTP_STATUS.OK.code)
    .send(new ApiResponse(true, 'User details fetched successfully', responseData));
});
```

---

## Solution 2: Webhook Idempotency & Retry Handling

Ensure webhooks can be safely retried without creating duplicates.

### Update Webhook Controller

```typescript
// src/features/user/user.webhook.controller.ts
import { WebhookEvent } from '@clerk/fastify';

class UserWebhookController {
  handleUserCreated = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const event = request.clerkEvent as WebhookEvent;

    if (event.type !== 'user.created') {
      return reply.code(400).send({ error: 'Invalid event type' });
    }

    const userData = WebhookTransformer.parseUserCreatedEvent(event);

    try {
      // createUser now handles duplicates gracefully
      const user = await userService.createUser(userData);

      return reply
        .code(201)
        .send(new ApiResponse(true, 'User created via webhook', { userId: user.clerkId }));
    } catch (error) {
      // Log but don't fail - user might already exist from JIT
      if (error.code === 11000) {
        // MongoDB duplicate key
        console.log(`[Webhook] User ${userData.clerkId} already exists (created via JIT)`);
        return reply
          .code(200)
          .send(new ApiResponse(true, 'User already exists', { userId: userData.clerkId }));
      }
      throw error;
    }
  });
}
```

### Add Webhook Event Logging (Optional but Recommended)

```typescript
// src/models/webhook-event.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IWebhookEvent extends Document {
  eventId: string; // Clerk's event ID (svix-id)
  eventType: string; // user.created, session.created, etc.
  payload: object; // Full event payload
  status: 'pending' | 'processed' | 'failed';
  attempts: number;
  error?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true, index: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed'],
      default: 'pending',
      index: true,
    },
    attempts: { type: Number, default: 0 },
    error: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

// Auto-delete old events after 30 days
WebhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const WebhookEvent = mongoose.model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);
```

### Idempotent Webhook Handler

```typescript
// src/features/user/user.webhook.controller.ts
handleWebhook = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
  const event = request.clerkEvent as WebhookEvent;
  const eventId = request.headers['svix-id'] as string;

  // 1. Check if we've already processed this event
  const existingEvent = await WebhookEvent.findOne({ eventId });

  if (existingEvent?.status === 'processed') {
    console.log(`[Webhook] Event ${eventId} already processed, skipping`);
    return reply.code(200).send({ message: 'Event already processed' });
  }

  // 2. Record the event
  const webhookEvent = await WebhookEvent.findOneAndUpdate(
    { eventId },
    {
      eventId,
      eventType: event.type,
      payload: event.data,
      status: 'pending',
      $inc: { attempts: 1 },
    },
    { upsert: true, new: true }
  );

  try {
    // 3. Process based on event type
    switch (event.type) {
      case 'user.created':
        await this.processUserCreated(event);
        break;
      case 'user.updated':
        await this.processUserUpdated(event);
        break;
      case 'user.deleted':
        await this.processUserDeleted(event);
        break;
      case 'session.created':
        await this.processSessionCreated(event);
        break;
      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    // 4. Mark as processed
    await WebhookEvent.findByIdAndUpdate(webhookEvent._id, {
      status: 'processed',
      processedAt: new Date(),
    });

    return reply.code(200).send({ message: 'Webhook processed successfully' });
  } catch (error) {
    // 5. Mark as failed
    await WebhookEvent.findByIdAndUpdate(webhookEvent._id, {
      status: 'failed',
      error: error.message,
    });

    throw error;
  }
});
```

---

## Solution 3: Frontend Retry with Exponential Backoff

Handle the case where `/me` fails due to race condition.

### Update useUserProfile Hook

```typescript
// src/hooks/users/user.queries.ts
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../useApi';
import { userApi } from '../../api/user.api';
import { QueryKey, STALE_TIME } from '../../constants';
import { useAuth } from '@clerk/clerk-react';

export function useUserProfile() {
  const api = useApi();
  const { isSignedIn, isLoaded } = useAuth();

  return useQuery({
    queryKey: QueryKey.user.me,
    queryFn: () => userApi(api).getMe(),
    enabled: isLoaded && isSignedIn,
    staleTime: STALE_TIME.LONG,

    // Retry configuration for race condition
    retry: (failureCount, error: any) => {
      // Retry up to 5 times for 404 errors (user not yet created)
      if (error?.response?.status === 404 && failureCount < 5) {
        return true;
      }
      // Retry once for other errors
      return failureCount < 1;
    },

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 16000),
  });
}
```

### Add Loading State Component

```typescript
// src/components/user-sync-loading.tsx
import { useUserProfile } from '../hooks/users/user.queries';
import { Loader2 } from 'lucide-react';

export function UserSyncLoading({ children }: { children: React.ReactNode }) {
  const { isLoading, isError, error, failureCount } = useUserProfile();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">
          {failureCount > 0
            ? `Setting up your account... (attempt ${failureCount + 1})`
            : 'Loading your profile...'}
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-destructive">Failed to load profile</p>
        <p className="text-sm text-muted-foreground mt-2">
          {error?.message || 'Please try refreshing the page'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-primary text-white rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
```

---

## Solution 4: Polling Until User Exists

For critical flows, actively poll until user is confirmed.

```typescript
// src/hooks/users/useWaitForUser.ts
import { useState, useEffect } from 'react';
import { useApi } from '../useApi';
import { userApi } from '../../api/user.api';

interface UseWaitForUserOptions {
  maxAttempts?: number;
  intervalMs?: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useWaitForUser(options: UseWaitForUserOptions = {}) {
  const { maxAttempts = 10, intervalMs = 1000, onSuccess, onError } = options;

  const api = useApi();
  const [status, setStatus] = useState<'idle' | 'polling' | 'success' | 'error'>('idle');
  const [attempts, setAttempts] = useState(0);

  const startPolling = async () => {
    setStatus('polling');
    setAttempts(0);

    for (let i = 0; i < maxAttempts; i++) {
      setAttempts(i + 1);

      try {
        await userApi(api).getMe();
        setStatus('success');
        onSuccess?.();
        return;
      } catch (error: any) {
        if (error?.response?.status !== 404) {
          // Non-404 error, stop polling
          setStatus('error');
          onError?.(error);
          return;
        }

        // 404 - user not yet created, continue polling
        if (i < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
      }
    }

    // Max attempts reached
    setStatus('error');
    onError?.(new Error('User creation timeout'));
  };

  return {
    status,
    attempts,
    maxAttempts,
    startPolling,
    isPolling: status === 'polling',
    isSuccess: status === 'success',
    isError: status === 'error',
  };
}
```

### Usage After Signup

```typescript
// src/pages/sign-up.tsx
import { useWaitForUser } from '../hooks/users/useWaitForUser';

function SignUpPage() {
  const navigate = useNavigate();
  const { startPolling, isPolling, attempts, maxAttempts } = useWaitForUser({
    onSuccess: () => navigate('/'),
    onError: (error) => toast.error('Failed to create account. Please try again.'),
  });

  const handleSignUpSuccess = async () => {
    // After Clerk signup succeeds, wait for user to be created in our DB
    await startPolling();
  };

  // ... existing signup code ...

  if (isPolling) {
    return (
      <div className="flex flex-col items-center justify-center">
        <Loader2 className="animate-spin" />
        <p>Setting up your account ({attempts}/{maxAttempts})...</p>
      </div>
    );
  }
}
```

---

## Solution 5: Database-Level Safeguards

### Add Unique Constraints (Already in Place)

```typescript
// src/models/user.model.ts
const UserSchema = new Schema({
  clerkId: {
    type: String,
    required: true,
    unique: true, // ✅ Prevents duplicate users
    index: true,
  },
  email: {
    type: String,
    required: true,
    unique: true, // ✅ Prevents duplicate emails
    index: true,
  },
  username: {
    type: String,
    required: true,
    unique: true, // ✅ Prevents duplicate usernames
  },
});
```

### Handle Duplicate Key Errors

```typescript
// src/features/user/user.service.ts
async createUser(input: IUserCreateDTO): Promise<IUser> {
  try {
    return await withTransaction('Creating new user', async (session) => {
      // ... creation logic
    });
  } catch (error: any) {
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      console.log(`[CreateUser] Duplicate ${field} detected, fetching existing user`);

      // Return existing user instead of throwing
      const existingUser = await this.userRepo.findOne({ clerkId: input.clerkId });
      if (existingUser) {
        return existingUser;
      }
    }
    throw error;
  }
}
```

---

## Complete Implementation Checklist

### Backend Changes

- [ ] Install `@clerk/backend` package
- [ ] Create `clerk.client.ts` utility
- [ ] Update `user.service.ts` with `getOrCreateUser` method
- [ ] Update `authHandler.ts` to use `getOrCreateUser`
- [ ] Make webhook handler idempotent
- [ ] Add `WebhookEvent` model for tracking (optional)
- [ ] Handle duplicate key errors gracefully

### Frontend Changes

- [ ] Add retry logic to `useUserProfile` hook
- [ ] Create `UserSyncLoading` component
- [ ] Add polling hook for critical flows
- [ ] Update signup flow to wait for user creation

### Environment Variables

```env
# .env
CLERK_SECRET_KEY=sk_live_xxxxx  # Required for JIT user creation
CLERK_WEBHOOK_SECRET=whsec_xxxxx  # Already have this
```

---

## Recommended Implementation Order

### Phase 1: Backend Safety (Critical)

1. Add JIT user creation in auth middleware
2. Make `createUser` handle duplicates gracefully
3. Add Clerk backend SDK for fetching user data

### Phase 2: Frontend Resilience

1. Add retry logic to `/me` query
2. Add loading states for account sync

### Phase 3: Observability (Optional)

1. Add webhook event logging
2. Add monitoring for JIT creations
3. Alert on high JIT creation rate (indicates webhook issues)

---

## Monitoring & Alerts

### Log JIT Creations

```typescript
// When JIT creation happens, log it
console.warn(`[JIT-CREATION] User ${clerkId} created via JIT - webhook may have failed`);

// Track metrics
metrics.increment('user.created.jit');
metrics.increment('user.created.webhook'); // In webhook handler
```

### Alert Conditions

| Metric            | Threshold      | Action                      |
| ----------------- | -------------- | --------------------------- |
| JIT creation rate | > 10% of total | Check webhook configuration |
| Webhook failures  | > 5 in 1 hour  | Check Clerk dashboard       |
| /me 404 errors    | > 100 in 5 min | Check DB connectivity       |

---

## Summary

The **race condition** between Clerk signup, webhook delivery, and `/me` API call is a common issue. The recommended solution combines:

1. **JIT User Creation** - Create user on-demand if webhook hasn't arrived
2. **Idempotent Webhooks** - Handle retries and duplicates gracefully
3. **Frontend Retry** - Retry `/me` with exponential backoff
4. **Database Safeguards** - Unique constraints prevent duplicates

This ensures users **always** have a seamless signup experience, regardless of webhook timing or failures.
