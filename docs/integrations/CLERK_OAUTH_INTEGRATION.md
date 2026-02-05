# Clerk OAuth Integration Guide (Google & GitHub)

## Overview

This document outlines the changes needed to handle Google and GitHub authentication through Clerk in your StoryChain backend. Since Clerk abstracts OAuth provider complexity, your backend changes are minimal but important for capturing provider-specific data.

---

## Table of Contents

1. [Understanding the New Fields](#understanding-the-new-fields)
2. [How Clerk OAuth Works](#how-clerk-oauth-works)
3. [Current Implementation Analysis](#current-implementation-analysis)
4. [Required Model Changes](#required-model-changes)
5. [Webhook Handler Updates](#webhook-handler-updates)
6. [Transformer Updates](#transformer-updates)
7. [DTO & Type Updates](#dto--type-updates)
8. [Handling Edge Cases](#handling-edge-cases)
9. [Clerk Dashboard Configuration](#clerk-dashboard-configuration)
10. [Testing OAuth Flows](#testing-oauth-flows)
11. [Security Considerations](#security-considerations)

---

## Understanding the New Fields

This section explains the four new fields you need to add to your User model and why each one matters.

### Field Overview

| Field               | Type    | Purpose                                            |
| ------------------- | ------- | -------------------------------------------------- |
| `authProvider`      | enum    | How the user **originally signed up**              |
| `primaryAuthMethod` | enum    | The user's **current preferred** login method      |
| `connectedAccounts` | array   | All **linked OAuth providers** with their metadata |
| `emailVerified`     | boolean | Whether the user's **email is confirmed**          |

---

### 1. `authProvider`

**Type:** `'email' | 'google' | 'github' | 'discord' | 'apple'`

**Purpose:** Records how the user **first created their account**.

```typescript
authProvider: {
  type: String,
  enum: ['email', 'google', 'github', 'discord', 'apple'],
  default: 'email',
  index: true,  // Indexed for analytics queries
}
```

#### Why You Need It

| Use Case                  | Example                                                           |
| ------------------------- | ----------------------------------------------------------------- |
| **Analytics**             | "60% of users sign up with Google"                                |
| **Onboarding UX**         | Show different welcome flow for OAuth vs email users              |
| **Account Recovery**      | Know which provider to suggest if user forgets how they signed up |
| **Marketing Attribution** | Track which OAuth providers drive signups                         |

#### How It's Set

```typescript
// Set ONCE during user creation, never changes
const authProvider = externalAccounts.length > 0 ? determineProvider(externalAccounts[0]) : 'email';
```

#### Real-World Scenarios

```
Scenario 1: User clicks "Sign up with Google"
→ authProvider = 'google'
→ Even if they later add GitHub, authProvider stays 'google'

Scenario 2: User signs up with email/password
→ authProvider = 'email'
→ If they later link Google, authProvider stays 'email'

Scenario 3: User clicks "Sign up with GitHub"
→ authProvider = 'github'
→ This is permanent - represents their original signup method
```

---

### 2. `primaryAuthMethod`

**Type:** `'email' | 'google' | 'github' | 'discord' | 'apple'`

**Purpose:** Tracks the user's **current preferred** way to log in.

```typescript
primaryAuthMethod: {
  type: String,
  enum: ['email', 'google', 'github', 'discord', 'apple'],
  default: 'email',
}
```

#### Why You Need It (Different from `authProvider`)

| `authProvider`                     | `primaryAuthMethod`                    |
| ---------------------------------- | -------------------------------------- |
| **Immutable** - set once at signup | **Mutable** - can change over time     |
| Answers: "How did they join?"      | Answers: "How do they usually log in?" |
| Historical/analytics purpose       | Active UX/security purpose             |

#### How It's Used

```typescript
// Show login suggestion on login page
if (user.primaryAuthMethod === 'github') {
  showPrompt('Welcome back! Click here to sign in with GitHub');
}

// Security: Warn if login method changes
if (session.authMethod !== user.primaryAuthMethod) {
  sendSecurityAlert('You logged in with a different method than usual');
}
```

#### Real-World Scenarios

```
Scenario: User signed up with email, later links Google, starts using Google to log in

Initial state:
  authProvider: 'email'
  primaryAuthMethod: 'email'

After linking Google and using it:
  authProvider: 'email'        ← Still email (original signup)
  primaryAuthMethod: 'google'  ← Updated to reflect current behavior
```

#### When to Update It

```typescript
// Option 1: Update on each login (track actual behavior)
case 'session.created': {
  const loginMethod = detectLoginMethod(session);
  await userService.updatePrimaryAuthMethod(userId, loginMethod);
}

// Option 2: Let user set it in preferences
// Option 3: Keep it same as authProvider (simpler approach)
```

---

### 3. `connectedAccounts`

**Type:** Array of connected OAuth provider objects

**Purpose:** Stores **all OAuth providers** the user has linked, with their metadata.

```typescript
connectedAccounts: [
  {
    provider: {
      type: String,
      enum: ['google', 'github', 'discord', 'apple'],
      required: true,
    },
    providerAccountId: {
      type: String,
      required: true, // e.g., Google user ID: "118234567890123456789"
    },
    email: {
      type: String, // Email from this provider (may differ from primary)
      lowercase: true,
    },
    username: String, // Provider username (e.g., GitHub username)
    avatarUrl: String, // Provider-specific avatar URL
    connectedAt: {
      type: Date,
      default: Date.now,
    },
  },
];
```

#### Why You Need It

| Use Case                       | Implementation                                  |
| ------------------------------ | ----------------------------------------------- |
| **Multiple login options**     | User can sign in with any connected provider    |
| **Account linking UI**         | Show which providers are connected in settings  |
| **Avatar fallback**            | Use provider avatar if user hasn't uploaded one |
| **Username suggestions**       | Use GitHub username for display                 |
| **Security audit**             | Track when accounts were linked                 |
| **Provider-specific features** | e.g., "Import repos" if GitHub connected        |

#### Data Structure Example

```typescript
// User who signed up with Google and later linked GitHub
{
  clerkId: "user_2abc123",
  email: "john@gmail.com",
  authProvider: "google",
  connectedAccounts: [
    {
      provider: "google",
      providerAccountId: "118234567890123456789",
      email: "john@gmail.com",
      avatarUrl: "https://lh3.googleusercontent.com/a/photo.jpg",
      connectedAt: "2024-01-15T10:30:00Z"
    },
    {
      provider: "github",
      providerAccountId: "12345678",
      email: "john@users.noreply.github.com",  // Different email!
      username: "johndoe",                      // GitHub username
      avatarUrl: "https://avatars.githubusercontent.com/u/12345678",
      connectedAt: "2024-02-20T14:45:00Z"
    }
  ]
}
```

#### Key Insight: Multiple Emails

```
User's primary email: john@gmail.com (from Google)
GitHub email: john@users.noreply.github.com (private GitHub email)

Why store both?
→ Helps identify user if they try to create duplicate account
→ Useful for matching contributions/activity across platforms
```

#### Querying Connected Accounts

```typescript
// Check if user has GitHub connected
const hasGitHub = user.connectedAccounts.some((a) => a.provider === 'github');

// Get GitHub username if available
const githubAccount = user.connectedAccounts.find((a) => a.provider === 'github');
const githubUsername = githubAccount?.username;

// Find user by any connected provider ID
const user = await User.findOne({
  'connectedAccounts.provider': 'github',
  'connectedAccounts.providerAccountId': '12345678',
});
```

#### Account Linking/Unlinking Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ACCOUNT LINKING FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User clicks "Connect GitHub" in your app                    │
│                      ↓                                          │
│  2. Redirects to Clerk → Clerk redirects to GitHub              │
│                      ↓                                          │
│  3. User authorizes on GitHub                                   │
│                      ↓                                          │
│  4. Clerk receives OAuth callback, links account                │
│                      ↓                                          │
│  5. Clerk fires `user.updated` webhook to your backend          │
│                      ↓                                          │
│  6. Your webhook handler updates `connectedAccounts` array      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4. `emailVerified`

**Type:** `boolean`

**Purpose:** Indicates whether the user's **primary email address has been verified**.

```typescript
emailVerified: {
  type: Boolean,
  default: false,
}
```

#### Why You Need It

| Use Case                 | Implementation                                 |
| ------------------------ | ---------------------------------------------- |
| **Security gates**       | Block sensitive actions until email verified   |
| **Trust levels**         | Unverified users get limited permissions       |
| **Spam prevention**      | Prevent unverified users from sending messages |
| **Email deliverability** | Only send emails to verified addresses         |

#### How Email Verification Works with OAuth

```
┌──────────────────────────────────────────────────────────────┐
│              EMAIL VERIFICATION BY AUTH METHOD                │
├──────────────────┬───────────────────────────────────────────┤
│ Auth Method      │ Email Verified Status                     │
├──────────────────┼───────────────────────────────────────────┤
│ Google OAuth     │ ✅ Automatically verified                 │
│                  │ (Google already verified the email)       │
├──────────────────┼───────────────────────────────────────────┤
│ GitHub OAuth     │ ✅ Automatically verified                 │
│                  │ (GitHub verified the email)               │
├──────────────────┼───────────────────────────────────────────┤
│ Email/Password   │ ❌ Requires manual verification           │
│                  │ (User must click email link)              │
├──────────────────┼───────────────────────────────────────────┤
│ Apple OAuth      │ ✅ Automatically verified                 │
│                  │ (Apple verified the email)                │
└──────────────────┴───────────────────────────────────────────┘
```

#### Important: OAuth = Pre-Verified Email

```typescript
// When extracting from Clerk webhook
const emailVerified = raw.email_addresses.some(
  (e) => e.id === raw.primary_email_address_id && e.verification?.status === 'verified'
);

// OAuth users almost always have verified = true
// because Google/GitHub already verified their email
```

#### Security Implementation

```typescript
// Middleware to require verified email
function requireVerifiedEmail(req, res, next) {
  if (!req.user.emailVerified) {
    return res.status(403).json({
      error: 'Please verify your email to perform this action',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }
  next();
}

// Usage in routes
app.post('/stories', requireVerifiedEmail, createStory);
app.post('/comments', requireVerifiedEmail, createComment);
app.post('/invite', requireVerifiedEmail, inviteCollaborator);
```

#### Feature Gating Based on Verification

```typescript
// Different capabilities based on verification status
const userCapabilities = {
  verified: {
    canCreateStories: true,
    canComment: true,
    canInvite: true,
    canMessage: true,
    dailyUpvoteLimit: 50,
  },
  unverified: {
    canCreateStories: false,
    canComment: true, // Allow basic engagement
    canInvite: false,
    canMessage: false,
    dailyUpvoteLimit: 5,
  },
};
```

---

### Field Relationships Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER DOCUMENT                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  clerkId: "user_2abc123"                                            │
│  email: "john@gmail.com"                                            │
│  username: "johndoe"                                                │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ authProvider: "google"                                       │    │
│  │ ─────────────────────                                        │    │
│  │ "I originally signed up with Google"                         │    │
│  │ Set once, never changes                                      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ primaryAuthMethod: "github"                                  │    │
│  │ ──────────────────────────                                   │    │
│  │ "But now I usually log in with GitHub"                       │    │
│  │ Can change based on user behavior                            │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ connectedAccounts: [                                         │    │
│  │   { provider: "google", id: "118...", email: "john@..." },  │    │
│  │   { provider: "github", id: "123...", username: "johndoe" } │    │
│  │ ]                                                            │    │
│  │ ──────────────────                                           │    │
│  │ "Here are all my connected providers with their details"     │    │
│  │ Array grows/shrinks as user links/unlinks                    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ emailVerified: true                                          │    │
│  │ ─────────────────                                            │    │
│  │ "My email is verified (Google verified it for me)"           │    │
│  │ Affects what features I can access                           │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Quick Reference: When Each Field Changes

| Event                      | `authProvider`  | `primaryAuthMethod` | `connectedAccounts`   | `emailVerified` |
| -------------------------- | --------------- | ------------------- | --------------------- | --------------- |
| User signs up with Google  | Set to `google` | Set to `google`     | Add Google account    | Set to `true`   |
| User signs up with email   | Set to `email`  | Set to `email`      | Empty `[]`            | Set to `false`  |
| User verifies email        | No change       | No change           | No change             | Set to `true`   |
| User links GitHub          | No change       | Optional update     | Add GitHub account    | No change       |
| User unlinks Google        | No change       | May need update     | Remove Google account | No change       |
| User changes primary email | No change       | No change           | No change             | May change      |

---

## How Clerk OAuth Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│    Clerk    │────▶│   Google/   │────▶│    Clerk    │
│   (React)   │     │   Sign-In   │     │   GitHub    │     │   Webhook   │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                    │
                                                                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   MongoDB   │◀────│   Backend   │◀────│   Webhook   │◀────│ user.created│
│    User     │     │   Service   │     │   Handler   │     │    Event    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Key Points:

- **OAuth is handled entirely by Clerk** - no backend OAuth routes needed
- **Your backend receives webhook events** when users sign up/sign in
- **The `UserJSON` payload contains OAuth provider info** in `external_accounts`
- **You store provider metadata** for analytics, account linking, and user experience

---

## Current Implementation Analysis

### Current User Model (`src/models/user.model.ts`)

```typescript
// Current fields - NO OAuth provider information stored
{
  clerkId: String,      // ✅ Primary Clerk identifier
  username: String,     // ✅ From Clerk
  email: String,        // ✅ From Clerk
  avatarUrl: String,    // ✅ Can be from OAuth provider
  // ... gamification, stats, preferences
}
```

### Current Webhook Transformer (`src/features/user/builders/webhook.transformer.ts`)

```typescript
// Current transformation - MISSING OAuth data
transformUserCreated(raw: UserJSON): IUserCreateDTO {
  return UserCreateDTO.parse({
    clerkId: raw.id,
    email: raw.email_addresses[0].email_address,
    username: raw.username,
    // ❌ Missing: avatarUrl from OAuth
    // ❌ Missing: OAuth provider info
    // ❌ Missing: external account IDs
  });
}
```

---

## Required Model Changes

### Update User Schema (`src/models/user.model.ts`)

Add these new fields to track OAuth provider information:

```typescript
import mongoose, { Schema } from 'mongoose';
import { IUserDoc } from '@features/user/types/user.types';

const userSchema = new Schema<IUserDoc>(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    // ============================================
    // NEW: OAuth Provider Information
    // ============================================
    authProvider: {
      type: String,
      enum: ['email', 'google', 'github', 'discord', 'apple'],
      default: 'email',
      index: true,
    },

    // Store connected OAuth accounts
    connectedAccounts: [
      {
        provider: {
          type: String,
          enum: ['google', 'github', 'discord', 'apple'],
          required: true,
        },
        providerAccountId: {
          type: String,
          required: true,
        },
        email: {
          type: String,
          lowercase: true,
        },
        username: String, // GitHub username, etc.
        avatarUrl: String, // Provider-specific avatar
        connectedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Track primary authentication method
    primaryAuthMethod: {
      type: String,
      enum: ['email', 'google', 'github', 'discord', 'apple'],
      default: 'email',
    },

    // Flag if email is verified (important for OAuth)
    emailVerified: {
      type: Boolean,
      default: false,
    },
    // ============================================

    // Profile (existing)
    bio: {
      type: String,
      maxlength: 500,
      default: '',
    },
    avatarUrl: {
      type: String,
      default: '',
    },

    // ... rest of existing schema (gamification, stats, etc.)
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
  }
);

// NEW: Index for connected accounts lookup
userSchema.index({ 'connectedAccounts.provider': 1, 'connectedAccounts.providerAccountId': 1 });

// Existing indexes...
userSchema.index({ xp: -1 });
userSchema.index({ 'stats.totalUpvotes': -1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model<IUserDoc>('User', userSchema);

export { User };
```

---

## Webhook Handler Updates

### Clerk `UserJSON` Structure for OAuth Users

When a user signs up via Google or GitHub, the `UserJSON` payload includes:

```typescript
interface UserJSON {
  id: string; // "user_2abc..."
  email_addresses: EmailAddressJSON[];
  username: string | null; // May be null for OAuth
  first_name: string | null;
  last_name: string | null;
  image_url: string; // OAuth provider avatar

  // KEY: OAuth provider information
  external_accounts: ExternalAccountJSON[];

  primary_email_address_id: string;
  primary_phone_number_id: string | null;

  created_at: number;
  updated_at: number;
}

interface ExternalAccountJSON {
  id: string; // "eac_2abc..."
  provider: string; // "oauth_google" | "oauth_github"
  identification_id: string;
  provider_user_id: string; // Google/GitHub user ID
  approved_scopes: string;
  email_address: string;
  first_name: string;
  last_name: string;
  avatar_url: string; // Provider avatar URL
  username: string | null; // GitHub username
  public_metadata: Record<string, unknown>;
  label: string | null;
  verification: VerificationJSON;
}
```

### Update Webhook Controller (`src/features/user/controllers/user.webhook.controller.ts`)

```typescript
import { WebhookEvent } from '@clerk/fastify';
import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { HTTP_STATUS } from '@constants/httpStatus';
import { ApiResponse } from '@utils/apiResponse';
import { catchAsync } from '@utils/catchAsync';
import { WebhookTransformer } from '../builders/webhook.transformer';
import { UserService } from '../services/user.service';

@singleton()
class UserWebhookController {
  constructor(
    @inject(TOKENS.UserService)
    private readonly userService: UserService,
    @inject(TOKENS.WebhookTransformer)
    private readonly transformer: WebhookTransformer
  ) {}

  handle = catchAsync(async (req: FastifyRequest, reply: FastifyReply) => {
    const event = (req as any).clerkEvent as WebhookEvent;

    if (!event?.type) {
      return reply
        .code(HTTP_STATUS.BAD_REQUEST.code)
        .send(new ApiResponse(false, 'Invalid webhook payload'));
    }

    switch (event.type) {
      // ----------------------------
      // USER CREATED
      // ----------------------------
      case 'user.created': {
        const parsed = this.transformer.transformUserCreated(event.data);
        await this.userService.createUser(parsed);
        return reply.code(HTTP_STATUS.CREATED.code).send(new ApiResponse(true, 'User created'));
      }

      // ----------------------------
      // NEW: USER UPDATED (OAuth account linked)
      // ----------------------------
      case 'user.updated': {
        const parsed = this.transformer.transformUserUpdated(event.data);
        await this.userService.updateUserFromClerk(parsed);
        return reply.code(HTTP_STATUS.OK.code).send(new ApiResponse(true, 'User updated'));
      }

      // ----------------------------
      // SESSION CREATED
      // ----------------------------
      case 'session.created': {
        const parsed = this.transformer.transformSessionCreated(event.data);
        await this.userService.createSession(parsed);
        return reply.code(HTTP_STATUS.CREATED.code).send(new ApiResponse(true, 'Session created'));
      }

      // ----------------------------
      // NEW: USER DELETED
      // ----------------------------
      case 'user.deleted': {
        if (event.data.id) {
          await this.userService.handleUserDeleted(event.data.id);
        }
        return reply.code(HTTP_STATUS.OK.code).send(new ApiResponse(true, 'User deleted'));
      }

      default:
        return reply
          .code(HTTP_STATUS.OK.code)
          .send(new ApiResponse(true, `Ignored event: ${event.type}`));
    }
  });
}

export { UserWebhookController };
```

---

## Transformer Updates

### Update Webhook Transformer (`src/features/user/builders/webhook.transformer.ts`)

```typescript
import { SessionJSON, UserJSON } from '@clerk/fastify';
import {
  ISessionCreateDTO,
  IUserCreateDTO,
  IUserUpdateDTO,
  SessionCreateDTO,
  UserCreateDTO,
  UserUpdateDTO,
} from '@dto/user.dto';
import { singleton } from 'tsyringe';
import { AuthProvider, ConnectedAccount } from '@features/user/types/user.types';

@singleton()
export class WebhookTransformer {
  /**
   * Transform Clerk user.created event to create DTO
   * Handles both email/password and OAuth signups
   */
  transformUserCreated(raw: UserJSON): IUserCreateDTO {
    const externalAccounts = raw.external_accounts ?? [];
    const primaryOAuth = externalAccounts[0]; // First OAuth account is typically primary

    // Determine auth provider
    const authProvider = this.determineAuthProvider(externalAccounts);

    // Generate username if not provided (common with OAuth)
    const username = this.resolveUsername(raw, primaryOAuth);

    // Get best available avatar URL
    const avatarUrl = this.resolveAvatarUrl(raw, primaryOAuth);

    // Transform connected accounts
    const connectedAccounts = this.transformExternalAccounts(externalAccounts);

    // Check if email is verified
    const emailVerified = raw.email_addresses.some(
      (e) => e.id === raw.primary_email_address_id && e.verification?.status === 'verified'
    );

    return UserCreateDTO.parse({
      clerkId: raw.id,
      email: raw.email_addresses[0]?.email_address,
      username,
      avatarUrl,
      authProvider,
      primaryAuthMethod: authProvider,
      connectedAccounts,
      emailVerified,
      firstName: raw.first_name,
      lastName: raw.last_name,
    });
  }

  /**
   * Transform Clerk user.updated event
   * Called when user links/unlinks OAuth accounts
   */
  transformUserUpdated(raw: UserJSON): IUserUpdateDTO {
    const externalAccounts = raw.external_accounts ?? [];

    return UserUpdateDTO.parse({
      clerkId: raw.id,
      email: raw.email_addresses[0]?.email_address,
      username: raw.username,
      avatarUrl: raw.image_url,
      connectedAccounts: this.transformExternalAccounts(externalAccounts),
      emailVerified: raw.email_addresses.some(
        (e) => e.id === raw.primary_email_address_id && e.verification?.status === 'verified'
      ),
    });
  }

  /**
   * Transform session created event
   */
  transformSessionCreated(raw: SessionJSON): ISessionCreateDTO {
    return SessionCreateDTO.parse({
      sessionId: raw.id,
      userId: raw.user_id,
      clientId: raw.client_id,
      createdAt: new Date(raw.created_at * 1000),
      lastActiveAt: new Date(raw.last_active_at * 1000),
      ip: raw.latest_activity?.ip_address ?? null,
      userAgent: this.buildUserAgent(raw.latest_activity),
    });
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Determine the primary auth provider from external accounts
   */
  private determineAuthProvider(externalAccounts: UserJSON['external_accounts']): AuthProvider {
    if (!externalAccounts || externalAccounts.length === 0) {
      return 'email';
    }

    const provider = externalAccounts[0].provider;

    // Clerk uses 'oauth_google', 'oauth_github' format
    if (provider.includes('google')) return 'google';
    if (provider.includes('github')) return 'github';
    if (provider.includes('discord')) return 'discord';
    if (provider.includes('apple')) return 'apple';

    return 'email';
  }

  /**
   * Resolve username from various sources
   * Priority: Clerk username > GitHub username > email prefix > generated
   */
  private resolveUsername(raw: UserJSON, primaryOAuth?: UserJSON['external_accounts'][0]): string {
    // 1. Use Clerk username if available
    if (raw.username) {
      return raw.username;
    }

    // 2. Use GitHub username if signing up with GitHub
    if (primaryOAuth?.provider?.includes('github') && primaryOAuth.username) {
      return primaryOAuth.username;
    }

    // 3. Generate from name
    if (raw.first_name || raw.last_name) {
      const nameBased = `${raw.first_name ?? ''}${raw.last_name ?? ''}`
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      if (nameBased.length >= 3) {
        return nameBased + Math.floor(Math.random() * 1000);
      }
    }

    // 4. Generate from email prefix
    const emailPrefix = raw.email_addresses[0]?.email_address?.split('@')[0] ?? '';
    const sanitized = emailPrefix.replace(/[^a-z0-9]/gi, '').toLowerCase();

    if (sanitized.length >= 3) {
      return sanitized + Math.floor(Math.random() * 1000);
    }

    // 5. Fallback: generate random username
    return `user_${Date.now().toString(36)}`;
  }

  /**
   * Get the best avatar URL
   * Priority: Clerk image > OAuth avatar > empty
   */
  private resolveAvatarUrl(raw: UserJSON, primaryOAuth?: UserJSON['external_accounts'][0]): string {
    // Clerk's image_url is usually the best (synced from OAuth or uploaded)
    if (raw.image_url && !raw.image_url.includes('default')) {
      return raw.image_url;
    }

    // Fall back to OAuth provider avatar
    if (primaryOAuth?.avatar_url) {
      return primaryOAuth.avatar_url;
    }

    return '';
  }

  /**
   * Transform external accounts to connected accounts format
   */
  private transformExternalAccounts(
    externalAccounts: UserJSON['external_accounts']
  ): ConnectedAccount[] {
    if (!externalAccounts) return [];

    return externalAccounts.map((account) => ({
      provider: this.normalizeProvider(account.provider),
      providerAccountId: account.provider_user_id,
      email: account.email_address,
      username: account.username ?? undefined,
      avatarUrl: account.avatar_url ?? undefined,
      connectedAt: new Date(),
    }));
  }

  /**
   * Normalize Clerk provider string to our enum
   */
  private normalizeProvider(clerkProvider: string): 'google' | 'github' | 'discord' | 'apple' {
    if (clerkProvider.includes('google')) return 'google';
    if (clerkProvider.includes('github')) return 'github';
    if (clerkProvider.includes('discord')) return 'discord';
    if (clerkProvider.includes('apple')) return 'apple';
    return 'google'; // fallback
  }

  /**
   * Build user agent string from session activity
   */
  private buildUserAgent(activity: SessionJSON['latest_activity']) {
    if (!activity) return null;
    const type = activity.device_type ?? (activity.is_mobile === true ? 'Mobile' : 'Unknown');
    const browser =
      `${activity.browser_name ?? 'Unknown'} ${activity.browser_version ?? ''}`.trim();
    const loc = [activity.city, activity.country].filter(Boolean).join(', ');
    return `${browser} (${type})${loc ? ` - ${loc}` : ''} [IP: ${activity.ip_address}]`;
  }
}
```

---

## DTO & Type Updates

### Update User Types (`src/features/user/types/user.types.ts`)

```typescript
import { Document } from 'mongoose';

// ============================================
// NEW: Auth Provider Types
// ============================================
export type AuthProvider = 'email' | 'google' | 'github' | 'discord' | 'apple';

export interface ConnectedAccount {
  provider: Exclude<AuthProvider, 'email'>;
  providerAccountId: string;
  email?: string;
  username?: string;
  avatarUrl?: string;
  connectedAt: Date;
}

// Existing enums...
export enum Badge {
  STORY_STARTER = 'STORY_STARTER',
  BRANCH_CREATOR = 'BRANCH_CREATOR',
  TOP_CONTRIBUTOR = 'TOP_CONTRIBUTOR',
  MOST_UPVOTED = 'MOST_UPVOTED',
  TRENDING_AUTHOR = 'TRENDING_AUTHOR',
  VETERAN_WRITER = 'VETERAN_WRITER',
  COMMUNITY_FAVORITE = 'COMMUNITY_FAVORITE',
  COLLABORATIVE = 'COLLABORATIVE',
  QUALITY_CURATOR = 'QUALITY_CURATOR',
}

export interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export interface UserStats {
  storiesCreated: number;
  chaptersWritten: number;
  totalUpvotes: number;
  totalDownvotes: number;
  branchesCreated: number;
}

export interface IUser {
  clerkId: string;
  username: string;
  email: string;

  bio?: string;
  avatarUrl?: string;

  // ============================================
  // NEW: OAuth Fields
  // ============================================
  authProvider: AuthProvider;
  primaryAuthMethod: AuthProvider;
  connectedAccounts: ConnectedAccount[];
  emailVerified: boolean;
  // ============================================

  xp: number;
  level: number;
  badges: Badge[];

  stats: UserStats;
  preferences: UserPreferences;

  isActive: boolean;
  isBanned: boolean;
  banReason?: string;
  bannedUntil?: Date;

  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDoc extends Document, IUser {}

// ... rest of existing types
```

### Update User DTOs (`src/dto/user.dto.ts`)

```typescript
import { z } from 'zod';

// Auth provider enum for validation
const AuthProviderEnum = z.enum(['email', 'google', 'github', 'discord', 'apple']);

// Connected account schema
const ConnectedAccountSchema = z.object({
  provider: z.enum(['google', 'github', 'discord', 'apple']),
  providerAccountId: z.string(),
  email: z.string().email().optional(),
  username: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  connectedAt: z.date().default(() => new Date()),
});

// Updated UserCreateDTO with OAuth fields
const UserCreateDTO = z.object({
  clerkId: z.string(),
  email: z.string().email(),
  username: z.string().min(3).max(30),
  avatarUrl: z.string().url().optional().default(''),

  // OAuth fields
  authProvider: AuthProviderEnum.default('email'),
  primaryAuthMethod: AuthProviderEnum.default('email'),
  connectedAccounts: z.array(ConnectedAccountSchema).default([]),
  emailVerified: z.boolean().default(false),

  // Optional profile fields from OAuth
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

// NEW: UserUpdateDTO for user.updated webhook
const UserUpdateDTO = z.object({
  clerkId: z.string(),
  email: z.string().email().optional(),
  username: z.string().min(3).max(30).optional(),
  avatarUrl: z.string().url().optional(),
  connectedAccounts: z.array(ConnectedAccountSchema).optional(),
  emailVerified: z.boolean().optional(),
});

// Existing SessionCreateDTO
const SessionCreateDTO = z.object({
  sessionId: z.string(),
  userId: z.string(),
  clientId: z.string(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.date(),
  lastActiveAt: z.date(),
});

interface ILoginUserDTO {
  userId: string;
}

interface ISearchUserByUsernameDTO {
  username: string;
}

type IUserCreateDTO = z.infer<typeof UserCreateDTO>;
type IUserUpdateDTO = z.infer<typeof UserUpdateDTO>;
type ISessionCreateDTO = z.infer<typeof SessionCreateDTO>;
type IConnectedAccount = z.infer<typeof ConnectedAccountSchema>;

export { UserCreateDTO, UserUpdateDTO, SessionCreateDTO, ConnectedAccountSchema };
export type {
  IUserCreateDTO,
  IUserUpdateDTO,
  ISessionCreateDTO,
  ISearchUserByUsernameDTO,
  ILoginUserDTO,
  IConnectedAccount,
};
```

---

## Handling Edge Cases

### 1. Username Conflicts

OAuth users might not have usernames. Handle this:

```typescript
// In UserService
async createUser(dto: IUserCreateDTO): Promise<IUserDoc> {
  // Check if username already exists
  let username = dto.username;
  let attempts = 0;

  while (await this.userRepository.findByUsername(username)) {
    attempts++;
    username = `${dto.username}${attempts}`;

    if (attempts > 10) {
      username = `user_${Date.now().toString(36)}`;
      break;
    }
  }

  return this.userRepository.create({
    ...dto,
    username,
  });
}
```

### 2. Email Changes

When a user changes their primary email in Clerk:

```typescript
// In UserService
async updateUserFromClerk(dto: IUserUpdateDTO): Promise<void> {
  const user = await this.userRepository.findByClerkId(dto.clerkId);

  if (!user) {
    // User doesn't exist in DB - might need to create
    console.warn(`User ${dto.clerkId} not found for update`);
    return;
  }

  // Check for email conflicts before updating
  if (dto.email && dto.email !== user.email) {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser && existingUser.clerkId !== dto.clerkId) {
      console.error(`Email ${dto.email} already in use by another user`);
      return;
    }
  }

  await this.userRepository.updateByClerkId(dto.clerkId, dto);
}
```

### 3. Account Linking/Unlinking

When users connect additional OAuth providers:

```typescript
// user.updated webhook captures this
case 'user.updated': {
  const parsed = this.transformer.transformUserUpdated(event.data);

  // This will update connectedAccounts array
  await this.userService.updateUserFromClerk(parsed);

  // Optionally: Track account linking events for analytics
  if (parsed.connectedAccounts?.length) {
    await this.analyticsService.trackAccountLinked(
      parsed.clerkId,
      parsed.connectedAccounts.map(a => a.provider)
    );
  }
}
```

### 4. Deleted OAuth Accounts

Handle when users remove OAuth connections:

```typescript
// Compare previous and current connected accounts
async syncConnectedAccounts(clerkId: string, newAccounts: ConnectedAccount[]) {
  const user = await this.userRepository.findByClerkId(clerkId);
  if (!user) return;

  const oldProviders = user.connectedAccounts.map(a => a.provider);
  const newProviders = newAccounts.map(a => a.provider);

  // Find removed providers
  const removed = oldProviders.filter(p => !newProviders.includes(p));

  // Find added providers
  const added = newProviders.filter(p => !oldProviders.includes(p));

  // Log for audit
  if (removed.length) {
    console.log(`User ${clerkId} unlinked: ${removed.join(', ')}`);
  }
  if (added.length) {
    console.log(`User ${clerkId} linked: ${added.join(', ')}`);
  }

  // Update user
  await this.userRepository.updateByClerkId(clerkId, {
    connectedAccounts: newAccounts,
  });
}
```

---

## Clerk Dashboard Configuration

### Enable OAuth Providers

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **User & Authentication** > **Social Connections**

### Google OAuth Setup

1. Enable **Google** in Clerk Social Connections
2. Configure in Google Cloud Console:
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `https://clerk.your-domain.com/v1/oauth_callback`
3. Add Client ID and Secret to Clerk

### GitHub OAuth Setup

1. Enable **GitHub** in Clerk Social Connections
2. Configure in GitHub Developer Settings:
   - Create new OAuth App
   - Add callback URL: `https://clerk.your-domain.com/v1/oauth_callback`
3. Add Client ID and Secret to Clerk

### Webhook Configuration

1. Navigate to **Webhooks** in Clerk Dashboard
2. Add endpoint: `https://your-api.com/users/webhook`
3. Select events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
   - `session.created`
4. Copy the **Signing Secret** to your `.env`:
   ```
   CLERK_WEBHOOK_SECRET=whsec_xxxxx
   ```

---

## Testing OAuth Flows

### Test User Creation via Google

```bash
# After user signs up with Google, check webhook received correct data
curl -X GET http://localhost:3000/users/me \
  -H "Authorization: Bearer <clerk_jwt>"

# Expected response includes:
{
  "clerkId": "user_2abc...",
  "email": "user@gmail.com",
  "authProvider": "google",
  "connectedAccounts": [
    {
      "provider": "google",
      "providerAccountId": "123456789",
      "email": "user@gmail.com",
      "avatarUrl": "https://lh3.googleusercontent.com/..."
    }
  ]
}
```

### Test Account Linking

1. Sign in with email/password
2. Link GitHub account in Clerk's user portal
3. Verify `user.updated` webhook fires
4. Check `connectedAccounts` array updated

### Webhook Testing with Clerk CLI

```bash
# Install Clerk CLI
npm install -g @clerk/clerk-cli

# Forward webhooks to localhost
clerk listen --forward-to localhost:3000/users/webhook
```

---

## Security Considerations

### 1. Always Verify Webhook Signatures

Your existing `validateWebhook` middleware handles this correctly with Svix.

### 2. Handle Email Verification Status

```typescript
// Don't trust unverified emails for sensitive operations
if (!user.emailVerified) {
  throw new Error('Please verify your email first');
}
```

### 3. Rate Limit OAuth Callbacks

Though Clerk handles this, consider rate limiting your webhook endpoint:

```typescript
// In fastify route config
{
  config: {
    rateLimit: {
      max: 100,
      timeWindow: '1 minute'
    }
  }
}
```

### 4. Audit OAuth Account Changes

```typescript
// Log all OAuth account modifications
async function logOAuthChange(userId: string, action: 'linked' | 'unlinked', provider: string) {
  await AuditLog.create({
    userId,
    action: `oauth_${action}`,
    metadata: { provider },
    timestamp: new Date(),
  });
}
```

---

## Migration Script

If you have existing users, run this migration:

```typescript
// scripts/migrate-oauth-fields.ts
import { User } from '../src/models/user.model';
import mongoose from 'mongoose';

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI!);

  // Add default values for new fields
  await User.updateMany(
    { authProvider: { $exists: false } },
    {
      $set: {
        authProvider: 'email',
        primaryAuthMethod: 'email',
        connectedAccounts: [],
        emailVerified: true, // Assume existing users are verified
      },
    }
  );

  console.log('Migration complete');
  await mongoose.disconnect();
}

migrate().catch(console.error);
```

---

## Summary of Changes

| File                                                       | Changes                                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/models/user.model.ts`                                 | Add `authProvider`, `connectedAccounts`, `primaryAuthMethod`, `emailVerified` fields |
| `src/features/user/types/user.types.ts`                    | Add `AuthProvider`, `ConnectedAccount` types                                         |
| `src/dto/user.dto.ts`                                      | Update `UserCreateDTO`, add `UserUpdateDTO`                                          |
| `src/features/user/builders/webhook.transformer.ts`        | Add OAuth extraction logic                                                           |
| `src/features/user/controllers/user.webhook.controller.ts` | Handle `user.updated`, `user.deleted` events                                         |
| `src/features/user/services/user.service.ts`               | Add `updateUserFromClerk`, `handleUserDeleted` methods                               |

---

## Quick Start Checklist

- [ ] Update User model with OAuth fields
- [ ] Update types and DTOs
- [ ] Update webhook transformer
- [ ] Update webhook controller for new events
- [ ] Enable Google OAuth in Clerk Dashboard
- [ ] Enable GitHub OAuth in Clerk Dashboard
- [ ] Configure webhook events in Clerk
- [ ] Run migration for existing users
- [ ] Test OAuth signup flow
- [ ] Test account linking flow
- [ ] Verify webhook signature validation works
