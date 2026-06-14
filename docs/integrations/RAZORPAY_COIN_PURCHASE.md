# 💰 Razorpay Coin Purchase — Full Integration Guide

> **Platform:** StoryChain Backend (Fastify + MongoDB + BullMQ)  
> **Payment Gateway:** Razorpay (INR primary, USD planned)  
> **Last Updated:** June 2026

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Data Models](#2-data-models)
3. [The Complete Purchase Flow](#3-the-complete-purchase-flow)
4. [Security Design](#4-security-design)
5. [API Endpoints](#5-api-endpoints)
6. [Webhook Handling](#6-webhook-handling)
7. [Edge Cases & Error Handling](#7-edge-cases--error-handling)
8. [Coin Crediting Logic](#8-coin-crediting-logic)
9. [Idempotency & Duplicate Prevention](#9-idempotency--duplicate-prevention)
10. [Refunds](#10-refunds)
11. [Testing Checklist](#11-testing-checklist)
12. [Environment Variables](#12-environment-variables)

---

## 1. Overview & Architecture

### What is this system?

Users purchase **Coin Bundles** using real money (INR via Razorpay). After a successful payment, their **Wallet** is credited with the corresponding coins, and a **CoinTransaction** ledger entry is created.

### High-Level Flow

```
User selects Bundle
       │
       ▼
POST /coin-orders/create-order     ← Backend creates Razorpay Order + local CoinOrder (pending)
       │
       ▼
Razorpay Checkout (frontend)       ← User pays via UPI / Card / Netbanking
       │
       ├─── Payment Success ───────► POST /coin-orders/verify-payment (frontend → backend)
       │                                  │
       │                                  ▼
       │                            Verify HMAC Signature
       │                                  │
       │                                  ▼
       │                            Credit Wallet + Create CoinTransaction
       │
       └─── Webhook (async) ───────► POST /webhooks/razorpay
                                          │
                                          ▼
                                    Idempotent fallback credit (if frontend missed it)
```

### Involved Models

| Model             | Purpose                                                    |
| ----------------- | ---------------------------------------------------------- |
| `CoinBundle`      | The product being bought (price, coins, restrictions)      |
| `CoinOrder`       | A single purchase attempt — tracks Razorpay IDs and status |
| `Wallet`          | User's spendable coin balance                              |
| `CoinTransaction` | Immutable ledger of every credit/debit                     |
| `Coupon`          | Optional discount applied before order creation            |

---

## 2. Data Models

### 2.1 CoinBundle

Defines **what is being sold**.

```typescript
interface ICoinBundle {
  slug: string;
  name: string;
  bundleType: BundleType; // 'standard' | 'flash_sale' | 'first_purchase' | ...

  baseCoins: number; // Core coins
  bonusCoins: number; // Bonus coins on top
  totalCoins: number; // baseCoins + bonusCoins (computed)

  inrPrice: number; // !! In PAISE (₹100 = 10000 paise)
  usdPrice: number; // In cents

  isActive: boolean;
  isDeleted: boolean;
  startDate?: Date; // Bundle availability window
  endDate?: Date;
  startTime?: string; // HH:mm:ss — daily time window
  endTime?: string;

  restrictions: {
    type: 'unlimited' | 'one_time' | 'daily' | 'monthly' | 'lifetime';
    firstPurchaseOnly: boolean; // Welcome Pack — only for new buyers
    dailyLimit?: number;
    monthlyLimit?: number;
    lifetimeLimit?: number;
    perUserLimit?: number;
  };
}
```

> **⚠️ IMPORTANT**: `inrPrice` is stored in **paise** (smallest INR unit). Always pass this directly to Razorpay `amount` field — never convert inside the order creation call, conversion should happen before storing.

---

### 2.2 CoinOrder

Represents **one purchase attempt**. Created when the user clicks "Buy", updated when payment is confirmed.

```typescript
interface ICoinOrder {
  userId: string;
  bundleId: ID;

  baseCoins: number;
  bonusCoins: number;
  totalCoins: number;

  currency: 'INR' | 'USD';
  originalAmount: number; // In paise/cents
  discountAmount: number; // From coupon
  finalAmount: number; // originalAmount - discountAmount (sent to Razorpay)
  couponId?: ID;
  couponCode?: string;

  // Razorpay IDs
  razorpayOrderId: string; // "order_xxxxxxxx" — from Razorpay Orders API
  razorpayPaymentId?: string; // "pay_xxxxxxxx" — set after success
  razorpaySignature?: string; // HMAC-SHA256 signature for verification

  status: 'pending' | 'paid' | 'failed' | 'refunded';

  paidAt?: Date;
  failedAt?: Date;
  failureReason?: string;
}
```

---

### 2.3 Wallet

The user's coin balance. **Always updated atomically**.

```typescript
interface IWallet {
  userId: string;
  balance: number; // Current spendable coins
  totalEarned: number; // Lifetime coins credited (never decremented)
  totalSpent: number; // Lifetime coins spent
  totalWithdrawn: number; // Lifetime coins withdrawn
  pendingWithdrawal: number; // Coins locked in pending withdrawal
}
```

---

### 2.4 CoinTransaction (Ledger)

An **immutable audit trail** of every coin movement.

```typescript
interface ICoinTransaction {
  userId: string;
  type:
    | 'purchase'
    | 'chapter_earn'
    | 'referral_reward'
    | 'daily_reward'
    | 'admin_credit'
    | 'chapter_unlock'
    | 'withdrawal'
    | 'admin_debit';
  direction: 'credit' | 'debit';
  amount: number; // Always positive

  balanceBefore: number; // Wallet snapshot before this tx
  balanceAfter: number; // Wallet snapshot after this tx

  coinOrderId?: ID; // Set for 'purchase' type
  note?: string;
  metadata?: Record<string, unknown>;
}
```

---

## 3. The Complete Purchase Flow

### Step 1 — Frontend: User selects a Bundle

The frontend calls the public listing endpoint to display available bundles.

```
GET /api/v1/coin-bundles
```

Active, non-deleted, time-window-valid bundles are returned.

---

### Step 2 — Backend: Create Razorpay Order

**Endpoint:** `POST /api/v1/coin-orders`

**Request Body:**

```json
{
  "bundleSlug": "starter-pack",
  "currency": "INR",
  "couponCode": "WELCOME50" // optional
}
```

**What the backend does:**

```
1. Auth check — user must be logged in (Clerk JWT)
2. Fetch bundle by slug — must be active, not deleted, within time window
3. Validate bundle restrictions (see Section 7)
4. Apply coupon discount (if provided)
5. Call Razorpay Orders API:
   POST https://api.razorpay.com/v1/orders
   {
     "amount": <finalAmount in paise>,
     "currency": "INR",
     "receipt": "<coinOrderId>",
     "notes": { "userId": "...", "bundleSlug": "..." }
   }
6. Save CoinOrder to DB with status = "pending"
7. Return razorpayOrderId + amount + key_id to frontend
```

**Response:**

```json
{
  "success": true,
  "data": {
    "coinOrderId": "6657c...",
    "razorpayOrderId": "order_PQ9...",
    "amount": 49900,
    "currency": "INR",
    "razorpayKeyId": "rzp_live_..."
  }
}
```

---

### Step 3 — Frontend: Open Razorpay Checkout

```javascript
const options = {
  key: data.razorpayKeyId,
  amount: data.amount,
  currency: data.currency,
  order_id: data.razorpayOrderId,
  name: 'StoryChain',
  description: 'Coin Purchase',
  handler: async function (response) {
    // Payment successful — now verify on backend
    await verifyPayment({
      coinOrderId: data.coinOrderId,
      razorpayPaymentId: response.razorpay_payment_id,
      razorpayOrderId: response.razorpay_order_id,
      razorpaySignature: response.razorpay_signature,
    });
  },
  prefill: {
    name: user.displayName,
    email: user.email,
  },
  theme: { color: '#7C3AED' },
};

const rzp = new Razorpay(options);
rzp.open();
```

---

### Step 4 — Backend: Verify Payment & Credit Coins

**Endpoint:** `POST /api/v1/coin-orders/verify-payment`

**Request Body:**

```json
{
  "coinOrderId": "6657c...",
  "razorpayPaymentId": "pay_PQR...",
  "razorpayOrderId": "order_PQ9...",
  "razorpaySignature": "abc123..."
}
```

**What the backend does:**

```
1. Fetch CoinOrder by coinOrderId — must belong to authenticated user
2. Check CoinOrder status:
   - If already "paid" → return success (idempotent, no double credit)
   - If "failed"       → throw 400 (cannot retry a failed order)
3. Verify HMAC Signature:
   expectedSignature = HMAC-SHA256(
     key   = RAZORPAY_KEY_SECRET,
     data  = razorpayOrderId + "|" + razorpayPaymentId
   )
   if (expectedSignature !== razorpaySignature) → throw 400 INVALID_SIGNATURE
4. [DB Transaction] Atomically:
   a. Update CoinOrder: status = "paid", razorpayPaymentId, razorpaySignature, paidAt
   b. Upsert Wallet: balance += totalCoins, totalEarned += totalCoins
   c. Create CoinTransaction: type = "purchase", direction = "credit"
5. Return updated wallet balance
```

**Response:**

```json
{
  "success": true,
  "data": {
    "coinsAdded": 550,
    "newBalance": 1050,
    "transaction": {
      "id": "6657d...",
      "type": "purchase",
      "amount": 550,
      "direction": "credit"
    }
  }
}
```

---

### Step 5 — Webhook (Async Safety Net)

See [Section 6](#6-webhook-handling) for details.

---

## 4. Security Design

### 4.1 HMAC Signature Verification

This is the **most critical security step**. Never trust Razorpay callback data without verifying the signature.

```typescript
import crypto from 'crypto';

function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  secret: string
): boolean {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpaySignature));
}
```

> **Never** skip this step. A malicious actor could craft a fake `razorpayPaymentId` and steal coins without paying.

---

### 4.2 Webhook Signature Verification

For webhook events:

```typescript
function verifyWebhookSignature(
  rawBody: string,
  razorpaySignatureHeader: string,
  webhookSecret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(razorpaySignatureHeader)
  );
}
```

> **⚠️ IMPORTANT**: For webhook verification, use the **raw request body** (Buffer/string), NOT the parsed JSON. Fastify's body parser may alter whitespace/key order — always save `rawBody` from the original stream.

---

### 4.3 Authorization Checks

| Check                                                | Why                                            |
| ---------------------------------------------------- | ---------------------------------------------- |
| Clerk JWT on every request                           | Prevents unauthenticated access                |
| `coinOrder.userId === request.user.clerkId`          | User can only verify their own orders          |
| `coinOrder.status === 'pending'`                     | Prevents replaying already-processed orders    |
| `coinOrder.razorpayOrderId === body.razorpayOrderId` | Ensures the payment matches the specific order |

---

### 4.4 Secrets Management

```
RAZORPAY_KEY_ID      = rzp_live_xxxxx   # Public — safe to expose to frontend
RAZORPAY_KEY_SECRET  = xxxxx            # NEVER expose — only backend
RAZORPAY_WEBHOOK_SECRET = xxxxx         # Separate secret for webhook verification
```

- Store secrets in `.env` — **never commit to git**
- Use different keys for test (`rzp_test_`) and production (`rzp_live_`)
- Rotate secrets if compromised

---

## 5. API Endpoints

### Public Endpoints (No Auth)

| Method | Path                         | Description                          |
| ------ | ---------------------------- | ------------------------------------ |
| `GET`  | `/api/v1/coin-bundles`       | List all active, purchasable bundles |
| `GET`  | `/api/v1/coin-bundles/:slug` | Get a specific bundle details        |

### Protected Endpoints (Clerk JWT Required)

| Method | Path                                 | Description                              |
| ------ | ------------------------------------ | ---------------------------------------- |
| `POST` | `/api/v1/coin-orders`                | Create a new Razorpay order for a bundle |
| `POST` | `/api/v1/coin-orders/verify-payment` | Verify payment & credit coins            |
| `GET`  | `/api/v1/coin-orders`                | List user's purchase history             |
| `GET`  | `/api/v1/wallet`                     | Get user's current wallet balance        |
| `GET`  | `/api/v1/wallet/transactions`        | Get user's coin transaction history      |

### Internal / Webhook Endpoints (Secret Verified)

| Method | Path                        | Description               |
| ------ | --------------------------- | ------------------------- |
| `POST` | `/api/v1/webhooks/razorpay` | Razorpay webhook receiver |

### Admin Endpoints (Admin Role Required)

| Method   | Path                                      | Description                |
| -------- | ----------------------------------------- | -------------------------- |
| `POST`   | `/api/v1/admin/coin-bundles`              | Create a new bundle        |
| `PATCH`  | `/api/v1/admin/coin-bundles/:slug`        | Update bundle details      |
| `PATCH`  | `/api/v1/admin/coin-bundles/:slug/toggle` | Activate/deactivate bundle |
| `DELETE` | `/api/v1/admin/coin-bundles/:slug`        | Soft-delete bundle         |

---

## 6. Webhook Handling

Webhooks are the **safety net** — they ensure coins are credited even if the user closes the browser before `verify-payment` completes.

### Events to Handle

| Razorpay Event     | Action                                         |
| ------------------ | ---------------------------------------------- |
| `payment.captured` | Credit coins (if CoinOrder not already "paid") |
| `payment.failed`   | Mark CoinOrder as "failed", log reason         |
| `refund.created`   | Mark CoinOrder as "refunded", deduct coins     |

### Webhook Handler Logic

```typescript
async function handleRazorpayWebhook(rawBody: string, signature: string) {
  // 1. Verify signature using RAZORPAY_WEBHOOK_SECRET
  if (!verifyWebhookSignature(rawBody, signature, env.RAZORPAY_WEBHOOK_SECRET)) {
    throw ApiError.unauthorized('INVALID_SIGNATURE', 'Webhook signature mismatch');
  }

  const event = JSON.parse(rawBody);

  switch (event.event) {
    case 'payment.captured': {
      const payment = event.payload.payment.entity;
      const razorpayOrderId = payment.order_id;
      const razorpayPaymentId = payment.id;

      const coinOrder = await CoinOrderRepo.findByRazorpayOrderId(razorpayOrderId);
      if (!coinOrder) return; // Unknown order — ignore

      if (coinOrder.status === 'paid') return; // Already credited — idempotent

      // Credit coins exactly as in verify-payment
      await creditCoinsForOrder(coinOrder, razorpayPaymentId);
      break;
    }

    case 'payment.failed': {
      const payment = event.payload.payment.entity;
      await CoinOrderRepo.markFailed(payment.order_id, payment.error_description);
      break;
    }

    case 'refund.created': {
      const refund = event.payload.refund.entity;
      await handleRefund(refund.payment_id);
      break;
    }
  }
}
```

### Webhook Registration

In Razorpay Dashboard → Settings → Webhooks:

- **URL**: `https://your-api.com/api/v1/webhooks/razorpay`
- **Events**: `payment.captured`, `payment.failed`, `refund.created`
- **Secret**: Generate a strong random string → save as `RAZORPAY_WEBHOOK_SECRET`

---

## 7. Edge Cases & Error Handling

### 7.1 Bundle Validation at Order Creation

Before creating a Razorpay order, validate the bundle thoroughly:

```typescript
async function validateBundleForPurchase(bundle: ICoinBundle, userId: string) {
  // ── Existence & Visibility ────────────────────────────────────────
  if (!bundle.isActive) {
    throw ApiError.badRequest('BUNDLE_INACTIVE', 'This bundle is no longer available');
  }
  if (bundle.isDeleted) {
    throw ApiError.notFound('BUNDLE_NOT_FOUND', 'Bundle not found');
  }

  // ── Date Window ───────────────────────────────────────────────────
  const now = new Date();
  if (bundle.startDate && now < bundle.startDate) {
    throw ApiError.badRequest('BUNDLE_NOT_YET_AVAILABLE', 'Bundle sale has not started yet');
  }
  if (bundle.endDate && now > bundle.endDate) {
    throw ApiError.badRequest('BUNDLE_EXPIRED', 'Bundle sale has ended');
  }

  // ── Daily Time Window ─────────────────────────────────────────────
  if (bundle.startTime && bundle.endTime) {
    const currentTime = getCurrentTimeInTimezone(bundle.timezone);
    if (!isWithinTimeWindow(currentTime, bundle.startTime, bundle.endTime)) {
      throw ApiError.badRequest(
        'BUNDLE_OUTSIDE_TIME_WINDOW',
        `This bundle is only available between ${bundle.startTime} and ${bundle.endTime}`
      );
    }
  }

  // ── First Purchase Only (Welcome Pack) ────────────────────────────
  if (bundle.restrictions.firstPurchaseOnly) {
    const hasPreviousPurchase = await CoinOrderRepo.hasAnyPaidOrder(userId);
    if (hasPreviousPurchase) {
      throw ApiError.badRequest(
        'FIRST_PURCHASE_ONLY',
        'This bundle is only available for first-time buyers'
      );
    }
  }

  // ── Restriction Type Checks ───────────────────────────────────────
  switch (bundle.restrictions.type) {
    case 'one_time': {
      const bought = await CoinOrderRepo.countPaidOrdersForBundle(userId, bundle._id);
      if (bought > 0) {
        throw ApiError.badRequest('ALREADY_PURCHASED', 'You can only buy this bundle once');
      }
      break;
    }
    case 'daily': {
      const todayCount = await CoinOrderRepo.countPaidOrdersForBundleToday(userId, bundle._id);
      if (todayCount >= (bundle.restrictions.dailyLimit ?? 1)) {
        throw ApiError.badRequest(
          'DAILY_LIMIT_REACHED',
          "You have reached today's purchase limit for this bundle"
        );
      }
      break;
    }
    case 'monthly': {
      const monthCount = await CoinOrderRepo.countPaidOrdersForBundleThisMonth(userId, bundle._id);
      if (monthCount >= (bundle.restrictions.monthlyLimit ?? 1)) {
        throw ApiError.badRequest(
          'MONTHLY_LIMIT_REACHED',
          "You have reached this month's purchase limit for this bundle"
        );
      }
      break;
    }
    case 'lifetime': {
      const totalCount = await CoinOrderRepo.countAllPaidOrdersForBundle(userId, bundle._id);
      if (totalCount >= (bundle.restrictions.lifetimeLimit ?? 1)) {
        throw ApiError.badRequest(
          'LIFETIME_LIMIT_REACHED',
          'You have reached the lifetime purchase limit for this bundle'
        );
      }
      break;
    }
  }

  // ── Per-User Limit ────────────────────────────────────────────────
  if (bundle.restrictions.perUserLimit !== undefined) {
    const totalCount = await CoinOrderRepo.countAllPaidOrdersForBundle(userId, bundle._id);
    if (totalCount >= bundle.restrictions.perUserLimit) {
      throw ApiError.badRequest(
        'PER_USER_LIMIT_REACHED',
        'You have reached the maximum purchase limit for this bundle'
      );
    }
  }
}
```

---

### 7.2 Edge Case Matrix

| Scenario                                                       | Handling                                                                       |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| User pays but closes browser before `verify-payment`           | Webhook `payment.captured` credits coins                                       |
| `verify-payment` called twice with same IDs                    | Idempotency check: if `status === 'paid'`, return success without re-crediting |
| Razorpay signature is invalid                                  | Throw `400 INVALID_SIGNATURE`, never credit coins                              |
| Bundle becomes inactive after order created but before payment | Allow — order was valid at creation time                                       |
| Bundle price changes after order created                       | Irrelevant — amount is locked in Razorpay order at creation                    |
| User is deleted between order creation and payment             | Check user exists in `verify-payment`, fail gracefully                         |
| Razorpay is down during order creation                         | Propagate error to frontend, no CoinOrder saved                                |
| DB write fails after signature verification                    | Retry via webhook; log error with order ID                                     |
| Concurrent `verify-payment` requests (race condition)          | Use DB-level atomic update with `status: 'pending'` filter                     |
| Webhook received before `verify-payment`                       | Both check status; whichever arrives first credits coins                       |
| Zero-amount order (100% coupon discount)                       | Handle separately — no Razorpay order needed, credit directly                  |
| Coupon expires between validation and order creation           | Validate coupon at order creation time                                         |
| User deletes account after paying but before verification      | Log orphaned payment; admin can manually credit/refund                         |
| Network timeout on Razorpay API call                           | Exponential backoff retry (max 3 attempts)                                     |
| Webhook delivered multiple times (Razorpay retry policy)       | Idempotency check prevents double credit                                       |

---

### 7.3 Race Condition Prevention

For the payment verification step, use an **atomic status transition** in MongoDB:

```typescript
// Only succeeds if status is still "pending" — prevents double credit
const updated = await CoinOrder.findOneAndUpdate(
  {
    _id: coinOrderId,
    userId: userId,
    status: 'pending', // ← CRITICAL: atomic guard
  },
  {
    $set: {
      status: 'paid',
      razorpayPaymentId,
      razorpaySignature,
      paidAt: new Date(),
    },
  },
  { new: true }
);

if (!updated) {
  // Either already paid, or belongs to different user
  const existing = await CoinOrder.findById(coinOrderId);
  if (existing?.status === 'paid') {
    return; // Idempotent success
  }
  throw ApiError.conflict('ORDER_ALREADY_PROCESSED', 'This order has already been processed');
}
```

---

## 8. Coin Crediting Logic

Coins must be credited **atomically** — wallet balance update and transaction ledger entry must either both succeed or both fail.

### Using MongoDB Transactions (Recommended)

```typescript
async function creditCoinsForOrder(coinOrder: ICoinOrder, razorpayPaymentId: string) {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // 1. Atomic status transition (guard against double credit)
      const updated = await CoinOrder.findOneAndUpdate(
        { _id: coinOrder._id, status: 'pending' },
        {
          $set: {
            status: 'paid',
            razorpayPaymentId,
            paidAt: new Date(),
          },
        },
        { new: true, session }
      );

      if (!updated) {
        // Already processed by another concurrent request
        return;
      }

      // 2. Get wallet balance BEFORE update (for ledger snapshot)
      const wallet = await Wallet.findOne(
        { userId: coinOrder.userId },
        { balance: 1 },
        { session }
      );
      const balanceBefore = wallet?.balance ?? 0;
      const balanceAfter = balanceBefore + coinOrder.totalCoins;

      // 3. Upsert wallet
      await Wallet.findOneAndUpdate(
        { userId: coinOrder.userId },
        {
          $inc: {
            balance: coinOrder.totalCoins,
            totalEarned: coinOrder.totalCoins,
          },
          $setOnInsert: {
            userId: coinOrder.userId,
            totalSpent: 0,
            totalWithdrawn: 0,
            pendingWithdrawal: 0,
          },
        },
        { upsert: true, new: true, session }
      );

      // 4. Create immutable ledger entry
      await CoinTransaction.create(
        [
          {
            userId: coinOrder.userId,
            type: 'purchase',
            direction: 'credit',
            amount: coinOrder.totalCoins,
            balanceBefore,
            balanceAfter,
            coinOrderId: coinOrder._id,
            note: `Purchased ${coinOrder.totalCoins} coins`,
            metadata: {
              bundleId: coinOrder.bundleId,
              razorpayPaymentId,
              baseCoins: coinOrder.baseCoins,
              bonusCoins: coinOrder.bonusCoins,
              amountPaid: coinOrder.finalAmount,
              currency: coinOrder.currency,
            },
          },
        ],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
}
```

### Coin Amount Breakdown

When crediting, **both base and bonus coins** are added to wallet as `totalCoins`:

```
Bundle: "Mega Pack"
  baseCoins:  500
  bonusCoins:  50  ← bonus promotional coins
  totalCoins: 550  ← this is what user receives
```

Users should see this breakdown in the UI: **"500 coins + 50 bonus coins"**

---

## 9. Idempotency & Duplicate Prevention

### Preventing Double Credit

The system uses a **multi-layer idempotency** approach:

```
Layer 1: CoinOrder status check
         → Only process if status === 'pending'

Layer 2: Atomic MongoDB update with status filter
         → findOneAndUpdate({ status: 'pending' }) — fails silently if already 'paid'

Layer 3: Webhook deduplication
         → Webhook handler checks status before crediting

Layer 4: Razorpay deduplication
         → Razorpay guarantees each payment_id is unique
```

### Duplicate Webhook Delivery

Razorpay may deliver the same webhook event multiple times (network retries). Your handler **must be idempotent**:

```typescript
// ✅ Safe idempotent handler
async function handlePaymentCaptured(razorpayOrderId: string, razorpayPaymentId: string) {
  const order = await CoinOrderRepo.findByRazorpayOrderId(razorpayOrderId);

  if (!order) {
    logger.warn(`Unknown Razorpay order: ${razorpayOrderId}`);
    return; // Don't throw — Razorpay will retry on non-2xx responses
  }

  if (order.status !== 'pending') {
    logger.info(`Order ${order._id} already in state '${order.status}' — skipping`);
    return; // Already handled — return 200 to stop Razorpay retries
  }

  await creditCoinsForOrder(order, razorpayPaymentId);
}
```

---

## 10. Refunds

### When to Refund

- User reports payment charged but coins not received (and idempotency check fails — rare)
- Accidental duplicate charge (Razorpay-level issue)
- Admin-initiated refund

### Refund Flow

```
Admin initiates refund (via Razorpay Dashboard or API)
       │
       ▼
Razorpay processes refund
       │
       ▼
Webhook: refund.created → POST /webhooks/razorpay
       │
       ▼
Backend:
  1. Find CoinOrder by razorpayPaymentId
  2. Mark CoinOrder.status = 'refunded'
  3. Deduct coins from Wallet (if still sufficient balance)
  4. Create CoinTransaction: type = "admin_debit", direction = "debit"
  5. Log refund with refundId
```

### Partial Refunds

Razorpay supports partial refunds. Handle `refund.created` with the `amount` field:

```typescript
const refundAmount = refund.amount; // in paise
const coinsToDeduct = calculateCoinsFromAmount(refundAmount, coinOrder);
// Deduct proportional coins from wallet
```

### Refund Failure Cases

| Case                             | Handling                                                   |
| -------------------------------- | ---------------------------------------------------------- |
| User has spent the coins already | Deduct remaining available; flag account for manual review |
| Wallet balance insufficient      | Set balance to 0; log negative adjustment                  |
| CoinOrder not found for payment  | Log alert to admin; manually refund coins                  |

---

## 11. Testing Checklist

### Unit Tests

- [ ] `verifyRazorpaySignature()` with valid/invalid signatures
- [ ] Bundle validation — inactive bundle rejection
- [ ] Bundle validation — expired date window
- [ ] Bundle validation — firstPurchaseOnly restriction
- [ ] Bundle validation — one_time restriction
- [ ] Coupon discount calculation
- [ ] `creditCoinsForOrder()` — correct wallet increment
- [ ] `creditCoinsForOrder()` — correct ledger entry amounts
- [ ] Idempotency — double `verify-payment` returns success without re-crediting

### Integration Tests (Use Razorpay Test Mode)

- [ ] Full happy path: create order → pay → verify → check wallet balance
- [ ] Webhook payment.captured credits coins
- [ ] Webhook deduplication (send same event twice)
- [ ] Invalid HMAC signature rejected
- [ ] Expired bundle cannot be ordered
- [ ] First-time-only bundle rejected for returning buyer

### Razorpay Test Cards

```
# Success scenarios
Card: 4111 1111 1111 1111  Expiry: Any future  CVV: Any 3-digit
UPI:  success@razorpay

# Failure scenarios
Card: 4000 0000 0000 0002  → Insufficient funds
UPI:  failure@razorpay
```

### Environment Toggle

```typescript
const razorpay = new Razorpay({
  key_id: env.NODE_ENV === 'production' ? env.RAZORPAY_KEY_ID_LIVE : env.RAZORPAY_KEY_ID_TEST,
  key_secret:
    env.NODE_ENV === 'production' ? env.RAZORPAY_KEY_SECRET_LIVE : env.RAZORPAY_KEY_SECRET_TEST,
});
```

---

## 12. Environment Variables

```env
# ─── Razorpay ────────────────────────────────────────────────────────────────
# Test environment (rzp_test_ prefix)
RAZORPAY_KEY_ID_TEST=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET_TEST=xxxxxxxxxxxxxxxxxxxx

# Production environment (rzp_live_ prefix)
RAZORPAY_KEY_ID_LIVE=rzp_live_xxxxxxxxxx
RAZORPAY_KEY_SECRET_LIVE=xxxxxxxxxxxxxxxxxxxx

# Webhook secret (generated in Razorpay Dashboard → Webhooks)
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

# ─── Active keys (set based on NODE_ENV) ────────────────────────────────────
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx      # Used at runtime
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx  # Used at runtime
```

---

## Appendix A — Error Code Reference

| Error Code                   | HTTP Status | Meaning                                 |
| ---------------------------- | ----------- | --------------------------------------- |
| `BUNDLE_NOT_FOUND`           | 404         | Bundle slug doesn't exist or is deleted |
| `BUNDLE_INACTIVE`            | 400         | Bundle is deactivated                   |
| `BUNDLE_EXPIRED`             | 400         | Bundle's end date has passed            |
| `BUNDLE_NOT_YET_AVAILABLE`   | 400         | Bundle hasn't started yet               |
| `BUNDLE_OUTSIDE_TIME_WINDOW` | 400         | Outside daily time window               |
| `FIRST_PURCHASE_ONLY`        | 400         | User has prior purchases                |
| `ALREADY_PURCHASED`          | 400         | Violated one_time restriction           |
| `DAILY_LIMIT_REACHED`        | 400         | Violated daily limit                    |
| `MONTHLY_LIMIT_REACHED`      | 400         | Violated monthly limit                  |
| `LIFETIME_LIMIT_REACHED`     | 400         | Violated lifetime limit                 |
| `PER_USER_LIMIT_REACHED`     | 400         | Exceeded per-user cap                   |
| `INVALID_SIGNATURE`          | 400         | HMAC verification failed                |
| `ORDER_NOT_FOUND`            | 404         | CoinOrder doesn't exist                 |
| `ORDER_ALREADY_PROCESSED`    | 409         | Order is not in 'pending' state         |
| `COUPON_INVALID`             | 400         | Coupon code not found or expired        |
| `COUPON_NOT_APPLICABLE`      | 400         | Coupon doesn't apply to this bundle     |
| `RAZORPAY_ORDER_FAILED`      | 502         | Razorpay API call failed                |

---

## Appendix B — Sequence Diagram (Full Flow)

```
User          Frontend        Backend          Razorpay         MongoDB
 │               │               │                │                │
 │── select ────►│               │                │                │
 │               │── POST /coin-orders ──────────►│                │
 │               │               │── create order ►│                │
 │               │               │◄── order_id ───│                │
 │               │               │────────────────────── save CoinOrder (pending) ──►│
 │               │◄──── { razorpayOrderId } ──────│                │
 │── pay ───────►│               │                │                │
 │               │── Razorpay checkout ──────────────────────────►│
 │               │◄──── { paymentId, signature } ─────────────────│
 │               │── POST /verify-payment ───────►│                │
 │               │               │── verify HMAC  │                │
 │               │               │────────────────────── atomic update + credit ─────►│
 │               │◄──── { newBalance } ───────────│                │
 │◄── success ───│               │                │                │
 │               │               │◄── webhook: payment.captured (async)              │
 │               │               │── idempotency check ───────────────────────────►│
 │               │               │   (already paid → skip)         │                │
```

---

_Built for StoryChain — where stories are the currency of creativity._
