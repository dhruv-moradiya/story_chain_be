# 🔓 Chapter Unlock Using Coins — API Design & Security Guide

> **Project Context:** StoryChain Backend · Fastify + MongoDB + Mongoose + tsyringe DI
>
> This document covers **every API endpoint**, **database operations**, **edge cases**, and **security hardening** needed to let a user spend coins to unlock a paid chapter.

---

## Current State Recap

| Model                | Purpose                                                              | Already Exists? |
| -------------------- | -------------------------------------------------------------------- | --------------- |
| `Wallet`             | Personal coin balance per user — spendable + lifetime stats          | ✅              |
| `CoinTransaction`    | Append-only ledger of every coin movement (has `storySlug` field)    | ✅              |
| `ChapterUnlock`      | Records which user unlocked which chapter                            | ✅              |
| `Chapter`            | Has `coinPrice` field (0 = free, 7 = paid)                           | ✅              |
| `PlatformCoinConfig` | `earningDistribution` — platform % vs collaborator % + role shares   | ✅              |
| `StoryEarningsPool`  | **[NEW]** Per-story escrow — holds undistributed coins for a story   | ❌ needs create |

The `FREE_CHAPTERS_LIMIT = 2` and `CHAPTER_PRICE.PAID = 7` are already defined in [`chapter-enum.ts`](file:///Users/user/Desktop/dhruv/story_chain_be/src/features/chapter/types/chapter-enum.ts).

---

## APIs Required

### 1. `POST /chapters/:chapterSlug/unlock`

> **The core unlock endpoint.** The single action a user triggers to spend coins and gain access to a paid chapter.

**Request:**

```typescript
// No body needed — userId comes from Clerk auth, chapterSlug from URL param
HEADERS: Authorization: Bearer <clerk-token>
PARAMS:  chapterSlug: string
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "chapterSlug": "the-dark-forest-abc123",
    "coinsPaid": 7,
    "unlockedAt": "2026-06-29T06:07:00.000Z",
    "walletBalance": 43
  }
}
```

**What it must do internally (all inside a MongoDB session/transaction):**

```
1. Fetch chapter by slug → verify it exists + is PUBLISHED
2. Check chapter.coinPrice > 0 (it's actually a paid chapter)
3. Check ChapterUnlock collection → user has NOT already unlocked it
4. Check user is NOT the chapter author (author reads own chapter free)
5. Fetch wallet → balance >= coinPrice
6. Debit wallet atomically (using $max to prevent negative balance)
7. Insert CoinTransaction { type: "chapter_unlock", direction: "debit", storySlug }
8. Insert ChapterUnlock { userId, chapterSlug, coinsPaid, transactionId }
9. Calculate platform fee: floor(coinPrice × platformFeePercent)
10. Calculate story pool credit: coinPrice − platformFee
11. Credit StoryEarningsPool { storySlug } with the pool amount ($inc balance)
12. Insert CoinTransaction { type: "story_pool_credit", direction: "credit", storySlug }
13. Return success
```

> [!IMPORTANT]
> Steps 6–12 **MUST** run inside a single MongoDB session (`startSession() + withTransaction()`). The reader's wallet is debited and the story pool is credited atomically — coins never vanish or duplicate.

> [!NOTE]
> **Why pool first, not direct credit?**
> The story owner may have **multiple stories**. If coins went directly to their personal `Wallet`, there is no way to know "this 6-coin credit belongs to Story A" vs "Story B". The `StoryEarningsPool` acts as a **per-story escrow** that keeps funds isolated until the owner consciously distributes them.

---

### 2. `GET /chapters/:chapterSlug/unlock-status`

> Lightweight check — called before rendering a chapter to decide whether to show content or a paywall.

**Response:**

```json
{
  "isLocked": true,
  "coinPrice": 7,
  "walletBalance": 43,
  "isOwner": false,
  "isFreeChapter": false
}
```

**Logic:**

- `coinPrice === 0` → `isFreeChapter: true`, `isLocked: false`
- `userId === chapter.authorId` → `isOwner: true`, `isLocked: false`
- `ChapterUnlock.exists({ userId, chapterSlug })` → `isLocked: false`
- Otherwise → `isLocked: true`

---

### 3. `GET /users/me/unlocked-chapters?storySlug=:storySlug`

> Returns all chapters the current user has already unlocked in a story. Used to decorate the chapter tree UI with unlock badges.

**Response:**

```json
{
  "unlockedChapterSlugs": ["chapter-slug-1", "chapter-slug-2"]
}
```

**Query:**

```typescript
ChapterUnlock.find({ userId, storySlug }, { chapterSlug: 1 }).lean();
// Uses index: { userId: 1, storySlug: 1 } ✅ already defined on model
```

---

### 4. `GET /chapters/:chapterSlug` _(Modify existing)_

> When serving chapter content, the read service must **gate the `content` field** behind the unlock check.

**Current behavior:** Returns full content always.  
**New behavior:**

```typescript
if (chapter.coinPrice > 0) {
  const isOwner = chapter.authorId === userId;
  const isUnlocked = await ChapterUnlockRepo.exists({ userId, chapterSlug });

  if (!isOwner && !isUnlocked) {
    // Return chapter metadata (title, stats) but strip content
    return { ...chapter, content: null, isLocked: true };
  }
}
```

---

## Edge Cases to Handle

### 💰 Coin & Balance Edge Cases

| #    | Edge Case                                     | How to Handle                                                                                                                                              |
| ---- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EC-1 | **Insufficient balance**                      | Check `wallet.balance >= chapter.coinPrice` before debiting. Return `402 Payment Required` with `{ error: "INSUFFICIENT_COINS", required: 7, current: 3 }` |
| EC-2 | **Race condition: two requests at same time** | Use `findOneAndUpdate` with `{ balance: { $gte: coinPrice } }` as a condition. If update returns null → reject. Never use `find → check → update`.         |
| EC-3 | **Wallet doesn't exist**                      | `WalletRepository.debitCoins` already uses `upsert: true`, but balance will be 0 → insufficient. Return `402`.                                             |
| EC-4 | **coinPrice changed after user saw paywall**  | Read `coinPrice` fresh from DB at unlock time. Never trust the price passed from the client.                                                               |

---

### 🔁 Duplicate / Re-Unlock Edge Cases

| #    | Edge Case                                            | How to Handle                                                                                                                                                               |
| ---- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EC-5 | **User tries to unlock an already-unlocked chapter** | `ChapterUnlock` has a unique index on `{ userId, chapterSlug }`. Check with `.exists()` BEFORE the transaction, return `409 Conflict` with `{ error: "ALREADY_UNLOCKED" }`. |
| EC-6 | **Chapter author tries to unlock their own chapter** | Check `chapter.authorId === userId` → return `400 Bad Request` with `{ error: "AUTHOR_READS_FREE" }`.                                                                       |
| EC-7 | **Chapter is free (coinPrice === 0)**                | Return `400 Bad Request` with `{ error: "CHAPTER_IS_FREE" }`. No coins should be spent.                                                                                     |

---

### 📖 Chapter State Edge Cases

| #     | Edge Case                                        | How to Handle                                                                                                |
| ----- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| EC-8  | **Chapter does not exist**                       | Return `404 Not Found`.                                                                                      |
| EC-9  | **Chapter is in DRAFT or PENDING_REVIEW status** | Only `PUBLISHED` chapters can be unlocked. Return `403 Forbidden` with `{ error: "CHAPTER_NOT_PUBLISHED" }`. |
| EC-10 | **Chapter is flagged/moderated**                 | If `isFlagged: true`, block unlock. Return `403 Forbidden`.                                                  |
| EC-11 | **Story has monetization disabled**              | If `story.settings.monetizationEnabled === false`, all chapters are free. Return `400 Bad Request`.          |

---

### ⚛️ Transaction / Atomicity Edge Cases

| #     | Edge Case                                         | How to Handle                                                                                      |
| ----- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| EC-12 | **DB crash mid-transaction**                      | Use `session.withTransaction()` — MongoDB auto-rolls back on failure.                              |
| EC-13 | **Author wallet missing when crediting earnings** | `creditCoins` uses `upsert: true`, so it auto-creates the wallet. ✅ Already handled.              |
| EC-14 | **Author and reader are the same**                | Already handled by EC-6 — author reads free, so credit never triggers for self-reads.              |
| EC-15 | **Platform fee calculation rounding**             | Use `Math.floor()` for platform fee, give remainder to author. Never lose coins to floating point. |

---

### 🛡️ Security Edge Cases

| #     | Edge Case                                             | How to Handle                                                                                        |
| ----- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| EC-16 | **Client sends a custom `coinPrice` in request body** | **Never** accept price from client. Always read from `chapter.coinPrice` in DB.                      |
| EC-17 | **Replay attacks — same request sent twice**          | Unique index on `ChapterUnlock { userId, chapterSlug }` prevents double-spend at DB level.           |
| EC-18 | **Rate limiting unlock endpoint**                     | Add per-user rate limit (e.g., max 20 unlock attempts/min) to prevent abuse.                         |
| EC-19 | **User ID spoofing**                                  | Always extract `userId` from Clerk token (`request.auth.userId`), never from request body or params. |
| EC-20 | **ChapterSlug injection / path traversal**            | Validate `chapterSlug` with Zod — `z.string().regex(/^[a-z0-9-]+$/)`.                                |

---

## How to Make It Secure — System Design

### 🔐 Layer 1: Authentication

```
Every unlock request must pass through Clerk auth middleware.
userId is ALWAYS extracted from the verified JWT, never from client input.
```

### 🔐 Layer 2: Server-Side Price Authority

```typescript
// ✅ CORRECT — price fetched from DB
const chapter = await ChapterRepo.findBySlug(chapterSlug);
const priceToCharge = chapter.coinPrice;

// ❌ WRONG — never trust client
const priceToCharge = req.body.coinPrice;
```

### 🔐 Layer 3: Atomic Double-Spend Prevention

Use MongoDB's `$max` trick (already in `WalletRepository.debitCoins`) to prevent balance going below zero even under concurrent requests:

```typescript
// This is already implemented in wallet.repository.ts ✅
balance: {
  $max: [0, { $subtract: ['$balance', amount] }];
}
// Then check: if (wallet.balance === 0 && amount > 0) → debit failed
```

### 🔐 Layer 4: Idempotency at the DB Level

```
Unique index: ChapterUnlock { userId: 1, chapterSlug: 1 }
→ Even if two requests slip through simultaneously, only one will succeed.
→ Second request gets a duplicate key error → respond 409.
```

### 🔐 Layer 5: Transaction Scope

```typescript
const session = await mongoose.startSession();
await session.withTransaction(async () => {
  // 1. debitCoins
  // 2. create CoinTransaction (debit)
  // 3. create ChapterUnlock
  // 4. creditCoins (author)
  // 5. create CoinTransaction (credit)
});
// If anything throws → entire transaction rolls back automatically
```

### 🔐 Layer 6: Append-Only Ledger

```
CoinTransaction is append-only — never UPDATE or DELETE records.
This gives you a full audit trail for every coin movement.
balanceBefore + balanceAfter snapshots stored on each row.
```

### 🔐 Layer 7: Rate Limiting

```typescript
// In Fastify route config
{
  config: {
    rateLimit: {
      max: 20,       // max 20 unlock requests
      timeWindow: 60_000  // per 60 seconds per user
    }
  }
}
```

---

## Database Operations Summary

### Phase 1 — Chapter Unlock (Atomic Transaction)

| Operation                  | Collection           | Type               | Notes                                                         |
| -------------------------- | -------------------- | ------------------ | ------------------------------------------------------------- |
| Read chapter               | `Chapter`            | `findOne`          | Get `coinPrice`, `authorId`, `status`, `storySlug`            |
| Check unlock exists        | `ChapterUnlock`      | `exists`           | Early exit if already unlocked                                |
| Debit reader wallet        | `Wallet`             | `findOneAndUpdate` | Atomic with `$max` pipeline stage — prevents negative balance |
| Insert debit tx            | `CoinTransaction`    | `insertOne`        | `type: chapter_unlock`, `direction: debit`, + `storySlug`     |
| Insert unlock record       | `ChapterUnlock`      | `insertOne`        | Links to transactionId                                        |
| Credit story earnings pool | `StoryEarningsPool`  | `findOneAndUpdate` | `$inc balance` + `$inc totalReceived`, upsert                 |
| Insert pool credit tx      | `CoinTransaction`    | `insertOne`        | `type: story_pool_credit`, `direction: credit`, + `storySlug` |

### Phase 2 — Owner Distribution (Atomic Transaction)

| Operation                    | Collection           | Type               | Notes                                                        |
| ---------------------------- | -------------------- | ------------------ | ------------------------------------------------------------ |
| Read story pool              | `StoryEarningsPool`  | `findOne`          | Check balance, verify `storyOwnerId === userId`              |
| Validate collaborators       | `StoryCollaborator`  | `find`             | All recipients must have `status: accepted`                  |
| Credit each collaborator     | `Wallet`             | `findOneAndUpdate` | One upsert per recipient — `$inc balance + totalEarned`      |
| Insert payout tx (×N)        | `CoinTransaction`    | `insertMany`       | `type: collaborator_payout`, `direction: credit`, `storySlug`|
| Debit story pool             | `StoryEarningsPool`  | `findOneAndUpdate` | `$inc balance: -total`, `$inc totalDistributed: +total`      |

---

## Earning Distribution — Two-Phase Model

### The Core Problem: Multi-Story Wallet Ambiguity

A user can be the **owner of Story A** and a **co_author of Story B** simultaneously. If chapter-unlock coins go directly into their personal `Wallet`, the wallet balance becomes a meaningless mix:

```
User "Alice" wallet balance: 120 coins
  ↑ 60 coins from Story A unlocks
  ↑ 40 coins from Story B unlocks
  ↑ 20 coins from daily rewards
  = Impossible to distribute per-story fairly
```

**Solution: Story Earnings Pool (Escrow Model)**

Coins from chapter unlocks **never go directly into any personal wallet**. Instead, they flow into a **per-story escrow** called `StoryEarningsPool`. The story owner then decides when and how to distribute from this pool to collaborators.

---

### Phase 1 — At Chapter Unlock Time

From `PlatformCoinConfig.earningDistribution`:

```
platformFeePercent  = 20%  (default)
collaboratorPercent = 80%  (default)

For a 7-coin chapter unlock:
  Platform cut:   floor(7 × 0.20) = 1 coin   → platform revenue
  Pool credit:    7 − 1            = 6 coins  → StoryEarningsPool[storySlug]
```

> [!TIP]
> Always use `coinPrice − platformFee` (subtraction, not multiplication) to give the remainder to the pool. This prevents coin loss from rounding.

**New Model Required: `StoryEarningsPool`**

```typescript
// NEW model: src/models/storyEarningsPool.model.ts
{
  storySlug: string;          // unique — one pool per story
  storyOwnerId: string;       // ref: User (the story.creatorId)

  /** Coins sitting in escrow — available to distribute */
  balance: number;            // min: 0

  /** Running lifetime stats — append-only */
  totalReceived: number;      // all coins ever credited from unlocks
  totalDistributed: number;   // all coins ever paid out to collaborators

  updatedAt: Date;
  createdAt: Date;
}
// Unique index: { storySlug: 1 }
// Query index:  { storyOwnerId: 1 }  ← "all pools for this owner"
```

**Why `storyOwnerId` on the pool?**
Lets you answer "what is the total pending balance across all my stories?" with a single `aggregate` query — no need to join through `Story`.

---

### Phase 2 — Owner-Triggered Distribution

> **This is a separate, intentional action by the story owner — not automatic.**

#### New API: `POST /stories/:storySlug/distribute-earnings`

**Who can call it:** Only the story `owner` (role check via `StoryCollaborator`).

**Request Body:**
```json
{
  "distribution": [
    { "userId": "user_abc", "role": "co_author",   "coins": 20 },
    { "userId": "user_def", "role": "moderator",   "coins": 10 },
    { "userId": "user_ghi", "role": "reviewer",    "coins": 10 },
    { "userId": "user_jkl", "role": "contributor", "coins": 5  }
  ]
}
```
> The owner decides **exact coin amounts**. The platform provides **suggested splits** via `PlatformCoinConfig.earningDistribution.roleShares` but the owner is not forced to follow them.

**What it must do internally (inside a MongoDB transaction):**

```
1. Verify caller is the story OWNER
2. Validate sum(distribution.coins) <= StoryEarningsPool.balance
3. Validate all userIds are ACCEPTED collaborators of this story
4. For each recipient in distribution:
   a. creditCoins(userId, coins) → Wallet
   b. Insert CoinTransaction { type: "collaborator_payout",
                               direction: "credit",
                               storySlug,
                               note: "Distributed by story owner" }
5. $inc StoryEarningsPool.balance by -totalDistributed
6. $inc StoryEarningsPool.totalDistributed by +totalDistributed
7. Return { distributed: [...], remainingPoolBalance: number }
```

**Suggested Split UI (frontend guidance):**

From `PlatformCoinConfig.earningDistribution.roleShares`:

| Role          | Default Share % | Example (60 pool coins) |
|---------------|----------------|-------------------------|
| `owner`       | 50%            | 30 coins                |
| `co_author`   | 25%            | 15 coins                |
| `moderator`   | 10%            | 6 coins                 |
| `reviewer`    | 10%            | 6 coins                 |
| `contributor` | 5%             | 3 coins                 |

> The owner can override these percentages — the config is a **suggestion**, not a hard rule.

---

### Per-Story Tracking for Users with Multiple Stories

**Problem:** "Alice owns Story A and Story B. How do we show her earnings broken down by story?"

**Solution — Two layers:**

| Layer | How | Used For |
|---|---|---|
| **Pool balance** | `StoryEarningsPool.find({ storyOwnerId: aliceId })` | Pending (undistributed) coins per story |
| **Received history** | `CoinTransaction.find({ userId: aliceId, type: 'collaborator_payout', storySlug })` | Already-distributed coins received as collaborator |

```typescript
// "Show me all undistributed earnings per story for the current owner"
StoryEarningsPool.find({ storyOwnerId: userId })
  .select('storySlug balance totalReceived totalDistributed')
  .lean();
// Result: [{ storySlug: 'story-a', balance: 60 }, { storySlug: 'story-b', balance: 12 }]

// "Show me coins I personally received from Story B as a co-author"
CoinTransaction.find({
  userId,
  type: 'collaborator_payout',
  storySlug: 'story-b'
}).lean();
// Uses index: { userId: 1, createdAt: -1 } + filter on storySlug ✅
```

> [!NOTE]
> The `storySlug` field already exists on `CoinTransaction` — no schema change needed. It must be populated on every `collaborator_payout` insert.

---

### Additional Edge Cases for Distribution

| # | Edge Case | How to Handle |
|---|---|---|
| ED-1 | **Owner tries to distribute more than pool balance** | Validate `sum(coins) <= pool.balance` before transaction. Return `400 Bad Request`. |
| ED-2 | **Distributing to a removed/pending collaborator** | Validate each `userId` has `StoryCollaborator.status === 'accepted'`. Return `400`. |
| ED-3 | **Owner distributes to themselves** | Allowed — owner has the `owner` role and an `accepted` collaborator record. |
| ED-4 | **Pool is empty when owner tries to distribute** | Return `400 Bad Request` with `{ error: "EMPTY_POOL", balance: 0 }`. |
| ED-5 | **Collaborator wallet missing when paying out** | `creditCoins` uses `upsert: true` — auto-creates wallet. ✅ Already handled. |
| ED-6 | **Story has no collaborators (solo story)** | Owner can distribute entirely to themselves — no restriction. |
| ED-7 | **Partial distribution (keep some in pool)** | Fully supported — `sum(coins)` can be less than pool balance. Remainder stays in pool. |
| ED-8 | **Coins arrive in pool while distribution is in-flight** | Transaction only touches `pool.balance -= totalDistributed`. New credits use `$inc` on the same field — MongoDB handles concurrent `$inc` safely. |

---

## Suggested Feature Folder Structure

```
src/features/chapterUnlock/
├── controllers/
│   └── chapterUnlock.controller.ts  # POST /unlock, GET /unlock-status
├── repositories/
│   └── chapterUnlock.repository.ts  # DB queries for ChapterUnlock model
├── services/
│   └── chapterUnlock.service.ts     # Business logic + transaction orchestration
├── routes/
│   └── chapterUnlock.routes.ts      # Fastify route registration
├── schema/
│   └── chapterUnlock.schema.ts      # Zod request/response schemas
└── types/
    └── chapterUnlock.types.ts       # ✅ Already exists
```

---

## Flow Diagram

```
User clicks "Unlock Chapter (7 coins)"
         │
         ▼
POST /chapters/:chapterSlug/unlock
         │
         ├─► [Auth] Clerk middleware → extract userId
         │
         ├─► [Validate] chapterSlug format (Zod)
         │
         ├─► [Fetch] chapter from DB
         │         └── 404 if not found
         │         └── 400 if coinPrice === 0 (free chapter)
         │         └── 403 if status !== PUBLISHED
         │         └── 400 if authorId === userId (author reads free)
         │
         ├─► [Check] ChapterUnlock.exists(userId, chapterSlug)
         │         └── 409 if already unlocked
         │
         ├─► [Check] wallet.balance >= coinPrice
         │         └── 402 if insufficient
         │
         ├─► [Transaction START]
         │         ├── debitCoins(readerId, coinPrice)        ← reader wallet
         │         ├── createCoinTransaction(chapter_unlock, debit, storySlug)
         │         ├── createChapterUnlock(userId, chapterSlug)
         │         ├── calc platformFee = floor(coinPrice × 20%)
         │         ├── calc poolCredit  = coinPrice − platformFee
         │         ├── StoryEarningsPool.$inc(balance, +poolCredit)  ← story escrow
         │         └── createCoinTransaction(story_pool_credit, credit, storySlug)
         └─► [Transaction END]
                   └── 200 { unlockedAt, walletBalance }

─────── Later: Owner-Triggered Distribution ──────────

Story Owner calls POST /stories/:storySlug/distribute-earnings
         │
         ├─► [Auth] Must be story OWNER role
         ├─► [Validate] sum(coins) <= StoryEarningsPool.balance
         ├─► [Validate] all recipients are accepted collaborators
         ├─► [Transaction START]
         │         ├── For each recipient:
         │         │     ├── creditCoins(recipientId, coins)  ← personal wallet
         │         │     └── createCoinTransaction(collaborator_payout, credit, storySlug)
         │         └── StoryEarningsPool.$inc(balance, -totalDistributed)
         └─► [Transaction END]
                   └── 200 { distributed: [...], remainingPoolBalance }
```

---

> [!NOTE]
> **What is NOT in scope for this feature:**
>
> - Refunds / unlock reversals (once unlocked, it's permanent)
> - Gifting unlocks to other users
> - Bulk chapter unlocks (unlock entire story at once)
>
> These can be added as separate features later.

---

## 🏛️ PlatformCoinConfig — Why It Exists & How Platform Earnings Work

### Why Do We Need `PlatformCoinConfig`?

Without this model, every percentage, every coin amount, and every rule would be **hardcoded** in the application source code. That means:

| Problem (without config) | With `PlatformCoinConfig` |
|---|---|
| Platform fee is 20% — want to change to 15%? **Need a code deploy** | Admin updates one DB document — live instantly |
| Want to run a "double daily reward" campaign? **Need a code deploy** | Toggle `dailyReward.coinsPerDay` from 5 → 10 |
| Want to pause withdrawals during maintenance? **Need a code deploy** | Set `withdrawal.isWithdrawalEnabled = false` |
| Role share percentages need rebalancing? **Need a code deploy** | Edit `roleShares` directly in admin dashboard |

> [!IMPORTANT]
> `PlatformCoinConfig` is a **singleton** — there is exactly **one document** in the entire collection, enforced by:
> ```typescript
> _singleton: { type: String, default: 'config', unique: true }
> ```
> Every read/write uses `findOne({})` or `findOneAndUpdate({})`. There is never a list of configs.

---

### What Each Section Controls

```typescript
// src/models/platformCoinConfig.model.ts (full schema breakdown)
{
  // ── 1. REFERRAL REWARDS ────────────────────────────────────────────────
  referral: {
    referrerBonusCoins: 50,     // Person who invited gets 50 coins
    referredBonusCoins: 25,     // New user who signed up gets 25 coins
    isActive: true,             // Kill-switch: disable referral program instantly
    rewardExpiryDays: 30,       // Coins expire if new user doesn't meet eligibility in 30 days
    eligibilityRules: string,   // Human-readable rules text shown in UI
  },

  // ── 2. DAILY REWARD ────────────────────────────────────────────────────
  dailyReward: {
    coinsPerDay: 5,             // Base daily login reward
    streakBonus: [              // Extra coins for consecutive login streaks
      { streakDays: 7,  bonusCoins: 10 },   // 7-day streak → +10 bonus
      { streakDays: 30, bonusCoins: 50 },   // 30-day streak → +50 bonus
    ],
    isActive: true,             // Kill-switch: disable daily rewards globally
  },

  // ── 3. EARNING DISTRIBUTION ────────────────────────────────────────────
  earningDistribution: {
    platformFeePercent: 20,     // Platform keeps 20% of every chapter unlock
    collaboratorPercent: 80,    // 80% goes to the StoryEarningsPool
    roleShares: {               // SUGGESTED split within the 80% (owner decides actual split)
      owner: 50,
      co_author: 25,
      moderator: 10,
      reviewer: 10,
      contributor: 5,
    },
  },

  // ── 4. WITHDRAWAL SETTINGS ─────────────────────────────────────────────
  withdrawal: {
    minWithdrawalCoins: 500,    // User needs at least 500 coins to withdraw
    processingFeeCoin: 0,       // Platform charges 0 coins processing fee (currently)
    isWithdrawalEnabled: true,  // Master switch to pause all withdrawals
  },
}
```

---

### How the Platform Manages Its Own Coin Earnings

#### The Core Question
> When a reader pays 7 coins and 1 coin (20%) is the platform's cut — **where do those coins actually go?**

#### Answer: Platform Fee → `CoinTransaction` with a system sentinel

The platform does **not** have its own user account or wallet. Instead, every platform fee is recorded as a `CoinTransaction` row tagged with a special **system user ID** and `type: 'platform_fee'`. This gives a complete, queryable audit trail of all platform earnings.

```typescript
// Inside the unlock transaction (Step added alongside StoryEarningsPool credit):

const platformFee = Math.floor(coinPrice * (platformFeePercent / 100)); // = 1 coin

// Record the platform's cut as an audit entry
await CoinTransaction.create({
  userId: PLATFORM_SYSTEM_USER_ID,  // e.g. 'system_platform' — a sentinel string constant
  type: 'platform_fee',
  direction: 'credit',
  amount: platformFee,
  balanceBefore: 0,   // platform has no real wallet — these are accounting entries only
  balanceAfter: 0,
  chapterSlug,
  storySlug,
  note: `Platform fee from chapter unlock`,
}, { session });
```

> [!NOTE]
> The `PLATFORM_SYSTEM_USER_ID` is just a **sentinel string constant** (e.g. `'system_platform'`). It is never a real user in the `User` collection. It acts as a "account name" for grouping all platform-fee rows in `CoinTransaction` for analytics queries.

---

#### Platform Revenue — Two Different Things

> [!IMPORTANT]
> There is a critical distinction between **coin earnings** and **INR revenue**:

| Type | What it is | Where tracked |
|---|---|---|
| **INR Revenue** | Real money paid by users to buy coin bundles via Razorpay | `CoinOrder.finalAmount` (already exists ✅) |
| **Coin Earnings** | The platform's share (20%) of coins from chapter unlocks | `CoinTransaction { type: 'platform_fee', userId: PLATFORM_SYSTEM_USER_ID }` |

**These are NOT the same thing.** The platform's coin earnings are a *virtual accounting* of "which fraction of users' coin spend belongs to us." The actual cash revenue from users buying those coins is already captured in `CoinOrder`.

```
Example lifecycle:
1. User buys 100 coins for ₹49  →  CoinOrder { finalAmount: 49, status: 'paid' }  ← Real INR
2. User spends 7 coins to unlock  →  Wallet debit 7
3. Platform gets 1 coin (20%)   →  CoinTransaction { type: 'platform_fee', amount: 1 }  ← Virtual accounting
4. Story pool gets 6 coins (80%) →  StoryEarningsPool.$inc(+6)

Admin dashboard query for platform INR revenue:
  CoinOrder.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$finalAmount' } } }])

Admin dashboard query for platform coin earnings (unlock revenue):
  CoinTransaction.aggregate([{ $match: { type: 'platform_fee' } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
```

---

### Admin API to Update the Config

```
PATCH /admin/platform-config
```

**Who can call it:** Only platform admins (via `PlatformRole` — admin RBAC).

**Example — Change platform fee to 15%:**
```json
{
  "earningDistribution": {
    "platformFeePercent": 15,
    "collaboratorPercent": 85
  }
}
```

**Example — Pause all withdrawals:**
```json
{
  "withdrawal": {
    "isWithdrawalEnabled": false
  }
}
```

**Implementation:**
```typescript
// Always use findOneAndUpdate on the singleton — never insert a new doc
PlatformCoinConfig.findOneAndUpdate(
  {},           // matches the one and only document
  { $set: flattenedUpdate, updatedBy: adminUserId },
  { new: true, upsert: true }  // upsert: true creates it on first admin call
);
```

> [!WARNING]
> Changing `platformFeePercent` takes effect **immediately** on all future unlocks. Existing `StoryEarningsPool` balances are NOT retroactively recalculated. Always communicate fee changes to story owners in advance.

---

### What Breaks Without `PlatformCoinConfig`

| Scenario | Without Config | With Config |
|---|---|---|
| Chapter unlock fee calculation | `const fee = Math.floor(price * 0.20)` — hardcoded, needs redeploy to change | Read `config.earningDistribution.platformFeePercent` from DB at runtime |
| Daily reward payout | Hardcoded `5` coins — can't run promotional events | Toggle `config.dailyReward.coinsPerDay` from admin panel |
| Role share suggestions | Every new story would need custom logic | `config.earningDistribution.roleShares` drives the UI suggestion table |
| Withdrawal minimum | Hardcoded `500` — can't adjust for market conditions | Edit `config.withdrawal.minWithdrawalCoins` live |
| Referral program | Can't be turned off without a code deploy | `config.referral.isActive = false` — instant kill-switch |

> [!TIP]
> **Rule of thumb:** Any number in the coin economy that a business stakeholder might want to change without a developer — belongs in `PlatformCoinConfig`.

