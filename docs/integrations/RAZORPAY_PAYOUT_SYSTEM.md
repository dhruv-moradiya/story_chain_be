# 💸 Razorpay Payout System — Full Integration Guide

> **Platform:** StoryChain Backend (Fastify + MongoDB + BullMQ)
> **Payout Gateway:** Razorpay Payouts API (X-Payout)
> **Supported Currencies:** INR (India) · USD (International)
> **Payout Methods (INR):** UPI · NEFT · IMPS · RTGS
> **Payout Methods (USD):** ACH · SWIFT Wire Transfer
> **Last Updated:** July 2026

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [How Razorpay Payouts Works](#2-how-razorpay-payouts-works)
3. [Currency Support (INR vs USD)](#3-currency-support-inr-vs-usd)
4. [Data Models](#4-data-models)
5. [The Complete Withdrawal Flow](#5-the-complete-withdrawal-flow)
6. [Razorpay Payout API Reference](#6-razorpay-payout-api-reference)
7. [Security Design](#7-security-design)
8. [API Endpoints (StoryChain)](#8-api-endpoints-storychain)
9. [Webhook Handling](#9-webhook-handling)
10. [Edge Cases & Error Handling](#10-edge-cases--error-handling)
11. [Payout Service Implementation](#11-payout-service-implementation)
12. [Admin Approval Flow](#12-admin-approval-flow)
13. [Refunds & Reversals](#13-refunds--reversals)
14. [Testing Strategy](#14-testing-strategy)
15. [Environment Variables](#15-environment-variables)
16. [Razorpay Dashboard Setup](#16-razorpay-dashboard-setup)

---

## 1. Overview & Architecture

### What is this system?

When story collaborators earn coins through the platform's earning distribution mechanism, they accumulate coins in their **Wallet**. This system allows them to **convert those coins to real money** (INR or USD) and receive it via UPI / Bank Transfer (India) or ACH / SWIFT Wire (International) using **Razorpay Payouts (X-Payout API)**.

> **Conversion Rates** (configured in `PlatformCoinConfig.withdrawal`):
> - 🇮🇳 **INR:** `1 Coin = ₹1` (1:1 ratio)
> - 🇺🇸 **USD:** `1 Coin = $0.01` (100 coins = $1.00)
>
> Rates are admin-configurable. The user selects their preferred payout currency at the time of withdrawal.

### High-Level Flow

```
User requests withdrawal
         │
         ▼
POST /withdrawal-requests          ← User submits coins + UPI/Bank details
         │
         ▼
Wallet: balance -= coins           ← Coins locked in pendingWithdrawal
pendingWithdrawal += coins
         │
         ▼
Admin reviews request              ← GET /admin/withdrawal-requests (queue)
         │
         ├─── APPROVE ──────────► POST /admin/withdrawal-requests/:id/approve
         │                              │
         │                              ▼
         │                        Create Razorpay Fund Account (fa_xxxx)
         │                              │
         │                              ▼
         │                        Create Razorpay Payout (pout_xxxx)
         │                              │
         │                              ▼
         │                        Status: processing → webhook updates
         │
         └─── REJECT  ──────────► POST /admin/withdrawal-requests/:id/reject
                                        │
                                        ▼
                                  Wallet: balance += coins (refund)
                                  pendingWithdrawal -= coins
```

### Involved Models

| Model                | Purpose                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| `Wallet`             | User's coin balance — `pendingWithdrawal` locks coins during review      |
| `WithdrawalRequest`  | One withdrawal attempt — tracks status, payout destination, Razorpay IDs |
| `CoinTransaction`    | Immutable ledger entry for every coin debit/credit                       |
| `PlatformCoinConfig` | Platform-wide config (min withdrawal coins, processing fee)              |

### Why Admin Approval?

1. **Fraud prevention** — Review suspicious withdrawal patterns before sending money.
2. **KYC compliance** — Verify the bank/UPI account before first payout.
3. **Budget control** — Prevent accidental over-payout if there's a bug in coin calculation.
4. **Razorpay Fund Account creation** — Requires one-time setup per user per payout method.

---

## 2. How Razorpay Payouts Works

> Razorpay Payouts is a **separate product** from Razorpay Payment Gateway. It requires a **RazorpayX** account (business banking account funded by you).

### Key Concepts

| Term                  | Description                                                                   |
| --------------------- | ----------------------------------------------------------------------------- |
| **RazorpayX Account** | Your funded virtual bank account — money goes out from here                   |
| **Contact**           | The recipient of the payout (user's name, email, phone)                       |
| **Fund Account**      | The destination bank account or UPI ID linked to a Contact                    |
| **Payout**            | The actual money transfer from your RazorpayX account to the Fund Account     |
| **Payout Link**       | An alternative where you generate a link for the user to fill in bank details |

### API Base URL

```
https://api.razorpay.com/v1/
```

> All Payout API calls use **Basic Auth** with `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET`.

### Fund Account Required First

Before sending a payout, you MUST:

1. Create a **Contact** (or reuse existing one linked to the user).
2. Create a **Fund Account** (bank account or UPI) under that Contact.
3. Only then can you create a **Payout** to that Fund Account.

---

## 3. Currency Support (INR vs USD)

### Why Two Currencies?

StoryChain is a global platform. Indian users prefer INR payouts via UPI/bank transfer, while international users (outside India) need USD via ACH or SWIFT. Razorpay supports both through RazorpayX, but the **payout method and mode differ significantly**.

### Currency Decision at Withdrawal Time

The user selects `currency: 'INR' | 'USD'` when submitting a withdrawal request. This determines:
1. The **conversion rate** applied (coins → INR or coins → USD)
2. The **allowed payout methods** available to them
3. The **Razorpay payout mode** used when admin approves

### INR vs USD Payout Comparison

| Aspect                 | INR (India)                             | USD (International)                        |
| ---------------------- | --------------------------------------- | ------------------------------------------ |
| **Payout Methods**     | UPI, Bank Transfer                      | Bank Transfer only (ACH / SWIFT)           |
| **Razorpay Mode**      | `UPI`, `IMPS`, `NEFT`, `RTGS`          | `ACH` (US domestic), `SWIFT` (global)     |
| **Speed**              | Instant (UPI/IMPS) to 2-4 hrs (NEFT)  | ACH: 1-3 business days · SWIFT: 3-5 days  |
| **Min Withdrawal**     | 500 coins (= ₹500)                     | 5000 coins (= $50.00)                      |
| **Bank Details**       | Account No. + IFSC                     | Account No. + ABA Routing / SWIFT/BIC code |
| **Conversion Rate**    | 1 coin = ₹1                            | 100 coins = $1.00                          |
| **Razor payX Account** | INR-funded RazorpayX account           | USD-funded RazorpayX account              |
| **Regulations**        | RBI / NPCI compliance                  | FEMA compliance required for outward remittance |

### Payout Details by Currency

**INR Payout Details:**
```typescript
// payoutMethod: 'upi'
{ upiId: 'user@okaxis' }

// payoutMethod: 'bank_transfer' (INR)
{ accountNumber, ifscCode, accountName, bankName }
```

**USD Payout Details:**
```typescript
// payoutMethod: 'bank_transfer' (USD / ACH)
{
  accountNumber,
  routingNumber,   // ABA routing number (9 digits) — for US ACH
  accountName,
  bankName,
  accountType: 'checking' | 'savings'
}

// payoutMethod: 'bank_transfer' (USD / SWIFT Wire)
{
  accountNumber,
  swiftCode,       // BIC/SWIFT code (8 or 11 chars)
  accountName,
  bankName,
  bankAddress,
  country          // ISO 3166-1 alpha-2 country code
}
```

> **⚠️ IMPORTANT — RazorpayX USD Payouts**: Razorpay's international USD payout support is available via **RazorpayX International** (requires separate approval from Razorpay and FEMA compliance). Ensure your RazorpayX account is enabled for international transfers before implementing USD payouts.

---

## 4. Data Models

### 3.1 WithdrawalRequest

Represents **one withdrawal request** from a user.

```typescript
// src/models/withdrawalRequest.model.ts

interface IWithdrawalRequest {
  userId: string; // Clerk user ID
  coins: number; // Coins being withdrawn (min: platformConfig.minWithdrawalCoins)

  // ── Currency & Amount ─────────────────────────────────────────────────────
  currency: 'INR' | 'USD';       // User's chosen payout currency
  amountInr?: number;            // Populated when currency = 'INR' (coins × coinToInrRate)
  amountUsd?: number;            // Populated when currency = 'USD' (coins × coinToUsdRate)
  conversionRate: number;        // Snapshot of the rate at time of request

  // Payout Destination
  payoutMethod: 'upi' | 'bank_transfer';
  payoutDetails: IPayoutDetails;

  // Status & Admin
  status: WithdrawalStatus; // See enum below
  reviewedBy?: string; // Admin clerk ID
  reviewedAt?: Date;
  rejectionReason?: string;
  adminNote?: string;

  // Razorpay Payout IDs
  razorpayPayoutId?: string; // pout_xxxxxxxx
  razorpayFundAccountId?: string; // fa_xxxxxxxx
  razorpayPayoutStatus?: string; // queued | processing | processed | reversed | failed
  payoutInitiatedAt?: Date;
  payoutCompletedAt?: Date;
  payoutFailureReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

interface IPayoutDetails {
  // ── UPI (INR only) ─────────────────────────────────────────────────────────
  upiId?: string; // e.g. "user@okaxis"

  // ── Bank Transfer — INR ────────────────────────────────────────────────────
  accountNumber?: string; // Bank account number
  ifscCode?: string; // IFSC code (11 chars) — India only
  accountName?: string; // Name on the bank account
  bankName?: string; // e.g. "HDFC Bank"

  // ── Bank Transfer — USD / ACH (US domestic) ───────────────────────────────
  routingNumber?: string; // ABA routing number (9 digits)
  accountType?: 'checking' | 'savings'; // US bank account type

  // ── Bank Transfer — USD / SWIFT (International wire) ─────────────────────
  swiftCode?: string; // BIC/SWIFT code (8 or 11 chars)
  bankAddress?: string; // Full address of the beneficiary bank
  country?: string; // ISO 3166-1 alpha-2 (e.g. "US", "GB", "SG")
}

enum WithdrawalStatus {
  PENDING = 'pending', // Submitted, awaiting admin review
  APPROVED = 'approved', // Admin approved, payout being created at Razorpay
  REJECTED = 'rejected', // Admin rejected — coins returned to wallet
  PROCESSING = 'processing', // Payout sent to Razorpay, in transit
  COMPLETED = 'completed', // Money reached user's bank/UPI
  FAILED = 'failed', // Payout failed at Razorpay — admin must retry
}
```

---

### 3.2 Wallet (Relevant Fields)

```typescript
interface IWallet {
  userId: string;
  balance: number; // Spendable coins right now (never below 0)
  totalEarned: number; // Lifetime earned (never decremented)
  totalSpent: number; // Lifetime spent on unlocks etc.
  totalWithdrawn: number; // Lifetime successfully withdrawn
  pendingWithdrawal: number; // Coins locked during active withdrawal requests
}
```

> **Invariant:** `balance + pendingWithdrawal` represents the total "unspent" coins.

---

### 3.3 CoinTransaction (Ledger)

Every coin movement produces an **immutable** ledger entry:

```typescript
interface ICoinTransaction {
  userId: string;
  type: 'withdrawal'; // for payout debits
  direction: 'debit';
  amount: number; // Always positive

  balanceBefore: number;
  balanceAfter: number;

  withdrawalRequestId?: ObjectId;
  note?: string;
  metadata?: Record<string, unknown>;
}
```

---

### 3.4 PlatformCoinConfig (Withdrawal Settings)

```typescript
// Singleton document in DB
interface IWithdrawalConfig {
  // INR settings
  minWithdrawalCoinsInr: number; // Minimum coins for INR payout (default: 500 → ₹500)
  coinToInrRate: number;         // How many INR per 1 coin (default: 1.0 → 1:1)

  // USD settings
  minWithdrawalCoinsUsd: number; // Minimum coins for USD payout (default: 5000 → $50)
  coinToUsdRate: number;         // How many USD per 1 coin (default: 0.01 → 100 coins = $1)

  processingFeeCoin: number;     // Platform fee in coins deducted per request (default: 0)
  isWithdrawalEnabled: boolean;
}
```

> **Coin-to-Currency Calculation:**
> - **INR:** `amountInr = Math.floor(coins * coinToInrRate)` → e.g. 500 coins × 1.0 = ₹500
> - **USD:** `amountUsd = parseFloat((coins * coinToUsdRate).toFixed(2))` → e.g. 5000 coins × 0.01 = $50.00

---

## 5. The Complete Withdrawal Flow

### Step 1 — User Submits Withdrawal Request

**Endpoint:** `POST /api/v1/withdrawal-requests`

**Request Body — INR via UPI:**

```json
{
  "coins": 500,
  "currency": "INR",
  "payoutMethod": "upi",
  "payoutDetails": {
    "upiId": "user@okaxis"
  }
}
```

**Request Body — INR via Bank Transfer:**

```json
{
  "coins": 1000,
  "currency": "INR",
  "payoutMethod": "bank_transfer",
  "payoutDetails": {
    "accountNumber": "1234567890",
    "ifscCode": "HDFC0001234",
    "accountName": "Dhruv Moradiya",
    "bankName": "HDFC Bank"
  }
}
```

**Request Body — USD via ACH (US domestic):**

```json
{
  "coins": 5000,
  "currency": "USD",
  "payoutMethod": "bank_transfer",
  "payoutDetails": {
    "accountNumber": "000123456789",
    "routingNumber": "021000021",
    "accountName": "John Doe",
    "bankName": "JPMorgan Chase",
    "accountType": "checking"
  }
}
```

**Request Body — USD via SWIFT Wire (International):**

```json
{
  "coins": 5000,
  "currency": "USD",
  "payoutMethod": "bank_transfer",
  "payoutDetails": {
    "accountNumber": "GB29NWBK60161331926819",
    "swiftCode": "NWBKGB2L",
    "accountName": "Jane Smith",
    "bankName": "NatWest Bank",
    "bankAddress": "135 Bishopsgate, London EC2M 3UR",
    "country": "GB"
  }
}
```

**Backend Validates & Locks Coins:**

```
1. Auth check (Clerk JWT required)
2. Fetch PlatformCoinConfig — check isWithdrawalEnabled
3. Validate currency = 'INR' | 'USD'
4. Check coins >= minWithdrawalCoinsInr (INR) OR >= minWithdrawalCoinsUsd (USD)
5. Validate payoutMethod:
   - 'upi' is only allowed when currency = 'INR'
   - 'bank_transfer' is allowed for both currencies
6. Validate payoutDetails fields based on currency:
   - INR bank_transfer requires: accountNumber + ifscCode
   - USD bank_transfer (ACH) requires: accountNumber + routingNumber + accountType
   - USD bank_transfer (SWIFT) requires: accountNumber + swiftCode + country
7. Compute final amount:
   - amountInr = Math.floor(coins * config.coinToInrRate)   [if INR]
   - amountUsd = parseFloat((coins * config.coinToUsdRate).toFixed(2))  [if USD]
8. Check user has no other PENDING or PROCESSING request (one at a time)
9. [DB Transaction] Atomically:
   a. Check wallet.balance >= coins (sufficient balance)
   b. Deduct from wallet: balance -= coins, pendingWithdrawal += coins
   c. Create WithdrawalRequest with status = 'pending', currency, amountInr/amountUsd, conversionRate
   d. Create CoinTransaction: type='withdrawal', direction='debit'
10. Notify admins (via notification system or email)
```

**Response (INR):**

```json
{
  "success": true,
  "data": {
    "withdrawalRequestId": "6657c...",
    "coins": 500,
    "currency": "INR",
    "amountInr": 500,
    "conversionRate": 1.0,
    "status": "pending",
    "estimatedProcessingTime": "1-3 business days"
  }
}
```

**Response (USD):**

```json
{
  "success": true,
  "data": {
    "withdrawalRequestId": "6657d...",
    "coins": 5000,
    "currency": "USD",
    "amountUsd": 50.00,
    "conversionRate": 0.01,
    "status": "pending",
    "estimatedProcessingTime": "3-5 business days (SWIFT)"
  }
}
```

---

### Step 2 — Admin Reviews the Request

Admin fetches the pending queue:

```
GET /api/v1/admin/withdrawal-requests?status=pending&sort=createdAt&order=asc
```

This returns a FIFO queue (oldest first) of pending requests. Admin sees:

- User details
- Coins requested
- Currency selected (INR / USD) and computed amount
- Conversion rate snapshot
- Payout method and destination details
- User's wallet history (for fraud check)
- User's country (for SWIFT compliance checks)

---

### Step 3A — Admin Approves → Razorpay Payout is Initiated

**Endpoint:** `POST /api/v1/admin/withdrawal-requests/:id/approve`

**What the backend does:**

```
1. Verify admin role
2. Fetch WithdrawalRequest — must be status = 'pending'
3. Fetch user details (name, email, phone) from User model
4. Step A: Create Razorpay Contact
   POST https://api.razorpay.com/v1/contacts
   {
     "name": "Dhruv Moradiya",
     "email": "dhruv@example.com",
     "contact": "9999999999",
     "type": "employee",
     "reference_id": "<userId>",
     "notes": { "platform": "storychain" }
   }
   → Returns: { "id": "cont_xxxxxxxx" }

5. Step B: Create Razorpay Fund Account
   POST https://api.razorpay.com/v1/fund_accounts
   (for UPI)
   {
     "contact_id": "cont_xxxxxxxx",
     "account_type": "vpa",
     "vpa": { "address": "user@okaxis" }
   }
   (for bank transfer)
   {
     "contact_id": "cont_xxxxxxxx",
     "account_type": "bank_account",
     "bank_account": {
       "name": "Dhruv Moradiya",
       "ifsc": "HDFC0001234",
       "account_number": "1234567890"
     }
   }
   → Returns: { "id": "fa_xxxxxxxx" }

6. Step C: Create Razorpay Payout
   POST https://api.razorpay.com/v1/payouts

   ── For INR payouts ──
   {
     "account_number": "<RAZORPAYX_INR_ACCOUNT_NUMBER>",
     "fund_account_id": "fa_xxxxxxxx",
     "amount": 50000,            ← amountInr × 100 (paise)
     "currency": "INR",
     "mode": "UPI",              ← "UPI" | "NEFT" | "IMPS" | "RTGS"
     "purpose": "payout",
     "queue_if_low_balance": true,
     "reference_id": "<withdrawalRequestId>",
     "narration": "StoryChain Coin Withdrawal",
     "notes": { "userId": "<userId>", "withdrawalRequestId": "<id>" }
   }

   ── For USD payouts ──
   {
     "account_number": "<RAZORPAYX_USD_ACCOUNT_NUMBER>",
     "fund_account_id": "fa_xxxxxxxx",
     "amount": 5000,             ← amountUsd × 100 (cents)
     "currency": "USD",
     "mode": "ACH",              ← "ACH" (US domestic) | "SWIFT" (international)
     "purpose": "payout",
     "queue_if_low_balance": true,
     "reference_id": "<withdrawalRequestId>",
     "narration": "StoryChain Coin Withdrawal",
     "notes": { "userId": "<userId>", "withdrawalRequestId": "<id>" }
   }

   → Returns: { "id": "pout_xxxxxxxx", "status": "queued" }

7. [DB Transaction] Atomically:
   a. Update WithdrawalRequest:
      - status = 'processing'
      - razorpayPayoutId = 'pout_xxxxxxxx'
      - razorpayFundAccountId = 'fa_xxxxxxxx'
      - razorpayPayoutStatus = 'queued'
      - payoutInitiatedAt = new Date()
      - reviewedBy = adminId
      - reviewedAt = new Date()
   b. Do NOT release pendingWithdrawal yet — wait for webhook confirmation

8. Notify user: "Your withdrawal is being processed"
```

---

### Step 3B — Admin Rejects → Coins Returned

**Endpoint:** `POST /api/v1/admin/withdrawal-requests/:id/reject`

**Request Body:**

```json
{
  "rejectionReason": "Invalid UPI ID — please update and resubmit"
}
```

**Backend:**

```
1. Verify admin role
2. Fetch WithdrawalRequest — must be status = 'pending'
3. [DB Transaction] Atomically:
   a. Update WithdrawalRequest:
      - status = 'rejected'
      - rejectionReason = <reason>
      - reviewedBy = adminId
      - reviewedAt = new Date()
   b. Return coins to wallet:
      - balance += coins
      - pendingWithdrawal -= coins
   c. Create CoinTransaction: type='withdrawal', direction='credit', note='Withdrawal rejected - coins refunded'
4. Notify user: "Your withdrawal was rejected — coins returned to wallet"
```

---

### Step 4 — Razorpay Webhook Updates Status

Razorpay sends webhooks for payout status changes. See [Section 8](#8-webhook-handling).

| Razorpay Status | Our Status | Wallet Action                                             |
| --------------- | ---------- | --------------------------------------------------------- |
| `queued`        | processing | Coins still locked in pendingWithdrawal                   |
| `processing`    | processing | No change                                                 |
| `processed`     | completed  | `pendingWithdrawal -= coins`, `totalWithdrawn += coins`   |
| `reversed`      | failed     | `pendingWithdrawal -= coins`, `balance += coins` (refund) |
| `failed`        | failed     | `pendingWithdrawal -= coins`, `balance += coins` (refund) |
| `cancelled`     | failed     | `pendingWithdrawal -= coins`, `balance += coins` (refund) |

---

## 6. Razorpay Payout API Reference

### 5.1 Create Contact

```http
POST https://api.razorpay.com/v1/contacts
Authorization: Basic <base64(key_id:key_secret)>
Content-Type: application/json

{
  "name": "Dhruv Moradiya",
  "email": "dhruv@example.com",
  "contact": "9999999999",
  "type": "employee",
  "reference_id": "user_clerk_xxxx",
  "notes": {
    "platform": "storychain",
    "userId": "user_clerk_xxxx"
  }
}
```

**Response:**

```json
{
  "id": "cont_AbCdEfGhIjKlMn",
  "entity": "contact",
  "name": "Dhruv Moradiya",
  "contact": "9999999999",
  "email": "dhruv@example.com",
  "type": "employee",
  "reference_id": "user_clerk_xxxx",
  "active": true
}
```

---

### 5.2 Create Fund Account — UPI

```http
POST https://api.razorpay.com/v1/fund_accounts
Authorization: Basic <base64(key_id:key_secret)>

{
  "contact_id": "cont_AbCdEfGhIjKlMn",
  "account_type": "vpa",
  "vpa": {
    "address": "user@okaxis"
  }
}
```

**Response:**

```json
{
  "id": "fa_AbCdEfGhIjKlMn",
  "entity": "fund_account",
  "contact_id": "cont_AbCdEfGhIjKlMn",
  "account_type": "vpa",
  "vpa": {
    "address": "user@okaxis"
  },
  "active": true
}
```

---

### 5.3 Create Fund Account — Bank Transfer

```http
POST https://api.razorpay.com/v1/fund_accounts

{
  "contact_id": "cont_AbCdEfGhIjKlMn",
  "account_type": "bank_account",
  "bank_account": {
    "name": "Dhruv Moradiya",
    "ifsc": "HDFC0001234",
    "account_number": "1234567890"
  }
}
```

**Response:**

```json
{
  "id": "fa_AbCdEfGhIjKlMn",
  "entity": "fund_account",
  "account_type": "bank_account",
  "bank_account": {
    "name": "Dhruv Moradiya",
    "ifsc": "HDFC0001234",
    "account_number": "1234567890",
    "bank_name": "HDFC Bank"
  },
  "active": true
}
```

---

### 5.4 Create Payout — INR

```http
POST https://api.razorpay.com/v1/payouts
Authorization: Basic <base64(key_id:key_secret)>
X-Payout-Idempotency: <unique_idempotency_key>

{
  "account_number": "<RAZORPAYX_INR_ACCOUNT_NUMBER>",
  "fund_account_id": "fa_AbCdEfGhIjKlMn",
  "amount": 50000,
  "currency": "INR",
  "mode": "UPI",
  "purpose": "payout",
  "queue_if_low_balance": true,
  "reference_id": "withdrawal_6657c...",
  "narration": "StoryChain Coin Withdrawal",
  "notes": {
    "userId": "user_clerk_xxxx",
    "withdrawalRequestId": "6657c..."
  }
}
```

> **`X-Payout-Idempotency`**: Always send this header. Use `withdrawalRequestId` as the key. If the same key is resent, Razorpay returns the existing payout instead of creating a new one. Critical for retry safety.

**INR Payout Modes:**

| `payoutMethod`  | Recommended `mode` | Speed           | When to Use             |
| --------------- | ------------------ | --------------- | ----------------------- |
| `upi`           | `UPI`              | Instant         | Default for UPI         |
| `bank_transfer` | `IMPS`             | Instant         | Default for bank (INR)  |
| `bank_transfer` | `NEFT`             | 2-4 hours       | Non-urgent / off-hours  |
| `bank_transfer` | `RTGS`             | Same day (>₹2L) | Large amounts only      |

---

### 5.5 Create Payout — USD

```http
POST https://api.razorpay.com/v1/payouts
Authorization: Basic <base64(key_id:key_secret)>
X-Payout-Idempotency: <unique_idempotency_key>

{
  "account_number": "<RAZORPAYX_USD_ACCOUNT_NUMBER>",
  "fund_account_id": "fa_AbCdEfGhIjKlMn",
  "amount": 5000,
  "currency": "USD",
  "mode": "ACH",
  "purpose": "payout",
  "queue_if_low_balance": true,
  "reference_id": "withdrawal_6657d...",
  "narration": "StoryChain Coin Withdrawal",
  "notes": {
    "userId": "user_clerk_xxxx",
    "withdrawalRequestId": "6657d..."
  }
}
```

**USD Payout Modes:**

| `payoutMethod`  | Recommended `mode` | Speed            | When to Use               |
| --------------- | ------------------ | ---------------- | ------------------------- |
| `bank_transfer` | `ACH`              | 1-3 business days| US domestic bank accounts |
| `bank_transfer` | `SWIFT`            | 3-5 business days| International wire transfers |

> **Note**: UPI is **not supported** for USD payouts. USD users must use bank transfer.

**Response (same structure for INR & USD):**

```json
{
  "id": "pout_AbCdEfGhIjKlMn",
  "entity": "payout",
  "fund_account_id": "fa_AbCdEfGhIjKlMn",
  "amount": 5000,
  "currency": "USD",
  "mode": "ACH",
  "purpose": "payout",
  "status": "queued",
  "reference_id": "withdrawal_6657d...",
  "narration": "StoryChain Coin Withdrawal",
  "created_at": 1688000000
}
```

---

### 5.6 Fetch Payout Status

```http
GET https://api.razorpay.com/v1/payouts/pout_AbCdEfGhIjKlMn
```

Use this for manual status polling when webhooks are delayed. Works the same for both INR and USD payouts.

---

### 5.7 Cancel Payout (only while `queued`)

```http
POST https://api.razorpay.com/v1/payouts/pout_AbCdEfGhIjKlMn/cancel
```

Only works while payout is in `queued` status. Once `processing` begins, it cannot be cancelled. Applies to both INR and USD payouts.

---

## 7. Security Design

### 6.1 Razorpay Webhook Signature Verification

```typescript
import crypto from 'crypto';

function verifyPayoutWebhookSignature(
  rawBody: string, // Raw request body (Buffer as string)
  signatureHeader: string, // X-Razorpay-Signature header value
  webhookSecret: string // RAZORPAY_PAYOUT_WEBHOOK_SECRET
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signatureHeader));
}
```

> **⚠️ CRITICAL**: Use the **raw body buffer** before JSON parsing. Fastify's body parser may reformat JSON. Always attach a `rawBody` hook for webhook routes.

---

### 6.2 Idempotency Key — Mandatory

```typescript
const idempotencyKey = `withdrawal_${withdrawalRequestId}`;

await razorpay.payouts.create(payoutPayload, {
  headers: { 'X-Payout-Idempotency': idempotencyKey },
});
```

This prevents duplicate payouts if the admin accidentally double-approves or if the network times out and the request is retried.

---

### 6.3 Atomic Coin Lock on Submission

```typescript
// Only succeeds if user has enough balance (atomic guard)
const updated = await Wallet.findOneAndUpdate(
  {
    userId: userId,
    balance: { $gte: coinsRequested }, // ← CRITICAL atomic guard
  },
  {
    $inc: {
      balance: -coinsRequested,
      pendingWithdrawal: coinsRequested,
    },
  },
  { new: true, session }
);

if (!updated) {
  throw ApiError.badRequest('INSUFFICIENT_BALANCE', 'Insufficient coin balance');
}
```

---

### 6.4 Authorization Checks

| Check                                               | Why                                                  |
| --------------------------------------------------- | ---------------------------------------------------- |
| Clerk JWT on all user endpoints                     | Prevents unauthenticated access                      |
| `withdrawalRequest.userId === request.user.clerkId` | Users can only view/cancel their own requests        |
| Admin role check on approval/rejection endpoints    | Prevents regular users from approving payouts        |
| `status === 'pending'` guard on approve/reject      | Prevents re-processing already handled requests      |
| One active withdrawal at a time per user            | Prevents wallet balance from going negative via race |

---

### 7.5 Secrets Management

```
RAZORPAY_KEY_ID                    = rzp_live_xxxxx
RAZORPAY_KEY_SECRET                = xxxxx
RAZORPAY_PAYOUT_WEBHOOK_SECRET     = xxxxx          ← Separate secret for payout webhooks
RAZORPAYX_INR_ACCOUNT_NUMBER       = 2323230016898972  ← Your INR RazorpayX account
RAZORPAYX_USD_ACCOUNT_NUMBER       = 2323230099112233  ← Your USD RazorpayX account (separate)
```

> **Two separate RazorpayX accounts** are needed — one funded in INR for Indian payouts, and one funded in USD for international payouts. They can use the same API key pair.

---

## 8. API Endpoints (StoryChain)

### User Endpoints (Clerk JWT Required)

| Method   | Path                              | Description                                     |
| -------- | --------------------------------- | ----------------------------------------------- |
| `POST`   | `/api/v1/withdrawal-requests`     | Submit a new withdrawal request                 |
| `GET`    | `/api/v1/withdrawal-requests`     | List user's own withdrawal requests             |
| `GET`    | `/api/v1/withdrawal-requests/:id` | Get details of a specific withdrawal request    |
| `DELETE` | `/api/v1/withdrawal-requests/:id` | Cancel a PENDING request (before admin reviews) |
| `GET`    | `/api/v1/wallet`                  | Get current wallet balance + pendingWithdrawal  |
| `GET`    | `/api/v1/wallet/transactions`     | Get coin transaction history                    |

### Admin Endpoints (Admin Role Required)

| Method | Path                                            | Description                              |
| ------ | ----------------------------------------------- | ---------------------------------------- |
| `GET`  | `/api/v1/admin/withdrawal-requests`             | List all requests (filterable by status) |
| `GET`  | `/api/v1/admin/withdrawal-requests/:id`         | Get one request with user details        |
| `POST` | `/api/v1/admin/withdrawal-requests/:id/approve` | Approve & initiate Razorpay payout       |
| `POST` | `/api/v1/admin/withdrawal-requests/:id/reject`  | Reject with reason (coins returned)      |
| `POST` | `/api/v1/admin/withdrawal-requests/:id/retry`   | Retry a FAILED payout                    |
| `GET`  | `/api/v1/admin/withdrawal-requests/stats`       | Aggregate stats (total pending, amounts) |

### Webhook Endpoints (Secret Verified, No Auth)

| Method | Path                                | Description                      |
| ------ | ----------------------------------- | -------------------------------- |
| `POST` | `/api/v1/webhooks/razorpay-payouts` | Razorpay Payout webhook receiver |

---

### Request/Response Schemas

#### `POST /api/v1/withdrawal-requests` — Request Body

```typescript
interface CreateWithdrawalRequestDTO {
  coins: number;                  // Must be >= min for chosen currency
  currency: 'INR' | 'USD';        // Payout currency
  payoutMethod: 'upi' | 'bank_transfer'; // 'upi' only valid for INR
  payoutDetails: {
    // ── UPI (INR only) ───────────────────────────────────────
    upiId?: string;

    // ── Bank Transfer — INR ───────────────────────────────────
    accountNumber?: string;
    ifscCode?: string;             // Required for INR bank transfer
    accountName?: string;
    bankName?: string;

    // ── Bank Transfer — USD / ACH ─────────────────────────────
    routingNumber?: string;        // ABA routing number (9 digits)
    accountType?: 'checking' | 'savings';

    // ── Bank Transfer — USD / SWIFT ───────────────────────────
    swiftCode?: string;            // BIC/SWIFT code (8 or 11 chars)
    bankAddress?: string;
    country?: string;              // ISO 3166-1 alpha-2 (e.g. "US", "GB")
  };
}
```

#### `GET /api/v1/withdrawal-requests` — Response

```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "_id": "6657c...",
        "coins": 500,
        "currency": "INR",
        "amountInr": 500,
        "conversionRate": 1.0,
        "payoutMethod": "upi",
        "payoutDetails": { "upiId": "user@okaxis" },
        "status": "processing",
        "razorpayPayoutId": "pout_xxxx",
        "payoutInitiatedAt": "2026-07-16T10:00:00.000Z",
        "createdAt": "2026-07-16T09:00:00.000Z"
      },
      {
        "_id": "6657d...",
        "coins": 5000,
        "currency": "USD",
        "amountUsd": 50.00,
        "conversionRate": 0.01,
        "payoutMethod": "bank_transfer",
        "payoutDetails": { "routingNumber": "021000021", "accountType": "checking" },
        "status": "pending",
        "createdAt": "2026-07-16T09:30:00.000Z"
      }
    ],
    "pagination": { "total": 5, "page": 1, "limit": 20 }
  }
}
```

---

## 9. Webhook Handling

### Payout Webhook Events

Register a **separate webhook** in the RazorpayX Dashboard (different from payment gateway webhooks).

**URL:** `https://your-api.com/api/v1/webhooks/razorpay-payouts`

**Events to Subscribe:**

| Razorpay Event                      | Trigger                                           |
| ----------------------------------- | ------------------------------------------------- |
| `payout.queued`                     | Payout is queued (awaiting funds/processing)      |
| `payout.initiated`                  | Payout is being processed by Razorpay             |
| `payout.processed`                  | Payout successfully transferred to user's account |
| `payout.reversed`                   | Payout was reversed (returned to RazorpayX)       |
| `payout.failed`                     | Payout failed permanently                         |
| `payout.cancelled`                  | Payout cancelled (only possible while `queued`)   |
| `fund_account.validation.completed` | Fund account validation done (optional)           |
| `fund_account.validation.failed`    | Fund account invalid                              |

---

### Webhook Handler Implementation

```typescript
async function handlePayoutWebhook(rawBody: string, signature: string): Promise<void> {
  // 1. Verify signature
  if (!verifyPayoutWebhookSignature(rawBody, signature, env.RAZORPAY_PAYOUT_WEBHOOK_SECRET)) {
    throw ApiError.unauthorized('INVALID_SIGNATURE', 'Payout webhook signature mismatch');
  }

  const event = JSON.parse(rawBody);
  const payout = event.payload?.payout?.entity;

  if (!payout) return; // Unknown event shape — ignore safely

  const razorpayPayoutId = payout.id; // pout_xxxx
  const razorpayStatus = payout.status; // processed | failed | reversed | ...
  const referenceId = payout.reference_id; // withdrawal_6657c...

  // 2. Find WithdrawalRequest by razorpayPayoutId
  const withdrawal = await WithdrawalRequest.findOne({ razorpayPayoutId });
  if (!withdrawal) {
    // Try by reference_id as fallback
    const withdrawalId = referenceId?.replace('withdrawal_', '');
    const fallback = await WithdrawalRequest.findById(withdrawalId);
    if (!fallback) return; // Unknown payout — ignore
  }

  switch (event.event) {
    case 'payout.processed':
      await handlePayoutProcessed(withdrawal, payout);
      break;

    case 'payout.reversed':
    case 'payout.failed':
    case 'payout.cancelled':
      await handlePayoutFailed(withdrawal, payout, event.event);
      break;

    case 'payout.queued':
    case 'payout.initiated':
      await WithdrawalRequest.findByIdAndUpdate(withdrawal._id, {
        razorpayPayoutStatus: razorpayStatus,
      });
      break;
  }
}

// ── Payout Processed (money reached user) ─────────────────────────────────────
async function handlePayoutProcessed(
  withdrawal: IWithdrawalRequestDoc,
  payout: RazorpayPayoutEntity
): Promise<void> {
  if (withdrawal.status === 'completed') return; // Idempotent — already processed

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // 1. Mark withdrawal as completed
      await WithdrawalRequest.findByIdAndUpdate(
        withdrawal._id,
        {
          status: 'completed',
          razorpayPayoutStatus: 'processed',
          payoutCompletedAt: new Date(),
        },
        { session }
      );

      // 2. Release pendingWithdrawal and increment totalWithdrawn
      await Wallet.findOneAndUpdate(
        { userId: withdrawal.userId },
        {
          $inc: {
            pendingWithdrawal: -withdrawal.coins,
            totalWithdrawn: withdrawal.coins,
          },
        },
        { session }
      );

      // NOTE: The CoinTransaction (debit) was already created when the request
      // was submitted in Step 1. No new transaction needed here.
    });
  } finally {
    await session.endSession();
  }

  // 3. Notify user
  await notifyUser(withdrawal.userId, 'WITHDRAWAL_COMPLETED', {
    coins: withdrawal.coins,
    amountInr: withdrawal.amountInr,
  });
}

// ── Payout Failed / Reversed ───────────────────────────────────────────────────
async function handlePayoutFailed(
  withdrawal: IWithdrawalRequestDoc,
  payout: RazorpayPayoutEntity,
  eventType: string
): Promise<void> {
  if (withdrawal.status === 'failed') return; // Idempotent

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const failureReason = payout.error_message || payout.failure_reason || `Payout ${eventType}`;

      // 1. Mark withdrawal as failed
      await WithdrawalRequest.findByIdAndUpdate(
        withdrawal._id,
        {
          status: 'failed',
          razorpayPayoutStatus: payout.status,
          payoutFailureReason: failureReason,
        },
        { session }
      );

      // 2. Return coins to user's balance
      await Wallet.findOneAndUpdate(
        { userId: withdrawal.userId },
        {
          $inc: {
            balance: withdrawal.coins, // Give coins back
            pendingWithdrawal: -withdrawal.coins, // Release lock
          },
        },
        { session }
      );

      // 3. Create a credit transaction (reversing the original debit)
      const wallet = await Wallet.findOne({ userId: withdrawal.userId }, null, { session });
      await CoinTransaction.create(
        [
          {
            userId: withdrawal.userId,
            type: 'withdrawal',
            direction: 'credit',
            amount: withdrawal.coins,
            balanceBefore: (wallet?.balance ?? 0) - withdrawal.coins,
            balanceAfter: wallet?.balance ?? 0,
            withdrawalRequestId: withdrawal._id,
            note: `Withdrawal failed — coins refunded. Reason: ${failureReason}`,
            metadata: {
              razorpayPayoutId: payout.id,
              failureReason,
              eventType,
            },
          },
        ],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  // 4. Notify user
  await notifyUser(withdrawal.userId, 'WITHDRAWAL_FAILED', {
    coins: withdrawal.coins,
    reason: payout.error_message,
  });

  // 5. Alert admin (Slack/Email)
  await alertAdmins('PAYOUT_FAILED', { withdrawal, payout });
}
```

---

## 10. Edge Cases & Error Handling

### 10.1 Comprehensive Edge Case Matrix

| Scenario                                                      | What Happens                                               | Handling                                                                                                            |
| ------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| User submits withdrawal but has insufficient balance          | Wallet atomic update fails                                 | `400 INSUFFICIENT_BALANCE` — no state change                                                                        |
| User submits while already having a PENDING request           | Guard check before creation                                | `409 WITHDRAWAL_IN_PROGRESS`                                                                                        |
| User submits while having a PROCESSING request                | Same guard                                                 | `409 WITHDRAWAL_IN_PROGRESS`                                                                                        |
| User tries to cancel a request that's PROCESSING              | Request is already at Razorpay                             | `400 CANNOT_CANCEL_PROCESSING` — suggest admin intervention                                                         |
| Admin approves same request twice (double-click)              | Status guard: must be `pending`                            | Idempotent — second call returns `400 ALREADY_PROCESSED`                                                            |
| UPI ID is invalid / doesn't exist                             | Razorpay returns fund account error                        | Mark as `failed`, return coins, notify user to fix UPI ID                                                           |
| User selects `upi` with `currency: 'USD'`                     | Validation rejects at submission                           | `400 UPI_NOT_SUPPORTED_FOR_USD` — UPI only works for INR                                                            |
| USD user provides IFSC code instead of routing/SWIFT          | Validation rejects at submission                           | `400 INVALID_PAYOUT_DETAILS_FOR_CURRENCY` — enforce currency-specific field rules                                   |
| USD payout — invalid ABA routing number                       | Razorpay rejects fund account creation                     | `400 INVALID_ROUTING_NUMBER` — no payout created, coins returned                                                    |
| USD payout — SWIFT code is malformed                          | Razorpay rejects fund account creation                     | `400 INVALID_SWIFT_CODE` — no payout created, coins returned                                                        |
| USD minimum not met (< 5000 coins)                            | Validation fails at submission                             | `400 BELOW_MINIMUM` with message showing $50.00 minimum                                                             |
| Conversion rate changes between submit and approval           | Rate was snapshotted at submit time                        | Use `withdrawal.conversionRate` for all calculations — never re-fetch from config                                   |
| Admin approves USD request but INR RazorpayX account used     | Wrong account number passed to Razorpay                    | `getPayoutAccountNumber(currency)` helper must route to the correct account                                          |
| Bank account number is wrong                                  | Payout `reversed` within 24-48 hrs                         | `handlePayoutFailed` returns coins automatically                                                                    |
| IFSC code is invalid                                          | Razorpay rejects fund account creation                     | `400 INVALID_IFSC` — no payout created, no coins deducted yet                                                       |
| RazorpayX account has insufficient balance                    | Payout remains `queued` until topped up                    | `queue_if_low_balance: true` — auto-processes when funds available                                                  |
| Webhook never arrives (Razorpay outage)                       | Payout stuck in `processing`                               | Admin retry: poll `GET /payouts/:id` and manually update status                                                     |
| Webhook arrives twice for `payout.processed`                  | Idempotency check: `status === 'completed'`                | Second webhook is a no-op                                                                                           |
| User earned coins, then admin adjusts/debits                  | Balance could be lower than pendingWithdrawal              | Admin debits must check `balance >= amount` and cannot touch `pendingWithdrawal`                                    |
| Payout reversed by bank after `processed` status              | `payout.reversed` webhook fires after `processed`          | Re-run `handlePayoutFailed` (check: if `status === 'completed'`, still reverse — coins already credited, now debit) |
| Network timeout when calling Razorpay Payouts API             | Request may or may not have succeeded                      | Use idempotency key — retry safely; Razorpay deduplicates                                                           |
| Admin accidentally creates duplicate payouts                  | Same `reference_id` sent twice                             | Idempotency key prevents duplicate on Razorpay side                                                                 |
| User's coin balance changes between submit and admin approval | Coins already locked in `pendingWithdrawal` at submit time | No issue — locked coins are protected                                                                               |
| Platform disables withdrawals mid-review                      | `isWithdrawalEnabled = false` in config                    | Only block new submissions; in-review requests proceed                                                              |
| Processing fee configured in `PlatformCoinConfig`             | Fee must be deducted at submission time                    | `coins -= processingFeeCoin` before computing `amountInr` or `amountUsd`                                            |
| Admin rejects but webhook for payout.processed arrives        | Race: admin rejected but Razorpay already processed        | Guard: webhook should check if coins were already returned; create reverse debit if needed                          |

---

### 10.2 One-Withdrawal-At-A-Time Enforcement

```typescript
// Before creating a new WithdrawalRequest:
const activeRequest = await WithdrawalRequest.findOne({
  userId,
  status: { $in: ['pending', 'approved', 'processing'] },
});

if (activeRequest) {
  throw ApiError.conflict(
    'WITHDRAWAL_IN_PROGRESS',
    `You already have an active withdrawal request (status: ${activeRequest.status}). ` +
      'Please wait for it to complete before submitting a new one.'
  );
}
```

---

### 10.3 Minimum Withdrawal Enforcement

```typescript
const config = await PlatformCoinConfig.findOne({ _singleton: 'config' });

if (!config?.withdrawal.isWithdrawalEnabled) {
  throw ApiError.serviceUnavailable('WITHDRAWALS_DISABLED', 'Withdrawals are temporarily disabled');
}

// Currency-specific minimum validation
if (currency === 'INR') {
  const minCoins = config.withdrawal.minWithdrawalCoinsInr; // default: 500
  if (coins < minCoins) {
    throw ApiError.badRequest(
      'BELOW_MINIMUM',
      `Minimum INR withdrawal is ${minCoins} coins (₹${minCoins})`
    );
  }
} else if (currency === 'USD') {
  const minCoins = config.withdrawal.minWithdrawalCoinsUsd; // default: 5000
  if (coins < minCoins) {
    const minUsd = (minCoins * config.withdrawal.coinToUsdRate).toFixed(2);
    throw ApiError.badRequest(
      'BELOW_MINIMUM',
      `Minimum USD withdrawal is ${minCoins} coins ($${minUsd})`
    );
  }
}

// UPI is not supported for USD
if (payoutMethod === 'upi' && currency === 'USD') {
  throw ApiError.badRequest('UPI_NOT_SUPPORTED_FOR_USD', 'UPI is only available for INR payouts');
}
```

---

### 10.4 Processing Fee Calculation

```typescript
const feeCoins = config.withdrawal.processingFeeCoin; // e.g. 10 coins platform fee
const netCoins = coins - feeCoins; // What user actually receives

if (netCoins <= 0) {
  throw ApiError.badRequest('FEE_EXCEEDS_WITHDRAWAL', 'Processing fee exceeds withdrawal amount');
}

// Compute currency-specific amount using snapshotted rates
let amountInr: number | undefined;
let amountUsd: number | undefined;
let conversionRate: number;

if (currency === 'INR') {
  conversionRate = config.withdrawal.coinToInrRate; // e.g. 1.0
  amountInr = Math.floor(netCoins * conversionRate);
} else {
  conversionRate = config.withdrawal.coinToUsdRate; // e.g. 0.01
  amountUsd = parseFloat((netCoins * conversionRate).toFixed(2));
}
```

---

### 10.5 IFSC Code Validation — INR Only (Client + Server)

```typescript
// IFSC must be exactly 11 characters: 4 alpha + 0 + 6 alphanumeric
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

if (!IFSC_REGEX.test(ifscCode)) {
  throw ApiError.badRequest('INVALID_IFSC', 'Invalid IFSC code format');
}
```

---

### 10.6 UPI ID Validation — INR Only

```typescript
// Basic UPI format: localPart@provider
const UPI_REGEX = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;

if (!UPI_REGEX.test(upiId)) {
  throw ApiError.badRequest('INVALID_UPI_ID', 'Invalid UPI ID format');
}
```

---

### 10.7 ABA Routing Number Validation — USD ACH Only

```typescript
// ABA routing numbers are exactly 9 digits
const ABA_ROUTING_REGEX = /^[0-9]{9}$/;

if (!ABA_ROUTING_REGEX.test(routingNumber)) {
  throw ApiError.badRequest('INVALID_ROUTING_NUMBER', 'Invalid ABA routing number — must be 9 digits');
}
```

---

### 10.8 SWIFT/BIC Code Validation — USD SWIFT Only

```typescript
// SWIFT/BIC: 8 or 11 alphanumeric characters
const SWIFT_REGEX = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

if (!SWIFT_REGEX.test(swiftCode.toUpperCase())) {
  throw ApiError.badRequest('INVALID_SWIFT_CODE', 'Invalid SWIFT/BIC code format');
}
```

---

### 10.9 Razorpay API Error Codes

| Razorpay Error Code     | Meaning                                         | Our Response                            |
| ----------------------- | ----------------------------------------------- | --------------------------------------- |
| `BAD_REQUEST_ERROR`     | Invalid parameters (bad IFSC, missing fields)   | `400` — surface to admin                |
| `GATEWAY_ERROR`         | Bank rejected the payout                        | Retry once; if persistent, mark failed  |
| `SERVER_ERROR`          | Razorpay internal error                         | Retry with exponential backoff          |
| `INSUFFICIENT_FUNDS`    | RazorpayX account has no balance                | Queue it (`queue_if_low_balance: true`) |
| `INVALID_ACCOUNT`       | Bank account doesn't exist                      | Mark failed, return coins, notify user  |
| `BENEFICIARY_BANK_DOWN` | Destination bank is offline (usually temporary) | Retry after 30 min                      |

---

## 11. Payout Service Implementation

```typescript
// src/infrastructure/razorpay/razorpayPayout.service.ts

import Razorpay from 'razorpay';
import { env } from '@/config/env';

export class RazorpayPayoutService {
  private razorpay: Razorpay;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }

  // ── Create Contact ─────────────────────────────────────────────────────────
  async createContact(params: {
    name: string;
    email: string;
    contact?: string;
    userId: string;
  }): Promise<{ id: string }> {
    const response = await this.razorpay.contacts.create({
      name: params.name,
      email: params.email,
      contact: params.contact,
      type: 'employee',
      reference_id: params.userId,
      notes: { platform: 'storychain', userId: params.userId },
    });
    return { id: response.id };
  }

  // ── Create Fund Account — UPI ───────────────────────────────────────────────
  async createUPIFundAccount(contactId: string, upiId: string): Promise<{ id: string }> {
    const response = await (this.razorpay as any).fundAccount.create({
      contact_id: contactId,
      account_type: 'vpa',
      vpa: { address: upiId },
    });
    return { id: response.id };
  }

  // ── Create Fund Account — Bank ─────────────────────────────────────────────
  async createBankFundAccount(
    contactId: string,
    bankDetails: {
      name: string;
      ifsc: string;
      accountNumber: string;
    }
  ): Promise<{ id: string }> {
    const response = await (this.razorpay as any).fundAccount.create({
      contact_id: contactId,
      account_type: 'bank_account',
      bank_account: {
        name: bankDetails.name,
        ifsc: bankDetails.ifsc,
        account_number: bankDetails.accountNumber,
      },
    });
    return { id: response.id };
  }

  // ── Create Payout (INR + USD) ──────────────────────────────────────────────
  async createPayout(params: {
    fundAccountId: string;
    currency: 'INR' | 'USD';
    amount: number;          // In the major currency unit (INR rupees or USD dollars)
    mode: 'UPI' | 'IMPS' | 'NEFT' | 'RTGS' | 'ACH' | 'SWIFT';
    withdrawalRequestId: string;
    userId: string;
    narration?: string;
  }): Promise<{ id: string; status: string }> {
    const idempotencyKey = `withdrawal_${params.withdrawalRequestId}`;

    // Convert amount to smallest currency unit:
    // INR: rupees → paise (× 100)
    // USD: dollars → cents (× 100)
    const amountInSmallestUnit = Math.round(params.amount * 100);

    // Route to the correct RazorpayX account based on currency
    const accountNumber =
      params.currency === 'INR'
        ? env.RAZORPAYX_INR_ACCOUNT_NUMBER
        : env.RAZORPAYX_USD_ACCOUNT_NUMBER;

    const response = await (this.razorpay as any).payouts.create(
      {
        account_number: accountNumber,
        fund_account_id: params.fundAccountId,
        amount: amountInSmallestUnit,
        currency: params.currency,
        mode: params.mode,
        purpose: 'payout',
        queue_if_low_balance: true,
        reference_id: `withdrawal_${params.withdrawalRequestId}`,
        narration: params.narration ?? 'StoryChain Coin Withdrawal',
        notes: {
          userId: params.userId,
          withdrawalRequestId: params.withdrawalRequestId,
          currency: params.currency,
        },
      },
      {
        headers: { 'X-Payout-Idempotency': idempotencyKey },
      }
    );

    return { id: response.id, status: response.status };
  }

  // ── Fetch Payout Status ────────────────────────────────────────────────────
  async fetchPayoutStatus(payoutId: string): Promise<{ status: string }> {
    const response = await (this.razorpay as any).payouts.fetch(payoutId);
    return { status: response.status };
  }

  // ── Cancel Payout ──────────────────────────────────────────────────────────
  async cancelPayout(payoutId: string): Promise<void> {
    await (this.razorpay as any).payouts.cancel(payoutId);
  }
}
```

---

### Payout Mode Selection Logic

```typescript
type PayoutMode = 'UPI' | 'IMPS' | 'NEFT' | 'RTGS' | 'ACH' | 'SWIFT';

function getPayoutMode(
  currency: 'INR' | 'USD',
  payoutMethod: 'upi' | 'bank_transfer',
  amount: number,        // In major unit: rupees for INR, dollars for USD
  country?: string       // ISO 3166-1 alpha-2 — only relevant for USD SWIFT
): PayoutMode {
  if (currency === 'INR') {
    if (payoutMethod === 'upi') {
      return 'UPI'; // Always instant via UPI (INR only)
    }
    // INR bank transfer — mode based on amount
    if (amount >= 200000) {
      return 'RTGS'; // ₹2,00,000+ — same-day, high-value
    }
    return 'IMPS'; // < ₹2,00,000 — instant, 24/7
    // Use 'NEFT' only if IMPS is unavailable
  }

  // USD bank transfer
  if (country === 'US' || !country) {
    return 'ACH'; // US domestic — 1-3 business days, low cost
  }
  return 'SWIFT'; // International wire — 3-5 business days
}
```

> **USD ACH vs SWIFT decision**: If the user provides a `routingNumber` (ABA), use `ACH`. If they provide a `swiftCode`, use `SWIFT`. The field presence drives the mode automatically.

---

## 12. Admin Approval Flow

### Full Approve Handler

```typescript
// src/features/withdrawalRequest/services/withdrawalRequest.service.ts

async function approveWithdrawal(
  withdrawalId: string,
  adminId: string,
  adminNote?: string
): Promise<void> {
  // 1. Fetch and lock the withdrawal request
  const withdrawal = await WithdrawalRequest.findById(withdrawalId);
  if (!withdrawal) throw ApiError.notFound('NOT_FOUND', 'Withdrawal request not found');
  if (withdrawal.status !== 'pending') {
    throw ApiError.conflict(
      'ALREADY_PROCESSED',
      `Withdrawal is already in status: ${withdrawal.status}`
    );
  }

  // 2. Fetch user details for Razorpay Contact
  const user = await User.findOne({ clerkId: withdrawal.userId });
  if (!user) throw ApiError.notFound('USER_NOT_FOUND', 'User not found');

  // 3. Create Razorpay Contact
  const { id: contactId } = await razorpayPayoutService.createContact({
    name: user.displayName,
    email: user.email,
    contact: user.phoneNumber,
    userId: withdrawal.userId,
  });

  // 4. Create Fund Account
  let fundAccountId: string;

  if (withdrawal.payoutMethod === 'upi') {
    const result = await razorpayPayoutService.createUPIFundAccount(
      contactId,
      withdrawal.payoutDetails.upiId!
    );
    fundAccountId = result.id;
  } else {
    const result = await razorpayPayoutService.createBankFundAccount(contactId, {
      name: withdrawal.payoutDetails.accountName!,
      ifsc: withdrawal.payoutDetails.ifscCode!,
      accountNumber: withdrawal.payoutDetails.accountNumber!,
    });
    fundAccountId = result.id;
  }

  // 5. Determine payout mode based on currency and payout details
  const country = withdrawal.payoutDetails.country; // For SWIFT routing
  const payoutAmount =
    withdrawal.currency === 'INR' ? withdrawal.amountInr! : withdrawal.amountUsd!;
  const mode = getPayoutMode(withdrawal.currency, withdrawal.payoutMethod, payoutAmount, country);

  // 6. Create payout — routes to INR or USD RazorpayX account automatically
  const { id: payoutId, status: payoutStatus } = await razorpayPayoutService.createPayout({
    fundAccountId,
    currency: withdrawal.currency,
    amount: payoutAmount,
    mode,
    withdrawalRequestId: withdrawal._id.toString(),
    userId: withdrawal.userId,
    narration: `StoryChain Coin Withdrawal — ${withdrawal.currency}`,
  });

  // 7. Update DB
  await WithdrawalRequest.findByIdAndUpdate(withdrawalId, {
    status: 'processing',
    razorpayFundAccountId: fundAccountId,
    razorpayPayoutId: payoutId,
    razorpayPayoutStatus: payoutStatus,
    payoutInitiatedAt: new Date(),
    reviewedBy: adminId,
    reviewedAt: new Date(),
    adminNote,
  });

  // 8. Notify user with currency-appropriate message
  const amountDisplay =
    withdrawal.currency === 'INR'
      ? `₹${withdrawal.amountInr}`
      : `$${withdrawal.amountUsd?.toFixed(2)}`;
  const estimatedTime =
    mode === 'UPI' ? 'a few minutes'
    : mode === 'IMPS' ? '30 minutes'
    : mode === 'ACH' ? '1-3 business days'
    : mode === 'SWIFT' ? '3-5 business days'
    : '1-4 hours';

  await notifyUser(withdrawal.userId, 'WITHDRAWAL_PROCESSING', {
    coins: withdrawal.coins,
    amount: amountDisplay,
    currency: withdrawal.currency,
    estimatedTime,
  });
}
```

---

## 13. Refunds & Reversals

### When Razorpay Reverses a Payout

Razorpay can reverse a `processed` payout (rare, but happens when):

- Beneficiary bank account is closed or frozen
- Duplicate payment detected by the bank
- RBI/NPCI regulatory hold

**Our handling**: The `payout.reversed` webhook triggers `handlePayoutFailed`, which:

1. Checks if withdrawal is `completed` → still processes the reversal
2. Debits coins back from wallet (since they were released on `processed`)
3. Sets `pendingWithdrawal` appropriately
4. Creates a `debit` CoinTransaction with note `Payout reversed by bank`
5. Alerts admins for manual investigation

> ⚠️ **Important**: After a reversal, the user's coins are returned but the payout has already been confirmed as processed. Admin must investigate if the actual money was or wasn't received by the user.

### Manual Refund by Admin

If a user complains they never received money (and Razorpay shows `processed`):

1. Admin checks Razorpay Dashboard for the `pout_xxxx` payout details
2. Raises a support ticket with Razorpay
3. If Razorpay confirms non-delivery, admin can manually trigger `retry` endpoint which creates a **new payout** with a new idempotency key

```http
POST /api/v1/admin/withdrawal-requests/:id/retry
```

> This endpoint creates a new Razorpay payout using the same fund account but a **new idempotency key suffix** (e.g., `withdrawal_<id>_retry1`).

---

## 14. Testing Strategy

### 13.1 Razorpay Test Mode Setup

1. Use `rzp_test_` keys for all development/staging.
2. In test mode, payouts are **simulated** — they don't actually transfer money.
3. Use Razorpay Test Dashboard → Payouts to manually trigger status changes.

### 13.2 Test Fund Accounts (Test Mode)

```
UPI:   success@razorpay   → payout.processed
UPI:   failure@razorpay   → payout.failed

Bank:  HDFC0000001 + any 11-digit account → payout.processed
Bank:  ICIC0000001 + any 11-digit account → payout.failed (simulated)
```

### 14.3 Test Checklist

**INR Scenarios:**

| Scenario                       | Test Input                          | Expected Result                          |
| ------------------------------ | ----------------------------------- | ---------------------------------------- |
| Successful UPI withdrawal      | 500 coins, INR, `success@razorpay`  | Completed, `totalWithdrawn` incremented  |
| Successful INR bank withdrawal | 500 coins, INR, HDFC bank           | Completed, amountInr = 500               |
| Below INR minimum              | 100 coins, INR (min: 500)           | `400 BELOW_MINIMUM` (₹500 min)           |
| UPI with USD currency          | 500 coins, USD, `upi` method        | `400 UPI_NOT_SUPPORTED_FOR_USD`          |
| Invalid IFSC code              | `HDFC123456`                        | `400 INVALID_IFSC`                       |
| Failed INR payout              | `failure@razorpay`                  | Coins back in balance                    |

**USD Scenarios:**

| Scenario                       | Test Input                                         | Expected Result                                  |
| ------------------------------ | -------------------------------------------------- | ------------------------------------------------ |
| Successful USD ACH withdrawal  | 5000 coins, USD, valid routing + account number    | Completed, amountUsd = 50.00, mode = ACH         |
| Successful USD SWIFT withdrawal| 5000 coins, USD, valid SWIFT code, country = "GB" | Completed, amountUsd = 50.00, mode = SWIFT       |
| Below USD minimum              | 1000 coins, USD (min: 5000)                        | `400 BELOW_MINIMUM` ($50.00 min)                 |
| Invalid ABA routing number     | 8-digit routing number                             | `400 INVALID_ROUTING_NUMBER`                     |
| Invalid SWIFT code             | `ABCD123` (malformed)                              | `400 INVALID_SWIFT_CODE`                         |
| USD payout uses correct account| Approve USD request                               | Payout created against `RAZORPAYX_USD_ACCOUNT_NUMBER` |
| Conversion rate snapshot       | Submit at rate 0.01, rate changes to 0.02 later   | Payout uses original 0.01 rate                   |

**Shared Scenarios:**

| Scenario                       | Test Input                          | Expected Result                          |
| ------------------------------ | ----------------------------------- | ---------------------------------------- |
| Insufficient balance           | Request 600 coins with 500 balance  | `400 INSUFFICIENT_BALANCE`               |
| Double withdrawal request      | Submit two requests simultaneously  | Second gets `409 WITHDRAWAL_IN_PROGRESS` |
| Admin double-approve           | Click approve twice                 | Second gets `400 ALREADY_PROCESSED`      |
| Reversed payout                | Manually trigger via test dashboard | Coins debited back, admin alerted        |
| Webhook signature mismatch     | Send wrong HMAC signature           | `401 INVALID_SIGNATURE`, no state change |
| Webhook received twice         | Replay same webhook event           | Idempotent — no double state change      |

### 14.4 Webhook Local Testing

Use [ngrok](https://ngrok.com) or Razorpay's webhook simulator:

```bash
# Expose local server
ngrok http 3000

# Or use Razorpay Dashboard → Webhooks → Send Test Webhook
```

---

## 15. Environment Variables

Add these to your `.env` file:

```env
# ── Razorpay Core (shared with payment gateway) ───────────────────────────────
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# ── RazorpayX Payout — INR Account ───────────────────────────────────────────
RAZORPAYX_INR_ACCOUNT_NUMBER=2323230016898972    # INR-funded RazorpayX account

# ── RazorpayX Payout — USD Account ───────────────────────────────────────────
RAZORPAYX_USD_ACCOUNT_NUMBER=2323230099112233    # USD-funded RazorpayX account (RazorpayX International)

# ── Payout Webhook ────────────────────────────────────────────────────────────
RAZORPAY_PAYOUT_WEBHOOK_SECRET=xxxxxxxxxxxxxxxx  # Separate from payment webhook secret
```

> **Note**: `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are the same for both payment gateway and payout API. The two separate account numbers point to your INR and USD RazorpayX virtual accounts respectively.

### Env Schema Validation (Zod)

```typescript
// src/config/env.ts — Add payout validations

const envSchema = z.object({
  // ... existing fields ...

  RAZORPAYX_INR_ACCOUNT_NUMBER: z.string().min(10, 'Invalid RazorpayX INR account number'),
  RAZORPAYX_USD_ACCOUNT_NUMBER: z.string().min(10, 'Invalid RazorpayX USD account number'),
  RAZORPAY_PAYOUT_WEBHOOK_SECRET: z.string().min(20, 'Payout webhook secret too short'),
});
```

---

## 16. Razorpay Dashboard Setup

### Step 1 — Enable RazorpayX

1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Navigate to **RazorpayX** → **Business Banking**
3. Complete KYC and business verification
4. Add funds to your RazorpayX account

### Step 2 — Get Account Number

1. RazorpayX → **My Account** → **Account Details**
2. Copy the virtual account number → save as `RAZORPAYX_ACCOUNT_NUMBER`

### Step 3 — Register Payout Webhook

1. RazorpayX Dashboard → **Settings** → **Webhooks**
2. Click **Add New Webhook**:
   - **URL**: `https://your-api.com/api/v1/webhooks/razorpay-payouts`
   - **Secret**: Generate a strong secret → save as `RAZORPAY_PAYOUT_WEBHOOK_SECRET`
   - **Active Events**: Check all `payout.*` events
3. Save and note the webhook ID

### Step 4 — Enable Payouts API Access

1. RazorpayX Dashboard → **Settings** → **API Keys**
2. The same `KEY_ID` and `KEY_SECRET` from your payment gateway work for payouts.
3. Ensure your IP is whitelisted if you have IP restrictions enabled.

### Step 5 — Test in Test Mode

1. Switch dashboard to **Test Mode**
2. Create a test payout to verify your integration works end-to-end
3. Check test webhook delivery in **Webhooks** tab

---

## Summary of Key Invariants

> These must NEVER be violated:

1. **Wallet balance must never go below 0.** Use atomic MongoDB updates with `$gte` checks.
2. **`pendingWithdrawal` accurately reflects locked coins.** It decrements only when a request reaches terminal status (`completed`, `failed`, `rejected`).
3. **Every coin debit/credit has a corresponding `CoinTransaction` entry.** The ledger is the source of truth.
4. **Razorpay payouts must always use `X-Payout-Idempotency` header.** Prevents accidental double-payout.
5. **Webhook handlers must be idempotent.** Check terminal status before any state changes.
6. **Signature verification must happen before any processing.** Never trust a webhook without verifying its HMAC.
7. **Admin approval atomically transitions `status: 'pending' → 'processing'`.** Use `findOneAndUpdate` with `status: 'pending'` filter as a guard.
8. **Conversion rate is snapshotted at submission time.** Never re-compute from live config during approval — always use `withdrawal.conversionRate`.
9. **Currency determines the RazorpayX account number.** INR payouts → `RAZORPAYX_INR_ACCOUNT_NUMBER`; USD payouts → `RAZORPAYX_USD_ACCOUNT_NUMBER`. Never mix them.
10. **UPI is INR-only.** Reject any request with `payoutMethod: 'upi'` and `currency: 'USD'` at validation time, before any DB writes.
