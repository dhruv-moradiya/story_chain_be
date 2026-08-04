# 💸 Payout System — Razorpay (INR) + Wise (Any Currency)

> **Platform:** StoryChain Backend (Fastify + TypeScript + MongoDB + BullMQ)
> **INR Payouts:** Razorpay X-Payout API — UPI · IMPS · NEFT · RTGS
> **All Other Currencies:** Wise (TransferWise) Payouts API — INR → USD · GBP · EUR · AUD · SGD · 50+ more
> **Coin Economy:** 1 Coin = ₹1 (INR) — single universal rate, configurable via `PlatformCoinConfig`
> **Money Source:** Deducted from your Indian INR account in both cases (Razorpay via RazorpayX, Wise via Wise INR balance)
> **Last Updated:** July 2026

---

## Table of Contents

1. [Why Two Gateways?](#1-why-two-gateways)
2. [How the System Decides Which Gateway to Use](#2-how-the-system-decides-which-gateway-to-use)
3. [Coin → Money Conversion Economics](#3-coin--money-conversion-economics)
4. [Existing Models & What Needs to Change](#4-existing-models--what-needs-to-change)
   - 4.1 [WithdrawalRequest Model Changes](#41-withdrawalrequest-model-changes)
   - 4.2 [Wallet Model (No Changes Needed)](#42-wallet-model-no-changes-needed)
   - 4.3 [PlatformCoinConfig Changes](#43-platformcoinconfig-changes)
   - 4.4 [CoinTransaction Model (No Changes Needed)](#44-cointransaction-model-no-changes-needed)
5. [New Models to Create](#5-new-models-to-create)
   - 5.1 [UserPayoutProfile Model](#51-userpayoutprofile-model)
6. [New Infrastructure Files to Create](#6-new-infrastructure-files-to-create)
   - 6.1 [WisePayoutService](#61-wisepayoutservice)
   - 6.2 [RazorpayPayoutService (extracted from RazorpayService)](#62-razorpaypayoutservice)
   - 6.3 [PayoutRouter (Gateway Selector)](#63-payoutrouter-gateway-selector)
7. [Complete Withdrawal Flow — Step by Step](#7-complete-withdrawal-flow--step-by-step)
   - 7.1 [User Submits Request](#71-user-submits-request)
   - 7.2 [Admin Reviews the Queue](#72-admin-reviews-the-queue)
   - 7.3 [Admin Approves → Gateway Dispatch](#73-admin-approves--gateway-dispatch)
   - 7.4 [Admin Rejects → Coins Returned](#74-admin-rejects--coins-returned)
   - 7.5 [Webhook Updates Status](#75-webhook-updates-status)
8. [Razorpay Payout — Indian Users](#8-razorpay-payout--indian-users)
   - 8.1 [Razorpay X-Payout Concepts](#81-razorpay-x-payout-concepts)
   - 8.2 [Razorpay API Calls Sequence](#82-razorpay-api-calls-sequence)
   - 8.3 [Razorpay Payout Modes & Speeds](#83-razorpay-payout-modes--speeds)
   - 8.4 [Razorpay Webhook Events](#84-razorpay-webhook-events)
9. [Wise Payout — International Users](#9-wise-payout--international-users)
   - 9.1 [Wise API Concepts](#91-wise-api-concepts)
   - 9.2 [Wise API Calls Sequence](#92-wise-api-calls-sequence)
   - 9.3 [Wise Webhook Events](#93-wise-webhook-events)
   - 9.4 [Wise Supported Countries & Currencies](#94-wise-supported-countries--currencies)
10. [API Endpoints (StoryChain)](#10-api-endpoints-storychain)
11. [DTOs & Validation Schemas](#11-dtos--validation-schemas)
12. [Enum Changes Required](#12-enum-changes-required)
13. [BullMQ Job: Payout Dispatcher](#13-bullmq-job-payout-dispatcher)
14. [Security Design](#14-security-design)
15. [Error Handling & Edge Cases](#15-error-handling--edge-cases)
16. [Admin Dashboard — Withdrawal Queue](#16-admin-dashboard--withdrawal-queue)
17. [Environment Variables](#17-environment-variables)
18. [Testing Strategy](#18-testing-strategy)
19. [Implementation Checklist](#19-implementation-checklist)

---

## 1. Why Two Gateways?

| Aspect | Razorpay X-Payout | Wise Payouts API |
|---|---|---|
| **When to Use** | User wants payout in **INR** | User wants payout in **any other currency** |
| **Source of Funds** | Your RazorpayX INR balance | Your Wise INR balance |
| **Supported Target Currencies** | INR only | 50+ currencies (USD, GBP, EUR, AUD, SGD...) |
| **Indian UPI Support** | ✅ Yes — instant | ❌ No |
| **NEFT / IMPS / RTGS** | ✅ Yes | ❌ No |
| **SEPA (Europe)** | ❌ No | ✅ Yes |
| **ACH (US domestic)** | ❌ No | ✅ Yes |
| **Local Rails (160+ countries)** | ❌ No | ✅ Yes — fastest & cheapest |
| **FX Conversion** | Not needed (INR → INR) | INR → target currency at mid-market rate |
| **Transfer Speed** | Instant (UPI/IMPS) to 4 hrs (NEFT) | 1-3 business days (local rails) |
| **Compliance** | RBI/NPCI | FEMA + destination country regulations |
| **Webhook Reliability** | Good | Excellent |

**The Decision Logic:**

```
User chooses their desired payout currency
  → INR          → Razorpay X-Payout  (UPI / Bank Transfer)
  → USD / GBP
    EUR / AUD
    or any other  → Wise Payouts API   (INR → target currency via Wise FX)
```

> **Key insight:** The money always leaves your Indian account in INR. For Wise payouts, Wise automatically converts your INR to the user's chosen currency at the live mid-market rate. The user is NOT limited by their country — an Indian user can request a USD or GBP payout if they have a foreign bank account.

---

## 2. How the System Decides Which Gateway to Use

```
User chooses desired payout currency in the request
              │
              ▼
    desiredCurrency === 'INR' ?
              │
      YES     │      NO
              │
    ──────────┴────────────────────────────────
    │                                          │
    ▼                                          ▼
Razorpay X-Payout                     Wise Payouts API
(UPI / Bank Transfer)                 (INR → target currency)
source: RazorpayX INR account         source: Wise INR balance
payoutGateway = 'razorpay'            payoutGateway = 'wise'
currency = 'INR'                      currency = 'USD' | 'GBP' | 'EUR' | ...
```

The `payoutGateway` field is set at submission time based on the user's chosen `desiredCurrency` and **never changed** afterward. This ensures the correct webhook handler is used later.

> **Any user can choose any currency.** An Indian user with a US bank account can choose USD. A US user can choose GBP. The gateway is decided purely by what currency the user wants to receive — not their location.

---

## 3. Coin → Money Conversion Economics

### Universal Rule: Coins → INR First, Always

There is only **one conversion rate**: `coinToInrRate` (default: 1 coin = ₹1). This applies to **all payouts**, regardless of the target currency.

- For **INR payouts** (Razorpay): The INR amount is transferred directly.
- For **foreign currency payouts** (Wise): The INR amount is sent to Wise, which converts it to the target currency at the live mid-market rate.

### Payout Amount Examples

| Desired Currency | Coins | INR Equivalent | What Wise Sends | Gateway |
|---|---|---|---|---|
| **INR** | 500 | ₹500.00 | — (direct transfer) | Razorpay |
| **USD** | 5,000 | ₹5,000 → Wise FX | ~$60.00 (at ₹83/$ rate) | Wise |
| **GBP** | 5,000 | ₹5,000 → Wise FX | ~£47.00 (at ₹106/£ rate) | Wise |
| **EUR** | 5,000 | ₹5,000 → Wise FX | ~€55.00 (at ₹91/€ rate) | Wise |
| **AUD** | 5,000 | ₹5,000 → Wise FX | ~$90.00 AUD (at ₹55/AUD) | Wise |
| **SGD** | 5,000 | ₹5,000 → Wise FX | ~$90.00 SGD (at ₹62/SGD) | Wise |

> ⚠️ FX rates above are illustrative only. Actual rates are provided by Wise at transfer time.

### Conversion Formula

```typescript
// ALL payouts — coins are always converted to INR first
const amountInr = Math.floor(coins * platformConfig.coinToInrRate);
// e.g. 5000 coins × 1.0 = ₹5,000

// For Wise payouts: amountInr (in paise) is sent to Wise as sourceAmount in INR.
// Wise then converts INR → target currency at the live mid-market rate.
// The exact target amount the user receives is shown in the Wise Quote response.
```

### Minimum Withdrawal Thresholds

```typescript
// INR (Razorpay) — small minimum since no FX overhead
minWithdrawalCoinsInr: 500   // = ₹500 minimum

// Non-INR (Wise) — higher minimum to cover Wise transfer fees
minWithdrawalCoinsWise: 5000  // = ₹5,000 minimum (Wise fees ~₹200-400)
```

### Platform Fee (Processing Fee)

```typescript
// Configurable in PlatformCoinConfig.withdrawal.processingFeeCoin
const netCoins = coins - platformConfig.withdrawal.processingFeeCoin;
// Default: 0 (no platform processing fee)
```

> **Important:** For Wise payouts, Wise charges its own transfer fee (typically ₹200–₹600 depending on target currency and amount). This is deducted from the INR amount before conversion — the user receives the amount after Wise fees. Show the estimated target amount from the Wise Quote to the user before they confirm.

---

## 4. Existing Models & What Needs to Change

### 4.1 WithdrawalRequest Model Changes

**Current `withdrawalRequest.model.ts`** (`src/models/withdrawalRequest.model.ts`):

```typescript
// CURRENT state — INR-only, no currency field, no Wise support
payoutMethod: 'upi' | 'bank_transfer'
payoutDetails: { upiId, accountNumber, ifscCode, accountName, bankName }
razorpayPayoutId: String
razorpayFundAccountId: String
razorpayPayoutStatus: String
```

**Required Changes:**

```typescript
// ── ADD these new fields to WithdrawalRequest schema ──────────────────────────

// Currency & Gateway Selection
desiredCurrency: { type: String, enum: ['INR', 'USD', 'GBP', 'EUR', 'AUD', 'CAD', 'SGD', 'JPY', 'AED', 'NZD', 'CHF'], required: true }
payoutGateway: { type: String, enum: ['razorpay', 'wise'], required: true }
amountInr: { type: Number, required: true }   // ALWAYS populated — coins × coinToInrRate
// Note: amountUsd / amountGbp etc. are NOT stored — Wise FX is live at transfer time
conversionRate: { type: Number, required: true }  // snapshot of coinToInrRate at request time

// For Wise payouts — estimated target amount shown at submission (from Quote preview)
wiseEstimatedTargetAmount: { type: Number }   // e.g. 60.00 for USD — for user display only
wiseEstimatedFee: { type: Number }            // Wise fee in INR — for user display only

// Wise Payout fields (NEW)
wiseTransferId: { type: Number }         // Wise transfer ID (numeric)
wiseQuoteId: { type: String }            // Wise quote UUID
wiseProfileId: { type: Number }          // Wise business profile ID
wisePayoutStatus: { type: String }       // incoming_payment_waiting | processing | funds_converted | outgoing_payment_sent | bounced_back | funds_refunded | cancelled
wiseTransferReference: { type: String }  // Reference code shown to user

// ── MODIFY payoutDetails sub-schema ───────────────────────────────────────────
// Add international bank fields:
routingNumber: { type: String, maxlength: 20 }       // ABA (US), Sort Code (UK), BSB (AU)
accountType: { type: String, enum: ['checking', 'savings', 'current'] }
swiftCode: { type: String, maxlength: 15 }           // BIC/SWIFT for SWIFT wire
ibanNumber: { type: String, maxlength: 34 }          // IBAN for SEPA (EU, UK)
bankAddress: { type: String, maxlength: 300 }
country: { type: String, maxlength: 2 }              // ISO 3166-1 alpha-2
targetCurrency: { type: String, maxlength: 3 }       // USD, GBP, EUR, AUD etc.
```

**Full updated model schema:**

```typescript
// src/models/withdrawalRequest.model.ts — UPDATED

const payoutDetailsSchema = new Schema(
  {
    // ── UPI (India only) ─────────────────────────────────
    upiId: { type: String, maxlength: 100 },

    // ── Bank Transfer — INR (India) ──────────────────────
    accountNumber: { type: String, maxlength: 34 },
    ifscCode: { type: String, maxlength: 15 },      // India only
    accountName: { type: String, maxlength: 100 },
    bankName: { type: String, maxlength: 100 },

    // ── Bank Transfer — International ────────────────────
    routingNumber: { type: String, maxlength: 20 }, // ABA (US) / Sort Code (UK) / BSB (AU)
    accountType: { type: String, enum: ['checking', 'savings', 'current'] },
    swiftCode: { type: String, maxlength: 15 },     // BIC/SWIFT code
    ibanNumber: { type: String, maxlength: 34 },    // IBAN (EU, UK)
    bankAddress: { type: String, maxlength: 300 },
    country: { type: String, maxlength: 2 },        // ISO 3166-1 alpha-2
    targetCurrency: { type: String, maxlength: 3 }, // User's local currency
  },
  { _id: false }
);

const withdrawalRequestSchema = new Schema<IWithdrawalRequestDoc>(
  {
    userId: { type: String, required: true, ref: 'User', index: true },
    coins: { type: Number, required: true, min: 1 },

    // ── Currency & Amount ──────────────────────────────────────────────
    // desiredCurrency: what currency the user wants to RECEIVE
    desiredCurrency: { type: String, enum: SUPPORTED_PAYOUT_CURRENCIES, required: true }, // NEW
    // amountInr: ALWAYS the INR amount debited from your account (coins × coinToInrRate)
    amountInr: { type: Number, required: true },                                           // NEW
    conversionRate: { type: Number, required: true }, // snapshot of coinToInrRate at submission // NEW

    // Wise estimated amounts (for user display — live rate at transfer time may differ)
    wiseEstimatedTargetAmount: { type: Number }, // e.g. 60.00 USD (from quote preview)   // NEW
    wiseEstimatedFee: { type: Number },          // Wise fee in INR (from quote preview)   // NEW

    // ── Gateway Selection ──────────────────────────────────────────────
    // 'razorpay' if desiredCurrency = 'INR', else 'wise'
    payoutGateway: { type: String, enum: PAYOUT_GATEWAYS, required: true },                // NEW

    // ── Payout Destination ─────────────────────────────────────────────
    payoutMethod: { type: String, enum: PAYOUT_METHODS, required: true },
    payoutDetails: { type: payoutDetailsSchema, required: true },

    // ── Status & Admin Review ──────────────────────────────────────────
    status: { type: String, enum: WITHDRAWAL_STATUSES, default: 'pending', index: true },
    reviewedBy: { type: String, ref: 'User' },
    reviewedAt: { type: Date },
    rejectionReason: { type: String, maxlength: 500 },
    adminNote: { type: String, maxlength: 500 },

    // ── Razorpay Payout (INR payouts only) ────────────────────────────
    razorpayPayoutId: { type: String },
    razorpayFundAccountId: { type: String },
    razorpayContactId: { type: String },              // NEW — store cont_xxxx
    razorpayPayoutStatus: { type: String },
    payoutInitiatedAt: { type: Date },
    payoutCompletedAt: { type: Date },
    payoutFailureReason: { type: String, maxlength: 300 },

    // ── Wise Payout (all non-INR currencies) ─────────────────────────
    wiseTransferId: { type: Number },                 // NEW — numeric transfer ID
    wiseQuoteId: { type: String },                    // NEW — quote UUID used for this transfer
    wiseProfileId: { type: Number },                  // NEW — Wise business profile ID
    wisePayoutStatus: { type: String },               // NEW — Wise transfer state
    wiseTransferReference: { type: String },          // NEW — reference shown to recipient
    // Actual amounts after Wise processes (populated from webhook / transfer fetch)
    wiseActualSourceAmountInr: { type: Number },      // NEW — actual INR debited by Wise
    wiseActualTargetAmount: { type: Number },         // NEW — actual amount received by user
    wiseActualTargetCurrency: { type: String },       // NEW — same as desiredCurrency (sanity check)
  },
  { timestamps: true }
);

// Indexes
withdrawalRequestSchema.index({ userId: 1, createdAt: -1 });
withdrawalRequestSchema.index({ status: 1, createdAt: 1 });
withdrawalRequestSchema.index({ razorpayPayoutId: 1 }, { sparse: true });
withdrawalRequestSchema.index({ wiseTransferId: 1 }, { sparse: true });       // NEW
withdrawalRequestSchema.index({ payoutGateway: 1, status: 1 });               // NEW
withdrawalRequestSchema.index({ desiredCurrency: 1, status: 1 });             // NEW
```

---

### 4.2 Wallet Model (No Changes Needed)

The [`Wallet` model](../../src/models/wallet.model.ts) is gateway-agnostic. No changes required:

```typescript
// src/models/wallet.model.ts — NO CHANGES NEEDED
{
  userId: string;
  balance: number;           // Spendable coins
  totalEarned: number;       // Lifetime earned
  totalSpent: number;        // Lifetime spent
  totalWithdrawn: number;    // Lifetime successfully withdrawn (incremented on 'completed')
  pendingWithdrawal: number; // Locked during active withdrawal
}
```

**Invariant:** `balance + pendingWithdrawal` = total unspent coins.

---

### 4.3 PlatformCoinConfig Changes

**Current `withdrawal` section:**

```typescript
withdrawal: {
  minWithdrawalCoins: Number;      // default: 500
  processingFeeCoin: Number;       // default: 0
  isWithdrawalEnabled: Boolean;
}
```

**Add to `platformCoinConfig.model.ts`:**

```typescript
withdrawal: {
  // ── Existing ──────────────────────────────────────
  minWithdrawalCoins: { type: Number, default: 500 },
  processingFeeCoin: { type: Number, default: 0 },
  isWithdrawalEnabled: { type: Boolean, default: true },

  // ── NEW — Single Conversion Rate ───────────────────
  // All coins are always converted to INR first.
  // For Wise payouts, Wise then converts INR → target currency.
  coinToInrRate: { type: Number, default: 1.0 },             // 1 coin = ₹1.00

  // ── NEW — Minimum Withdrawal Thresholds ────────────
  minWithdrawalCoinsInr: { type: Number, default: 500 },     // INR via Razorpay (= ₹500 min)
  minWithdrawalCoinsWise: { type: Number, default: 5000 },   // Non-INR via Wise (= ₹5,000 min, covers Wise fees)

  // ── NEW — Gateway Kill Switches ─────────────────────
  wiseEnabled: { type: Boolean, default: true },             // Disable Wise payouts globally
  razorpayEnabled: { type: Boolean, default: true },         // Disable Razorpay payouts globally

  // ── NEW — Wise Supported Currencies ─────────────────
  // Admin-configurable list of currencies users can request via Wise
  wiseSupportedCurrencies: {
    type: [String],
    default: ['USD', 'GBP', 'EUR', 'AUD', 'CAD', 'SGD', 'NZD', 'CHF', 'JPY', 'AED'],
  },
}
```

---

### 4.4 CoinTransaction Model (No Changes Needed)

The [`CoinTransaction` model](../../src/models/coinTransaction.model.ts) already supports withdrawal reference via `withdrawalRequestId`. No changes needed.

---

## 5. New Models to Create

### 5.1 UserPayoutProfile Model

Store a user's **saved and verified** payout accounts to avoid re-entering bank details on every withdrawal.

**File:** `src/models/userPayoutProfile.model.ts`

```typescript
import mongoose, { Schema } from 'mongoose';

const userPayoutProfileSchema = new Schema(
  {
    userId: { type: String, required: true, ref: 'User', index: true },

    // ── Profile Identity ─────────────────────────────────────────────────
    nickname: { type: String, maxlength: 50 },  // e.g. "My HDFC Account"
    isDefault: { type: Boolean, default: false },

    // ── Gateway & Method ─────────────────────────────────────────────────
    payoutGateway: { type: String, enum: ['razorpay', 'wise'], required: true },
    payoutMethod: { type: String, enum: ['upi', 'bank_transfer'], required: true },
    currency: { type: String, maxlength: 3, required: true },  // INR, USD, GBP...

    // ── Payout Details (same structure as WithdrawalRequest.payoutDetails) ─
    payoutDetails: {
      upiId: { type: String, maxlength: 100 },
      accountNumber: { type: String, maxlength: 34 },
      ifscCode: { type: String, maxlength: 15 },
      accountName: { type: String, maxlength: 100 },
      bankName: { type: String, maxlength: 100 },
      routingNumber: { type: String, maxlength: 20 },
      accountType: { type: String, enum: ['checking', 'savings', 'current'] },
      swiftCode: { type: String, maxlength: 15 },
      ibanNumber: { type: String, maxlength: 34 },
      bankAddress: { type: String, maxlength: 300 },
      country: { type: String, maxlength: 2 },
      targetCurrency: { type: String, maxlength: 3 },
    },

    // ── Verification Status ──────────────────────────────────────────────
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    verificationMethod: { type: String, enum: ['admin_manual', 'penny_drop', 'wise_validation'] },

    // ── Gateway-Specific Saved IDs (avoid re-creating contacts/fund accounts) ─
    razorpayContactId: { type: String },       // cont_xxxx — reuse across requests
    razorpayFundAccountId: { type: String },   // fa_xxxx — reuse across requests
    wiseRecipientId: { type: Number },         // Wise recipient account ID

    // ── Soft Delete ──────────────────────────────────────────────────────
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

// One user can have multiple saved profiles
userPayoutProfileSchema.index({ userId: 1, isDeleted: 1 });
userPayoutProfileSchema.index({ userId: 1, isDefault: 1 });

export const UserPayoutProfile = mongoose.model('UserPayoutProfile', userPayoutProfileSchema);
```

> **Why save Razorpay Contact & Fund Account IDs?**
> Razorpay charges per Fund Account creation. Reusing `fa_xxxx` across multiple withdrawal requests for the same bank account saves money and is faster.

---

## 6. New Infrastructure Files to Create

### 6.1 WisePayoutService

**File:** `src/infrastructure/payment/wise-payout.service.ts`

```typescript
import { singleton } from 'tsyringe';
import { env } from '@/config/env';
import { BaseModule } from '@/utils/baseClass';
import crypto from 'crypto';

/**
 * WisePayoutService — wraps the Wise (TransferWise) Payouts API.
 *
 * Uses Wise's Strong Customer Authentication (SCA) with RSA key pairs.
 * All calls require:
 *   Authorization: Bearer <WISE_API_TOKEN>
 *   For SCA endpoints: X-Signature-Version: v3 + X-Signature header (RSA signed)
 */
@singleton()
export class WisePayoutService extends BaseModule {
  private readonly apiToken: string;
  private readonly profileId: number;
  private readonly privateKey: string;
  private readonly webhookSecret: string;
  private readonly baseUrl: string;

  constructor() {
    super();
    const isProduction = env.NODE_ENV === 'production';
    this.apiToken = isProduction ? env.WISE_API_TOKEN_LIVE : env.WISE_API_TOKEN_SANDBOX;
    this.profileId = isProduction ? env.WISE_PROFILE_ID_LIVE : env.WISE_PROFILE_ID_SANDBOX;
    this.privateKey = env.WISE_PRIVATE_KEY; // RSA private key for SCA
    this.webhookSecret = env.WISE_WEBHOOK_PUBLIC_KEY; // For verifying Wise webhooks
    this.baseUrl = isProduction ? 'https://api.transferwise.com' : 'https://api.sandbox.transferwise.tech';
    this.logInfo(`WisePayoutService initialised in ${isProduction ? 'LIVE' : 'SANDBOX'} mode`);
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Step 1: Create a Quote — Get FX rates and transfer fees.
   * Required before creating a recipient or transfer.
   */
  async createQuote(params: {
    targetCurrency: string;   // User's desired currency: 'USD', 'GBP', 'EUR', 'AUD', etc.
    sourceAmountInr: number;  // Always INR — coins × coinToInrRate (e.g. 5000.00)
  }): Promise<{ id: string; rate: number; feeInr: number; targetAmount: number; sourceCurrency: string }> {
    const response = await fetch(`${this.baseUrl}/v3/profiles/${this.profileId}/quotes`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({
        sourceCurrency: 'INR',               // Always INR — money debited from your Indian account
        targetCurrency: params.targetCurrency,
        sourceAmount: params.sourceAmountInr, // INR amount (e.g. 5000.00)
        payOut: 'BANK_TRANSFER',
      }),
    });
    const data = await response.json();
    return {
      id: data.id,
      rate: data.rate,                                           // INR per 1 target currency unit
      feeInr: data.paymentOptions?.[0]?.fee?.total ?? 0,        // Wise fee in INR
      targetAmount: data.paymentOptions?.[0]?.targetAmount ?? 0, // Amount user will receive
      sourceCurrency: 'INR',
    };
  }

  /**
   * Step 2: Create / Get Recipient Account.
   * One recipient per bank account — Wise allows you to reuse recipient IDs.
   */
  async createRecipient(params: {
    currency: string;
    type: string;            // 'sort_code', 'iban', 'aba', 'australian', 'swift_code', etc.
    accountHolderName: string;
    details: Record<string, string>;
  }): Promise<{ id: number }> {
    const response = await fetch(`${this.baseUrl}/v1/accounts`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({
        profile: this.profileId,
        currency: params.currency,
        type: params.type,
        accountHolderName: params.accountHolderName,
        details: params.details,
      }),
    });
    const data = await response.json();
    return { id: data.id };
  }

  /**
   * Step 3: Create a Transfer.
   * Requires a valid quote ID and recipient account ID.
   * Returns a transfer ID that can be used to fund the transfer.
   */
  async createTransfer(params: {
    targetAccountId: number;
    quoteUuid: string;
    withdrawalRequestId: string;   // Our reference ID for idempotency
    reference?: string;            // Text shown to recipient
  }): Promise<{ id: number; status: string; reference: string }> {
    const idempotencyKey = `withdrawal_${params.withdrawalRequestId}`;
    const response = await fetch(`${this.baseUrl}/v1/transfers`, {
      method: 'POST',
      headers: {
        ...this.authHeaders(),
        'X-idempotence-uuid': idempotencyKey,
      },
      body: JSON.stringify({
        targetAccount: params.targetAccountId,
        quoteUuid: params.quoteUuid,
        customerTransactionId: idempotencyKey,
        details: {
          reference: params.reference ?? 'StoryChain Earnings',
          transferPurpose: 'BUSINESS_PAYMENT',
          sourceOfFunds: 'BUSINESS',
        },
      }),
    });
    const data = await response.json();
    return { id: data.id, status: data.status, reference: data.reference };
  }

  /**
   * Step 4: Fund the Transfer (SCA Required — RSA Signed Request).
   * This is the final step that actually moves the money.
   * Requires RSA-signed request headers (Strong Customer Authentication).
   */
  async fundTransfer(transferId: number): Promise<{ status: string }> {
    const url = `${this.baseUrl}/v3/profiles/${this.profileId}/transfers/${transferId}/payments`;
    const body = JSON.stringify({ type: 'BALANCE' });

    // SCA signature (required for funding)
    const signature = this.signRequest(url, body);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.authHeaders(),
        'X-Signature-Version': 'v3',
        'X-Signature': signature,
      },
      body,
    });
    const data = await response.json();
    return { status: data.status };
  }

  /**
   * Get transfer status for manual polling / reconciliation.
   */
  async getTransferStatus(transferId: number): Promise<{ status: string; reference: string }> {
    const response = await fetch(`${this.baseUrl}/v1/transfers/${transferId}`, {
      headers: this.authHeaders(),
    });
    const data = await response.json();
    return { status: data.status, reference: data.reference };
  }

  /**
   * Verify Wise webhook signature.
   * Wise signs webhooks with an RSA private key; we verify with their public key.
   */
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    try {
      const verifier = crypto.createVerify('SHA256');
      verifier.update(rawBody);
      return verifier.verify(this.webhookSecret, signatureHeader, 'base64');
    } catch {
      return false;
    }
  }

  /**
   * RSA-sign a request body for Wise SCA (Strong Customer Authentication).
   * Used when funding transfers.
   */
  private signRequest(url: string, body: string): string {
    const payload = `${url}\n${body}`;
    const signer = crypto.createSign('SHA256');
    signer.update(payload);
    return signer.sign(this.privateKey, 'base64');
  }
}
```

---

### 6.2 RazorpayPayoutService

Extract payout-specific logic from the existing `RazorpayService` into a dedicated service.

**File:** `src/infrastructure/payment/razorpay-payout.service.ts`

```typescript
import { singleton } from 'tsyringe';
import { env } from '@/config/env';
import { BaseModule } from '@/utils/baseClass';
import axios from 'axios';

/**
 * RazorpayPayoutService — handles Razorpay X-Payout API calls.
 *
 * Uses Basic Auth with RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET.
 * Separated from RazorpayService (which handles payments/orders) for clarity.
 */
@singleton()
export class RazorpayPayoutService extends BaseModule {
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly inrAccountNumber: string; // RazorpayX INR account number
  private readonly baseUrl = 'https://api.razorpay.com/v1';

  constructor() {
    super();
    const isProduction = env.NODE_ENV === 'production';
    this.keyId = isProduction ? env.RAZORPAY_KEY_ID_LIVE : env.RAZORPAY_KEY_ID_TEST;
    this.keySecret = isProduction ? env.RAZORPAY_KEY_SECRET_LIVE : env.RAZORPAY_KEY_SECRET_TEST;
    this.inrAccountNumber = env.RAZORPAYX_INR_ACCOUNT_NUMBER;
    this.logInfo(`RazorpayPayoutService initialised in ${isProduction ? 'LIVE' : 'TEST'} mode`);
  }

  private authConfig() {
    return { auth: { username: this.keyId, password: this.keySecret } };
  }

  /**
   * Step 1: Create a Contact for the payout recipient.
   * Only needed if we don't have an existing contact for the user.
   */
  async createContact(params: {
    name: string;
    email: string;
    contact?: string;
    userId: string;
  }): Promise<{ id: string }> {
    const { data } = await axios.post(
      `${this.baseUrl}/contacts`,
      {
        name: params.name,
        email: params.email,
        contact: params.contact,
        type: 'employee',
        reference_id: params.userId,
        notes: { platform: 'storychain', userId: params.userId },
      },
      this.authConfig()
    );
    return { id: data.id }; // cont_xxxxxxxx
  }

  /**
   * Step 2A: Create a VPA (UPI) Fund Account.
   */
  async createUPIFundAccount(params: {
    contactId: string;
    upiId: string;
  }): Promise<{ id: string }> {
    const { data } = await axios.post(
      `${this.baseUrl}/fund_accounts`,
      {
        contact_id: params.contactId,
        account_type: 'vpa',
        vpa: { address: params.upiId },
      },
      this.authConfig()
    );
    return { id: data.id }; // fa_xxxxxxxx
  }

  /**
   * Step 2B: Create a Bank Account Fund Account.
   */
  async createBankFundAccount(params: {
    contactId: string;
    accountName: string;
    ifscCode: string;
    accountNumber: string;
  }): Promise<{ id: string }> {
    const { data } = await axios.post(
      `${this.baseUrl}/fund_accounts`,
      {
        contact_id: params.contactId,
        account_type: 'bank_account',
        bank_account: {
          name: params.accountName,
          ifsc: params.ifscCode,
          account_number: params.accountNumber,
        },
      },
      this.authConfig()
    );
    return { id: data.id }; // fa_xxxxxxxx
  }

  /**
   * Step 3: Create the actual Payout (money out of RazorpayX to user).
   */
  async createPayout(params: {
    fundAccountId: string;
    amountPaise: number;         // Amount in paise (₹ × 100)
    mode: 'UPI' | 'NEFT' | 'IMPS' | 'RTGS';
    withdrawalRequestId: string;
    userId: string;
    narration?: string;
  }): Promise<{ id: string; status: string }> {
    const idempotencyKey = `withdrawal_${params.withdrawalRequestId}`;

    const { data } = await axios.post(
      `${this.baseUrl}/payouts`,
      {
        account_number: this.inrAccountNumber,
        fund_account_id: params.fundAccountId,
        amount: params.amountPaise,
        currency: 'INR',
        mode: params.mode,
        purpose: 'payout',
        queue_if_low_balance: true,
        reference_id: `withdrawal_${params.withdrawalRequestId}`,
        narration: params.narration ?? 'StoryChain Coin Withdrawal',
        notes: {
          userId: params.userId,
          withdrawalRequestId: params.withdrawalRequestId,
        },
      },
      {
        ...this.authConfig(),
        headers: { 'X-Payout-Idempotency': idempotencyKey },
      }
    );

    return { id: data.id, status: data.status }; // pout_xxxxxxxx, 'queued'
  }

  /**
   * Fetch payout status for manual reconciliation or admin polling.
   */
  async getPayoutStatus(payoutId: string): Promise<{ status: string }> {
    const { data } = await axios.get(`${this.baseUrl}/payouts/${payoutId}`, this.authConfig());
    return { status: data.status };
  }

  /**
   * Cancel a payout (only works while status = 'queued').
   */
  async cancelPayout(payoutId: string): Promise<void> {
    await axios.post(`${this.baseUrl}/payouts/${payoutId}/cancel`, {}, this.authConfig());
  }
}
```

---

### 6.3 PayoutRouter (Gateway Selector)

A clean routing service that decides which gateway to use.

**File:** `src/infrastructure/payment/payout-router.service.ts`

```typescript
import { inject, singleton } from 'tsyringe';
import { RazorpayPayoutService } from './razorpay-payout.service';
import { WisePayoutService } from './wise-payout.service';
import { BaseModule } from '@/utils/baseClass';

export type PayoutGateway = 'razorpay' | 'wise';

@singleton()
export class PayoutRouterService extends BaseModule {
  constructor(
    @inject(RazorpayPayoutService) private readonly razorpay: RazorpayPayoutService,
    @inject(WisePayoutService) private readonly wise: WisePayoutService
  ) {
    super();
  }

  /**
   * Decide the payout gateway based on user's country.
   * Indian users → Razorpay. Everyone else → Wise.
   */
  resolveGateway(userCountry: string): PayoutGateway {
    return userCountry === 'IN' ? 'razorpay' : 'wise';
  }

  getRazorpay(): RazorpayPayoutService {
    return this.razorpay;
  }

  getWise(): WisePayoutService {
    return this.wise;
  }
}
```

---

## 7. Complete Withdrawal Flow — Step by Step

### 7.1 User Submits Request

**Endpoint:** `POST /api/v1/withdrawal-requests`

**Decision diagram:**

```
User POSTs withdrawal request
           │
           ▼
1. Authenticate with Clerk JWT
2. Fetch PlatformCoinConfig
3. Check isWithdrawalEnabled
4. Read desiredCurrency from request body (e.g. 'INR', 'USD', 'GBP')
5. Determine payoutGateway:
   ├── desiredCurrency = 'INR'   → payoutGateway = 'razorpay'
   └── desiredCurrency = others  → payoutGateway = 'wise'
       └── Validate desiredCurrency is in PlatformCoinConfig.wiseSupportedCurrencies
6. Validate minimum coins:
   ├── payoutGateway = 'razorpay' → coins >= minWithdrawalCoinsInr  (default: 500)
   └── payoutGateway = 'wise'     → coins >= minWithdrawalCoinsWise  (default: 5000)
7. Validate payoutMethod:
   ├── 'upi'           → only allowed when desiredCurrency = 'INR'
   └── 'bank_transfer' → allowed for both gateways
8. Validate payoutDetails fields based on gateway + desiredCurrency
9. Compute amountInr (universal):
   amountInr = Math.floor(coins × platformConfig.coinToInrRate)
   // e.g. 5000 coins × 1.0 = ₹5,000.00
10. For Wise payouts — fetch a preview Quote (optional, for UX):
    Call Wise /quotes with sourceCurrency='INR', sourceAmount=amountInr, targetCurrency=desiredCurrency
    → Store wiseEstimatedTargetAmount + wiseEstimatedFee for user display
    (DO NOT store the quoteId — quotes expire in 30 min, re-create at approval time)
11. Check no existing PENDING or PROCESSING request for this user
12. [MongoDB Session/Transaction] atomically:
    a. wallet.balance -= coins  (guard: balance >= coins)
    b. wallet.pendingWithdrawal += coins
    c. Create WithdrawalRequest {
         status: 'pending',
         desiredCurrency,
         payoutGateway,
         amountInr,
         conversionRate: platformConfig.coinToInrRate, // snapshot
         wiseEstimatedTargetAmount, wiseEstimatedFee   // for display
       }
    d. Create CoinTransaction { type: 'withdrawal', direction: 'debit' }
13. Notify admin team (email/notification)
14. Return 201 with withdrawalRequestId + estimated amounts
```

**Request Body — INR via UPI (any user):**

```json
{
  "coins": 500,
  "desiredCurrency": "INR",
  "payoutMethod": "upi",
  "payoutDetails": {
    "upiId": "dhruv@okaxis"
  }
}
```

**Request Body — INR via Bank Transfer (any user):**

```json
{
  "coins": 1000,
  "desiredCurrency": "INR",
  "payoutMethod": "bank_transfer",
  "payoutDetails": {
    "accountNumber": "1234567890",
    "ifscCode": "HDFC0001234",
    "accountName": "Dhruv Moradiya",
    "bankName": "HDFC Bank"
  }
}
```

**Request Body — USD via ACH (any user with a US bank account):**

```json
{
  "coins": 5000,
  "desiredCurrency": "USD",
  "payoutMethod": "bank_transfer",
  "payoutDetails": {
    "accountNumber": "000123456789",
    "routingNumber": "021000021",
    "accountName": "John Smith",
    "bankName": "JPMorgan Chase",
    "accountType": "checking",
    "country": "US"
  }
}
```

**Request Body — GBP via UK Sort Code (any user with a UK bank account):**

```json
{
  "coins": 5000,
  "desiredCurrency": "GBP",
  "payoutMethod": "bank_transfer",
  "payoutDetails": {
    "accountNumber": "12345678",
    "routingNumber": "609210",
    "accountName": "Jane Smith",
    "bankName": "NatWest",
    "country": "GB"
  }
}
```

**Request Body — EUR via IBAN/SEPA (any user with a European bank account):**

```json
{
  "coins": 5000,
  "desiredCurrency": "EUR",
  "payoutMethod": "bank_transfer",
  "payoutDetails": {
    "ibanNumber": "DE89370400440532013000",
    "accountName": "Hans Mueller",
    "bankName": "Deutsche Bank",
    "country": "DE"
  }
}
```

**Request Body — AUD (Australian user or any user with an AUS account):**

```json
{
  "coins": 5000,
  "desiredCurrency": "AUD",
  "payoutMethod": "bank_transfer",
  "payoutDetails": {
    "accountNumber": "12345678",
    "routingNumber": "062001",
    "accountName": "Sarah Jones",
    "bankName": "CommBank",
    "country": "AU"
  }
}
```

> **Key Rule:** `desiredCurrency` is provided explicitly in the request body — the user picks what currency they want. The backend decides the gateway (`razorpay` for INR, `wise` for everything else). Any user, regardless of their country, can request any supported currency as long as they have the corresponding bank account.

---

### 7.2 Admin Reviews the Queue

**Endpoint:** `GET /api/v1/admin/withdrawal-requests?status=pending&sort=createdAt&order=asc`

Admin sees the FIFO queue with:

| Field | Description |
|---|---|
| `userId` + user details | Who is requesting |
| `coins` | Amount of coins |
| `payoutGateway` | `razorpay` (INR) or `wise` (all other currencies) |
| `desiredCurrency` | The currency user wants to receive (INR, USD, GBP, EUR...) |
| `amountInr` | INR amount that will be debited from your account |
| `wiseEstimatedTargetAmount` | Estimated amount in target currency (Wise, display only) |
| `wiseEstimatedFee` | Estimated Wise fee in INR |
| `payoutMethod` | `upi` or `bank_transfer` |
| `payoutDetails` | Bank / UPI destination details |
| `userCountry` | User's country (informational) |
| wallet history link | For fraud check |

---

### 7.3 Admin Approves → Gateway Dispatch

**Endpoint:** `POST /api/v1/admin/withdrawal-requests/:id/approve`

```
Admin approves
      │
      ▼
Fetch WithdrawalRequest — must be status = 'pending'
      │
      ├── payoutGateway = 'razorpay' ────────────────────────────────────────────────────┐
      │                                                                                  │
      │   Check UserPayoutProfile for saved contact/fund account                         │
      │   If exists → reuse razorpayContactId + razorpayFundAccountId                    │
      │   If not exists:                                                                 │
      │     A. POST /v1/contacts → cont_xxxx                                             │
      │     B. POST /v1/fund_accounts → fa_xxxx                                          │
      │     C. Save to UserPayoutProfile                                                 │
      │   D. POST /v1/payouts (INR, mode = UPI/IMPS/NEFT) → pout_xxxx                    │
      │   E. Update WithdrawalRequest:                                                   │
      │      status='processing', razorpayPayoutId, razorpayFundAccountId, payoutInitiatedAt │
      │                                                                                   │
      └── payoutGateway = 'wise' ─────────────────────────────────────────────────────────┐
                                                                                           │
          Check UserPayoutProfile for saved wiseRecipientId                               │
          If exists → reuse wiseRecipientId                                               │
          If not exists:                                                                   │
            A. POST /v3/profiles/:id/quotes (USD → targetCurrency) → quoteId             │
            B. POST /v1/accounts (create recipient) → recipientId                         │
            C. Save to UserPayoutProfile                                                   │
          D. POST /v1/transfers (link quote + recipient) → transferId                     │
          E. POST /v3/.../transfers/:id/payments (FUND — SCA required)                    │
          F. Update WithdrawalRequest:                                                     │
             status='processing', wiseTransferId, wiseQuoteId, payoutInitiatedAt          │
                                                                                           │
Both paths:                                                                               │
  ─ Notify user: "Your withdrawal of X coins is being processed"                         │
  ─ Do NOT release pendingWithdrawal yet — wait for webhook confirmation                 ─┘
```

---

### 7.4 Admin Rejects → Coins Returned

**Endpoint:** `POST /api/v1/admin/withdrawal-requests/:id/reject`

```json
{ "rejectionReason": "Invalid bank details — please verify account number and IFSC" }
```

**What happens:**

```
[MongoDB Session] atomically:
  1. WithdrawalRequest.status = 'rejected'
  2. WithdrawalRequest.rejectionReason = <reason>
  3. WithdrawalRequest.reviewedBy = adminId
  4. WithdrawalRequest.reviewedAt = new Date()
  5. Wallet.balance += coins        (coins returned)
  6. Wallet.pendingWithdrawal -= coins
  7. CoinTransaction: type='withdrawal', direction='credit', note='Withdrawal rejected — coins refunded'
  8. Notify user: "Your withdrawal was rejected — coins returned to wallet"
```

---

### 7.5 Webhook Updates Status

Both Razorpay and Wise send webhooks when transfer status changes:

| Gateway | Status → Our Status | Wallet Action |
|---|---|---|
| Razorpay `payout.processed` | `completed` | `pendingWithdrawal -= coins`, `totalWithdrawn += coins` |
| Razorpay `payout.reversed` | `failed` | `pendingWithdrawal -= coins`, `balance += coins` |
| Razorpay `payout.failed` | `failed` | `pendingWithdrawal -= coins`, `balance += coins` |
| Razorpay `payout.cancelled` | `failed` | `pendingWithdrawal -= coins`, `balance += coins` |
| Wise `transfer.outgoing_payment_sent` | `completed` | `pendingWithdrawal -= coins`, `totalWithdrawn += coins` |
| Wise `transfer.bounced_back` | `failed` | `pendingWithdrawal -= coins`, `balance += coins` |
| Wise `transfer.funds_refunded` | `failed` | `pendingWithdrawal -= coins`, `balance += coins` |
| Wise `transfer.cancelled` | `failed` | `pendingWithdrawal -= coins`, `balance += coins` |

---

## 8. Razorpay Payout — Indian Users

### 8.1 Razorpay X-Payout Concepts

| Term | Description |
|---|---|
| **RazorpayX Account** | Your funded virtual bank account — money goes OUT from here |
| **Contact** | The recipient (user's name, email, phone) |
| **Fund Account** | The destination UPI or bank account linked to a Contact |
| **Payout** | The actual money transfer from your RazorpayX to the Fund Account |

> **Account Setup**: You need a **RazorpayX** account (separate product from Razorpay Payments). Fund it via NEFT/IMPS from your business bank account. Payouts are drawn from this virtual account balance.

### 8.2 Razorpay API Calls Sequence

**Step A — Create Contact:**

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
  "notes": { "platform": "storychain", "userId": "user_clerk_xxxx" }
}
```

**Response:** `{ "id": "cont_AbCdEfGhIjKlMn", "active": true, ... }`

---

**Step B1 — Create UPI Fund Account:**

```http
POST https://api.razorpay.com/v1/fund_accounts

{
  "contact_id": "cont_AbCdEfGhIjKlMn",
  "account_type": "vpa",
  "vpa": { "address": "dhruv@okaxis" }
}
```

**Response:** `{ "id": "fa_AbCdEfGhIjKlMn", "account_type": "vpa", "active": true }`

---

**Step B2 — Create Bank Fund Account:**

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

**Response:** `{ "id": "fa_AbCdEfGhIjKlMn", "account_type": "bank_account", "active": true }`

---

**Step C — Create Payout:**

```http
POST https://api.razorpay.com/v1/payouts
X-Payout-Idempotency: withdrawal_<withdrawalRequestId>

{
  "account_number": "<RAZORPAYX_INR_ACCOUNT_NUMBER>",
  "fund_account_id": "fa_AbCdEfGhIjKlMn",
  "amount": 50000,               ← ₹500 × 100 = 50000 paise
  "currency": "INR",
  "mode": "UPI",
  "purpose": "payout",
  "queue_if_low_balance": true,
  "reference_id": "withdrawal_<withdrawalRequestId>",
  "narration": "StoryChain Coin Withdrawal",
  "notes": {
    "userId": "user_clerk_xxxx",
    "withdrawalRequestId": "<id>"
  }
}
```

**Response:** `{ "id": "pout_AbCdEfGhIjKlMn", "status": "queued" }`

---

### 8.3 Razorpay Payout Modes & Speeds

| `payoutMethod` | Razorpay `mode` | Speed | When to Use |
|---|---|---|---|
| `upi` | `UPI` | Instant (< 30 sec) | Default for UPI requests |
| `bank_transfer` | `IMPS` | Instant (24/7) | Default for bank accounts |
| `bank_transfer` | `NEFT` | 2-4 hours (business hours) | Non-urgent transfers |
| `bank_transfer` | `RTGS` | Same day (> ₹2 lakh) | Large amounts only |

> **Recommendation:** Use `IMPS` as default for bank transfers (instant, 24/7, no minimum). Use `UPI` for UPI requests. Only use `NEFT`/`RTGS` as fallback for specific scenarios.

---

### 8.4 Razorpay Webhook Events

**Webhook URL:** `POST /api/v1/webhooks/razorpay-payouts`

Register in **RazorpayX Dashboard** → Payouts → Settings → Webhooks (separate from payment gateway webhooks).

| Event | Our Action |
|---|---|
| `payout.queued` | Update `razorpayPayoutStatus = 'queued'` |
| `payout.initiated` | Update `razorpayPayoutStatus = 'processing'` |
| `payout.processed` | Mark `status = 'completed'`, release wallet |
| `payout.reversed` | Mark `status = 'failed'`, refund wallet |
| `payout.failed` | Mark `status = 'failed'`, refund wallet |
| `payout.cancelled` | Mark `status = 'failed'`, refund wallet |
| `fund_account.validation.completed` | Mark fund account as verified |
| `fund_account.validation.failed` | Flag account as invalid, notify admin |

**Webhook Signature Verification:**

```typescript
// X-Razorpay-Signature header
const expectedSig = crypto
  .createHmac('sha256', env.RAZORPAY_PAYOUT_WEBHOOK_SECRET)
  .update(rawBody) // ← MUST be raw body buffer, not parsed JSON
  .digest('hex');

const isValid = crypto.timingSafeEqual(
  Buffer.from(expectedSig, 'hex'),
  Buffer.from(signatureHeader, 'hex')
);
```

---

## 9. Wise Payout — International Users

### 9.1 Wise API Concepts

| Term | Description |
|---|---|
| **Profile** | Your Wise business profile (has a numeric `profileId`) |
| **Quote** | FX rate snapshot: converts **INR → target currency** with fee estimate. Expires in ~30 mins. |
| **Recipient Account** | The user's bank account registered in Wise (reusable across transfers) |
| **Transfer** | The actual transfer object linking a Quote + Recipient Account |
| **Payment / Funding** | The final step — funding the transfer from your Wise INR balance (SCA required) |

> **Balance Setup:** You need a funded Wise Multi-Currency Account (business). Add **INR balance** by transferring from your Indian bank account. Wise will debit INR and convert to the target currency during each transfer payment.

> **SCA (Strong Customer Authentication):** Wise requires RSA-signed requests for funding transfers. You must generate an RSA key pair and register the public key in your Wise Developer settings.

> **Source Currency is always INR.** Unlike a typical international business that might hold USD, StoryChain's Wise account is funded in INR (matching your Indian coin economy). Wise handles all outbound FX conversions.

### 9.2 Wise API Calls Sequence

**Step A — Create Quote (get FX rate: INR → target currency):**

```http
POST https://api.transferwise.com/v3/profiles/{profileId}/quotes
Authorization: Bearer <WISE_API_TOKEN>
Content-Type: application/json

{
  "sourceCurrency": "INR",
  "targetCurrency": "GBP",
  "sourceAmount": 5000.00,
  "payOut": "BANK_TRANSFER"
}
```

> `sourceCurrency` is always `"INR"` — money is always debited from your Indian Wise INR balance.
> `sourceAmount` = `withdrawal.amountInr` (coins × coinToInrRate).

**Response:**

```json
{
  "id": "11144e8c-61d0-4001-8a35-ff9561e5f5a3",
  "rate": 0.0094,
  "sourceCurrency": "INR",
  "targetCurrency": "GBP",
  "sourceAmount": 5000.00,
  "targetAmount": 47.00,
  "paymentOptions": [
    {
      "payIn": "BALANCE",
      "payOut": "BANK_TRANSFER",
      "fee": { "total": 350.00, "transferwise": 350.00, "payIn": 0.0 },
      "sourceAmount": 5000.00,
      "targetAmount": 43.70
    }
  ],
  "expirationTime": "2026-07-31T19:00:00Z"
}
```

> **Important:** Quotes expire (~30 mins). **Do not store the quoteId at request submission time.** Instead, create a fresh quote immediately when the admin approves the request.

> **For submission UX (optional preview):** You may call the Wise Quotes API at submission time to show the user an estimated target amount (`wiseEstimatedTargetAmount`) and fee (`wiseEstimatedFee`). Store these estimates on the `WithdrawalRequest` for display, but generate a fresh quote at approval time for the actual transfer.

---

**Step B — Create Recipient Account:**

```http
POST https://api.transferwise.com/v1/accounts
Authorization: Bearer <WISE_API_TOKEN>

// UK (Sort Code + Account Number):
{
  "profile": <profileId>,
  "currency": "GBP",
  "type": "sort_code",
  "accountHolderName": "Jane Smith",
  "details": {
    "legalType": "PRIVATE",
    "sortCode": "609210",
    "accountNumber": "12345678"
  }
}

// US (ACH — Routing + Account):
{
  "profile": <profileId>,
  "currency": "USD",
  "type": "aba",
  "accountHolderName": "John Smith",
  "details": {
    "legalType": "PRIVATE",
    "abartn": "021000021",
    "accountNumber": "000123456789",
    "accountType": "CHECKING"
  }
}

// EU (IBAN):
{
  "profile": <profileId>,
  "currency": "EUR",
  "type": "iban",
  "accountHolderName": "Hans Mueller",
  "details": {
    "legalType": "PRIVATE",
    "iban": "DE89370400440532013000"
  }
}

// Australia (BSB):
{
  "profile": <profileId>,
  "currency": "AUD",
  "type": "australian",
  "accountHolderName": "Sarah Jones",
  "details": {
    "legalType": "PRIVATE",
    "bsbCode": "062001",
    "accountNumber": "12345678"
  }
}
```

**Response:** `{ "id": 12345678 }` ← This is the recipient ID (numeric).

> **Save this ID in `UserPayoutProfile.wiseRecipientId`** — reuse for future withdrawals from the same account.

---

**Step C — Create Transfer:**

```http
POST https://api.transferwise.com/v1/transfers
Authorization: Bearer <WISE_API_TOKEN>
X-idempotence-uuid: withdrawal_<withdrawalRequestId>

{
  "targetAccount": 12345678,
  "quoteUuid": "11144e8c-61d0-4001-8a35-ff9561e5f5a3",
  "customerTransactionId": "withdrawal_<withdrawalRequestId>",
  "details": {
    "reference": "StoryChain Earnings",
    "transferPurpose": "BUSINESS_PAYMENT",
    "sourceOfFunds": "BUSINESS"
  }
}
```

**Response:**

```json
{
  "id": 987654321,
  "status": "incoming_payment_waiting",
  "reference": "SC-ABCD1234",
  "sourceCurrency": "INR",
  "sourceValue": 5000.00,
  "targetCurrency": "GBP",
  "targetValue": 43.70
}
```

> Save `id` as `wiseTransferId` and `sourceValue` as `wiseActualSourceAmountInr` on the `WithdrawalRequest`.

---

**Step D — Fund the Transfer (SCA Required):**

```http
POST https://api.transferwise.com/v3/profiles/{profileId}/transfers/{transferId}/payments
Authorization: Bearer <WISE_API_TOKEN>
X-Signature-Version: v3
X-Signature: <RSA-SHA256 signature of URL + body>
Content-Type: application/json

{
  "type": "BALANCE"
}
```

**Response:**

```json
{
  "status": "COMPLETED",
  "errorCode": null
}
```

> After funding, the transfer status will move from `incoming_payment_waiting` → `processing` → `outgoing_payment_sent`.

---

### 9.3 Wise Webhook Events

**Webhook URL:** `POST /api/v1/webhooks/wise-payouts`

Register in Wise Developer Portal → Applications → Webhooks.

| Event | Transfer Status | Our Action |
|---|---|---|
| `transfers#state-change` (incoming_payment_waiting) | awaiting funding | Update `wisePayoutStatus` |
| `transfers#state-change` (processing) | being processed | Update `wisePayoutStatus` |
| `transfers#state-change` (funds_converted) | FX done | Update `wisePayoutStatus` |
| `transfers#state-change` (outgoing_payment_sent) | **Sent to bank** | Mark `status = 'completed'`, release wallet |
| `transfers#state-change` (bounced_back) | Bank rejected | Mark `status = 'failed'`, refund wallet |
| `transfers#state-change` (funds_refunded) | Refunded to balance | Mark `status = 'failed'`, refund wallet |
| `transfers#state-change` (cancelled) | Cancelled | Mark `status = 'failed'`, refund wallet |

**Wise Webhook Signature Verification:**

```typescript
// Wise uses RSA signature (not HMAC like Razorpay)
// X-Signature-SHA256 header
const verifier = crypto.createVerify('SHA256');
verifier.update(rawBody);
const isValid = verifier.verify(
  env.WISE_WEBHOOK_PUBLIC_KEY, // Wise's public key from developer portal
  signatureHeader,
  'base64'
);
```

**Webhook Payload Shape:**

```json
{
  "data": {
    "resource": {
      "type": "transfer",
      "id": 987654321,
      "profile_id": 12345,
      "account_id": 12345678
    },
    "current_state": "outgoing_payment_sent",
    "previous_state": "funds_converted",
    "occurred_at": "2026-07-31T15:30:00Z"
  },
  "subscription_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "event_type": "transfers#state-change",
  "schema_version": "2.0.0",
  "sent_at": "2026-07-31T15:30:01Z"
}
```

---

### 9.4 Wise Supported Countries & Currencies

Wise covers **160+ countries** and **50+ currencies**. Since our source is always INR, any currency Wise supports for INR transfers is available to your users. Key examples:

| Target Currency | Country/Region | Wise Account Type | INR FX Rate (approx) |
|---|---|---|---|
| 🇺🇸 USD | United States | ABA (routing + account) | ₹83 / $1 |
| 🇬🇧 GBP | United Kingdom | Sort Code + Account | ₹106 / £1 |
| 🇪🇺 EUR | Eurozone (DE, FR, IT, ES...) | IBAN | ₹91 / €1 |
| 🇦🇺 AUD | Australia | BSB Code + Account | ₹55 / A$1 |
| 🇨🇦 CAD | Canada | Institution + Transit + Account | ₹62 / C$1 |
| 🇸🇬 SGD | Singapore | Local bank code + account | ₹62 / S$1 |
| 🇯🇵 JPY | Japan | Bank + Branch + Account | ₹0.55 / ¥1 |
| 🇦🇪 AED | UAE | IBAN | ₹23 / AED 1 |
| 🇳🇿 NZD | New Zealand | Bank + Branch + Account | ₹50 / NZ$1 |
| 🇨🇭 CHF | Switzerland | IBAN | ₹94 / CHF 1 |

> ⚠️ FX rates above are illustrative. Real rates are fetched live from Wise Quotes at transfer time.

> **What we send to Wise:** Always **INR** (from your Indian Wise balance). Wise converts INR → target currency at the live mid-market rate, minus a small Wise transfer fee. The user receives the net target currency amount in their bank account.

---

## 10. API Endpoints (StoryChain)

### User Endpoints (Clerk JWT Required)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/withdrawal-requests` | Submit a new withdrawal request |
| `GET` | `/api/v1/withdrawal-requests` | List user's own withdrawal history |
| `GET` | `/api/v1/withdrawal-requests/:id` | Get a specific withdrawal request |
| `DELETE` | `/api/v1/withdrawal-requests/:id` | Cancel a PENDING request (before admin review) |
| `GET` | `/api/v1/wallet` | Get balance, pendingWithdrawal, totalWithdrawn |
| `GET` | `/api/v1/wallet/transactions` | Paginated coin transaction history |
| `GET` | `/api/v1/payout-profiles` | List saved payout accounts |
| `POST` | `/api/v1/payout-profiles` | Save a new payout account |
| `DELETE` | `/api/v1/payout-profiles/:id` | Delete a saved payout account |
| `PATCH` | `/api/v1/payout-profiles/:id/default` | Set as default payout account |

### Admin Endpoints (Admin Role Required)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/admin/withdrawal-requests` | List all requests (filter by status/gateway) |
| `GET` | `/api/v1/admin/withdrawal-requests/:id` | Get one request with full user & wallet details |
| `POST` | `/api/v1/admin/withdrawal-requests/:id/approve` | Approve & initiate gateway payout |
| `POST` | `/api/v1/admin/withdrawal-requests/:id/reject` | Reject with reason (coins returned) |
| `POST` | `/api/v1/admin/withdrawal-requests/:id/retry` | Retry a FAILED payout |
| `GET` | `/api/v1/admin/withdrawal-requests/stats` | Stats (total pending, by gateway, amounts) |
| `GET` | `/api/v1/admin/payout-profiles/:userId` | View user's saved payout accounts |

### Webhook Endpoints (Signature Verified, No Auth)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/webhooks/razorpay-payouts` | Razorpay X-Payout webhook receiver |
| `POST` | `/api/v1/webhooks/wise-payouts` | Wise Payouts webhook receiver |

---

## 11. DTOs & Validation Schemas

### CreateWithdrawalRequestDTO (Zod)

```typescript
// src/dto/withdrawalRequest/create-withdrawal-request.dto.ts

import { z } from 'zod';

const IndianPayoutDetailsSchema = z.union([
  // UPI
  z.object({
    upiId: z.string().min(5).max(100).regex(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/),
  }),
  // Bank Transfer (INR)
  z.object({
    accountNumber: z.string().min(6).max(18),
    ifscCode: z.string().length(11).regex(/^[A-Z]{4}0[A-Z0-9]{6}$/),
    accountName: z.string().min(2).max(100),
    bankName: z.string().min(2).max(100),
  }),
]);

const InternationalPayoutDetailsSchema = z.union([
  // US ACH
  z.object({
    accountNumber: z.string().min(4).max(17),
    routingNumber: z.string().length(9),
    accountName: z.string().min(2).max(100),
    bankName: z.string().min(2).max(100),
    accountType: z.enum(['checking', 'savings']),
    country: z.literal('US'),
    targetCurrency: z.string().length(3),
  }),
  // UK Sort Code
  z.object({
    accountNumber: z.string().length(8),
    routingNumber: z.string().length(6), // Sort code (6 digits)
    accountName: z.string().min(2).max(100),
    bankName: z.string().min(2).max(100),
    country: z.literal('GB'),
    targetCurrency: z.string().length(3),
  }),
  // IBAN (Europe, UK, etc.)
  z.object({
    ibanNumber: z.string().min(15).max(34).regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/),
    accountName: z.string().min(2).max(100),
    bankName: z.string().min(2).max(100).optional(),
    country: z.string().length(2),
    targetCurrency: z.string().length(3),
  }),
  // Generic SWIFT (international wire)
  z.object({
    accountNumber: z.string().min(4).max(34),
    swiftCode: z.string().min(8).max(11),
    accountName: z.string().min(2).max(100),
    bankName: z.string().min(2).max(100),
    bankAddress: z.string().max(300).optional(),
    country: z.string().length(2),
    targetCurrency: z.string().length(3),
  }),
]);

export const CreateWithdrawalRequestSchema = z.object({
  coins: z.number().int().positive(),
  payoutMethod: z.enum(['upi', 'bank_transfer']),
  payoutDetails: z.union([IndianPayoutDetailsSchema, InternationalPayoutDetailsSchema]),
});

export type CreateWithdrawalRequestDTO = z.infer<typeof CreateWithdrawalRequestSchema>;
```

> **Note:** Validation of `payoutMethod` vs user country is done in the service layer, not Zod, because we need `User.country` from the DB.

---

## 12. Enum Changes Required

**File:** `src/features/withdrawalRequest/types/withdrawalRequest-enum.ts`

```typescript
// CURRENT
enum PayoutMethod {
  UPI = 'upi',
  BANK_TRANSFER = 'bank_transfer',
}
const PAYOUT_METHODS = ['upi', 'bank_transfer'] as const;

// ── ADD these new enums ───────────────────────────────────────────────────────

enum PayoutGateway {
  RAZORPAY = 'razorpay',
  WISE = 'wise',
}
const PAYOUT_GATEWAYS = ['razorpay', 'wise'] as const;

// All currencies supported — INR uses Razorpay, all others use Wise (INR → target FX)
const SUPPORTED_PAYOUT_CURRENCIES = [
  'INR',  // → Razorpay X-Payout
  'USD', 'GBP', 'EUR', 'AUD', 'CAD', 'SGD',  // → Wise (INR → FX)
  'JPY', 'AED', 'NZD', 'CHF', 'HKD', 'DKK',  // → Wise
  'SEK', 'NOK', 'MYR', 'THB', 'PHP', 'IDR',  // → Wise
] as const;

// ── EXISTING (no change) ──────────────────────────────────────────────────────

enum WithdrawalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

const WITHDRAWAL_STATUSES = ['pending', 'approved', 'rejected', 'processing', 'completed', 'failed'] as const;

export {
  PayoutMethod, PAYOUT_METHODS,
  PayoutGateway, PAYOUT_GATEWAYS,
  SUPPORTED_PAYOUT_CURRENCIES,
  WithdrawalStatus, WITHDRAWAL_STATUSES,
};
```

**Also update `IWithdrawalRequest` interface:**

```typescript
// src/features/withdrawalRequest/types/withdrawalRequest.types.ts — UPDATED

export type TPayoutGateway = (typeof PAYOUT_GATEWAYS)[number];
export type TSupportedPayoutCurrency = (typeof SUPPORTED_PAYOUT_CURRENCIES)[number];

export interface IPayoutDetails {
  // UPI (India)
  upiId?: string;
  // Bank Transfer — INR
  accountNumber?: string;
  ifscCode?: string;
  accountName?: string;
  bankName?: string;
  // Bank Transfer — International
  routingNumber?: string;        // ABA (US) / Sort Code (UK) / BSB (AU)
  accountType?: 'checking' | 'savings' | 'current';
  swiftCode?: string;
  ibanNumber?: string;           // IBAN (EU, UK)
  bankAddress?: string;
  country?: string;              // ISO 3166-1 alpha-2
  targetCurrency?: string;       // User's local currency code
}

export interface IWithdrawalRequest {
  _id: ID;
  userId: string;
  coins: number;

  // ── Currency & Gateway (ALL NEW) ─────────────────────────────────────────
  /** Currency the user wants to RECEIVE (INR → Razorpay, others → Wise) */
  desiredCurrency: TSupportedPayoutCurrency;
  /** Gateway routing: 'razorpay' if INR, 'wise' for everything else */
  payoutGateway: TPayoutGateway;
  /** INR amount debited from your account — always populated for ALL gateways */
  amountInr: number;
  /** Snapshot of coinToInrRate at submission time */
  conversionRate: number;

  // Wise UX estimates (from quote preview at submission — for display only)
  wiseEstimatedTargetAmount?: number;  // e.g. 43.70 (GBP)
  wiseEstimatedFee?: number;           // e.g. 350 (INR)

  payoutMethod: TPayoutMethod;
  payoutDetails: IPayoutDetails;

  status: TWithdrawalStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  adminNote?: string;

  // ── Razorpay fields (INR payouts only) ───────────────────────────────────
  razorpayPayoutId?: string;          // pout_xxxxxxxx
  razorpayFundAccountId?: string;     // fa_xxxxxxxx
  razorpayContactId?: string;         // cont_xxxxxxxx
  razorpayPayoutStatus?: string;      // queued | processing | processed | reversed | failed
  payoutInitiatedAt?: Date;
  payoutCompletedAt?: Date;
  payoutFailureReason?: string;

  // ── Wise fields (all non-INR currencies) ─────────────────────────────────
  wiseTransferId?: number;            // Numeric transfer ID
  wiseQuoteId?: string;               // Quote UUID used for this transfer
  wiseProfileId?: number;             // Wise business profile ID
  wisePayoutStatus?: string;          // Wise transfer state machine status
  wiseTransferReference?: string;     // Reference code shown to recipient
  wiseActualSourceAmountInr?: number; // Actual INR debited by Wise
  wiseActualTargetAmount?: number;    // Actual amount received by user in target currency
  wiseActualTargetCurrency?: string;  // Confirmation of target currency (sanity check)

  createdAt: Date;
  updatedAt: Date;
}
```

---

## 13. BullMQ Job: Payout Dispatcher

For resilience, wrap the gateway API calls in a BullMQ job so retries happen automatically on transient failures.

**File:** `src/jobs/payout-dispatch.job.ts`

```typescript
import { Worker, Queue, Job } from 'bullmq';
import { container } from '@/container';
import { PayoutRouterService } from '@/infrastructure/payment/payout-router.service';
import { WithdrawalRequest } from '@/models/withdrawalRequest.model';
import { UserPayoutProfile } from '@/models/userPayoutProfile.model';
import { Wallet } from '@/models/wallet.model';

export const PAYOUT_DISPATCH_QUEUE = 'payout-dispatch';

export interface PayoutDispatchJobData {
  withdrawalRequestId: string;
  adminId: string;
}

// Queue definition
export const payoutDispatchQueue = new Queue<PayoutDispatchJobData>(PAYOUT_DISPATCH_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 }, // 5s, 25s, 125s
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// Worker that processes payout dispatch jobs
export const payoutDispatchWorker = new Worker<PayoutDispatchJobData>(
  PAYOUT_DISPATCH_QUEUE,
  async (job: Job<PayoutDispatchJobData>) => {
    const { withdrawalRequestId, adminId } = job.data;
    const payoutRouter = container.resolve(PayoutRouterService);

    const withdrawal = await WithdrawalRequest.findById(withdrawalRequestId);
    if (!withdrawal || withdrawal.status !== 'approved') return;

    if (withdrawal.payoutGateway === 'razorpay') {
      await dispatchRazorpayPayout(withdrawal, payoutRouter.getRazorpay(), adminId);
    } else {
      await dispatchWisePayout(withdrawal, payoutRouter.getWise(), adminId);
    }
  },
  { connection: redisConnection, concurrency: 5 }
);
```

> **Admin approval flow:** When admin calls `POST /admin/withdrawal-requests/:id/approve`, update `status = 'approved'` in DB, then enqueue a `PAYOUT_DISPATCH_QUEUE` job. The BullMQ worker picks it up, calls the gateway API, and updates the DB with gateway IDs + `status = 'processing'`. This decouples the HTTP response from the slow gateway API calls.

---

## 14. Security Design

### Webhook Signature Verification

| Gateway | Header | Algorithm | Secret |
|---|---|---|---|
| Razorpay | `X-Razorpay-Signature` | HMAC-SHA256 | `RAZORPAY_PAYOUT_WEBHOOK_SECRET` |
| Wise | `X-Signature-SHA256` | RSA-SHA256 | `WISE_WEBHOOK_PUBLIC_KEY` (Wise's public key) |

> ⚠️ **Always use the raw request body buffer for signature verification.** Never the parsed JSON object — reformatting breaks the signature.

### Idempotency Keys

| Gateway | Key Header | Key Value |
|---|---|---|
| Razorpay | `X-Payout-Idempotency` | `withdrawal_<withdrawalRequestId>` |
| Wise | `X-idempotence-uuid` | `withdrawal_<withdrawalRequestId>` |

Idempotency prevents duplicate payouts if the admin accidentally double-approves or if the network times out and the request is retried.

### Atomic Coin Locking

```typescript
// Only deducts if user has enough balance — prevents race conditions
const updated = await Wallet.findOneAndUpdate(
  { userId, balance: { $gte: coinsRequested } }, // ← atomic guard
  { $inc: { balance: -coinsRequested, pendingWithdrawal: coinsRequested } },
  { new: true, session }
);
if (!updated) throw ApiError.badRequest('INSUFFICIENT_BALANCE');
```

### Authorization Matrix

| Check | Reason |
|---|---|
| Clerk JWT on all user endpoints | No unauthenticated access |
| `userId === request.user.clerkId` guard | Users only see their own requests |
| Admin role check on approve/reject | Only admins can trigger payouts |
| `status === 'pending'` guard | Prevent re-processing already-handled requests |
| One active withdrawal per user at a time | Prevents balance race condition |

### Sensitive Data Handling

- **Never log** `razorpayKeySecret`, `wiseApiToken`, `wisePrivateKey` — use structured logging with redaction.
- **Mask bank account numbers** in API responses: show only last 4 digits (`****1234`).
- **Never store** full card/payment details (not applicable here, but for reference).
- Wise SCA private key must be stored in environment variables or a secrets manager (not source code).

---

## 15. Error Handling & Edge Cases

### Razorpay-Specific Errors

| Error | Cause | Handling |
|---|---|---|
| `fund_account.validation.failed` | Invalid UPI/bank details | Mark request `failed`, notify user to resubmit with correct details, refund coins |
| Payout `reversed` | Bank rejected (invalid account) | Mark `failed`, refund coins, notify admin |
| Payout `failed` with `INVALID_FUND_ACCOUNT` | Fund account issue | Mark `failed`, refund coins |
| RazorpayX insufficient balance | RazorpayX account underfunded | Queue payout (`queue_if_low_balance: true`), alert admin to top up |
| Duplicate payout (same idempotency key) | Network retry | Razorpay returns existing payout — safe to process as if newly created |

### Wise-Specific Errors

| Error | Cause | Handling |
|---|---|---|
| Quote expired at approval time | More than ~30 min passed since last quote | Re-create a fresh quote before creating the transfer — this is expected and handled automatically |
| `bounced_back` | Recipient bank rejected the transfer | Mark `failed`, refund coins, ask user to verify bank details |
| `funds_refunded` | Transfer cancelled after funding | Mark `failed`, refund coins |
| SCA signature failure | RSA key mismatch or malformed request body | Log error, alert admin — do NOT refund coins yet (money may not have moved) |
| Wise INR balance insufficient | Your Wise INR balance is too low | Alert admin to top up Wise INR balance via bank transfer from your Indian account |
| Currency not supported | User's `desiredCurrency` not in `wiseSupportedCurrencies` | Caught at submission — return 400 CURRENCY_NOT_SUPPORTED |
| Wrong recipient account type for currency | e.g. sending ABA routing for a GBP account | Caught at Wise API — mark `failed`, return coins, ask user to re-submit with correct details |

### General Edge Cases

| Scenario | Handling |
|---|---|
| User cancels a PENDING request | Return coins immediately (`balance += coins`, `pendingWithdrawal -= coins`), create CoinTransaction credit, delete or mark request `cancelled` |
| Webhook delivered twice | Idempotent handler — check current status before updating. If already `completed`, skip. |
| Webhook delivery delayed (>24 hrs) | Admin can manually poll payout status via `/admin/withdrawal-requests/:id/sync-status` endpoint |
| Admin double-approves | `status !== 'pending'` guard prevents re-processing |
| User deletes account | Pending withdrawal requests remain; admin must process or reject before account deletion |
| PlatformCoinConfig changes mid-request | Snapshot `conversionRate` on `WithdrawalRequest` at submission time — never re-compute |
| Gateway API down | BullMQ retry with exponential backoff (3 attempts). After all retries fail, mark `failed`, refund coins, alert admin |

---

## 16. Admin Dashboard — Withdrawal Queue

### Queue Display Fields

```typescript
interface AdminWithdrawalQueueItem {
  _id: string;
  createdAt: Date;

  user: {
    clerkId: string;
    username: string;
    email: string;
    country: string;           // Informational only — not used for routing
    walletBalance: number;
    lifetimeEarned: number;
  };

  coins: number;
  desiredCurrency: string;      // What the user wants (INR, USD, GBP...)
  amountInr: number;            // INR debited from your account (₹5,000)
  wiseEstimatedTargetAmount?: number;  // e.g. 43.70 GBP
  wiseEstimatedFee?: number;           // e.g. 350 INR
  conversionRate: number;

  payoutGateway: 'razorpay' | 'wise';
  payoutMethod: 'upi' | 'bank_transfer';
  payoutDetails: MaskedPayoutDetails;   // Account numbers masked (show last 4 digits)

  status: WithdrawalStatus;
  razorpayPayoutId?: string;
  wiseTransferId?: number;
  payoutInitiatedAt?: Date;
}
```

### Stats Endpoint Response

```json
{
  "total": {
    "pending": 12,
    "processing": 5,
    "completed": 234,
    "failed": 8
  },
  "byGateway": {
    "razorpay": { "pending": 9, "processing": 4, "completed": 200 },
    "wise": { "pending": 3, "processing": 1, "completed": 34 }
  },
  "pendingAmountInr": 75000,
  "byCurrency": {
    "INR": { "count": 9, "amountInr": 15000 },
    "USD": { "count": 2, "amountInr": 30000 },
    "GBP": { "count": 1, "amountInr": 20000 },
    "EUR": { "count": 1, "amountInr": 10000 }
  },
  "oldestPending": "2026-07-30T09:00:00Z"
}
```

> All stats are in INR (your debit amount). This makes it easy to see your total liability in a single currency regardless of what target currencies users are requesting.

---

## 17. Environment Variables

Add these to your `.env` file and deploy secrets manager (Railway / Fly secrets):

```bash
# ─────────────────────────────────────────────────────────────────────────────
# RAZORPAY (existing + new payout-specific)
# ─────────────────────────────────────────────────────────────────────────────
RAZORPAY_KEY_ID_TEST=rzp_test_Sv4U2nkaE8Uazf
RAZORPAY_KEY_SECRET_TEST=3cbGsDhtWapOHbI35dHRWY9O
RAZORPAY_KEY_ID_LIVE=rzp_live_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET_LIVE=xxxxxxxxxxxxxxxxxxxxxx

RAZORPAY_WEBHOOK_SECRET=f1def9e26301fc7b5a74ab31946989fadc
RAZORPAY_PAYOUT_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # ← SEPARATE secret for payout webhooks

RAZORPAYX_INR_ACCOUNT_NUMBER=2323230016898972  # Your RazorpayX virtual account number

# ─────────────────────────────────────────────────────────────────────────────
# WISE (NEW — all new variables)
# ─────────────────────────────────────────────────────────────────────────────
WISE_API_TOKEN_SANDBOX=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx   # Wise sandbox API token
WISE_API_TOKEN_LIVE=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx      # Wise live API token

WISE_PROFILE_ID_SANDBOX=12345678    # Numeric profile ID from Wise sandbox
WISE_PROFILE_ID_LIVE=87654321       # Numeric profile ID from Wise live

# RSA key pair for Wise SCA (Strong Customer Authentication)
# Generate with: openssl genrsa -out wise_private.pem 2048
# Then: openssl rsa -in wise_private.pem -pubout -out wise_public.pem
# Register wise_public.pem content in Wise Developer Portal
WISE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"

# Wise public key for webhook signature verification (from Wise Dev Portal)
WISE_WEBHOOK_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
```

> **Never commit real API keys or private keys to source control.** Use Railway's secrets or Fly secrets for production.

### Existing Variables (No Change)

```bash
RAZORPAY_KEY_ID_TEST=rzp_test_Sv4U2nkaE8Uazf       # already in .env
RAZORPAY_KEY_SECRET_TEST=3cbGsDhtWapOHbI35dHRWY9O  # already in .env
RAZORPAY_WEBHOOK_SECRET=f1def9e26301fc7b5a74ab31946989fadc  # already in .env
```

---

## 18. Testing Strategy

### Razorpay Sandbox Testing

1. Use `rzp_test_*` key pair in test/dev environment.
2. Create payouts in test mode — they do NOT actually transfer money.
3. Use Razorpay Dashboard (Test mode) to manually trigger webhook events.
4. Test all payout methods: UPI, IMPS, NEFT.
5. Simulate failures by using test accounts known to fail.

### Wise Sandbox Testing

1. Register at [sandbox.transferwise.tech](https://sandbox.transferwise.tech).
2. Use `WISE_API_TOKEN_SANDBOX` and `WISE_PROFILE_ID_SANDBOX`.
3. Fund your sandbox balance (sandbox auto-funds).
4. Create test transfers — they simulate the full state machine.
5. Use Wise sandbox webhook simulator to trigger status changes.

### Unit Test Scenarios

| Test | Expected |
|---|---|
| Submit withdrawal with insufficient balance | 400 INSUFFICIENT_BALANCE |
| Submit withdrawal with another PENDING request | 409 WITHDRAWAL_PENDING |
| Submit UPI request for non-Indian user | 400 UPI_NOT_ALLOWED_FOR_COUNTRY |
| Submit bank transfer with missing IFSC (INR) | 400 Zod validation error |
| Admin approves already-completed request | 409 ALREADY_PROCESSED |
| Webhook with invalid signature | 401 INVALID_SIGNATURE |
| Webhook `payout.processed` — wallet released | Wallet: pendingWithdrawal decremented, totalWithdrawn incremented |
| Webhook `payout.failed` — coins refunded | Wallet: balance restored, pendingWithdrawal = 0 |
| Wise `bounced_back` — coins refunded | Wallet: balance restored |
| Razorpay idempotency — same key re-sent | No duplicate payout |
| Wise idempotency — same UUID re-sent | No duplicate transfer |

---

## 19. Implementation Checklist

### Phase 1 — Model Changes

- [ ] Update `withdrawalRequest-enum.ts` — add `PayoutGateway`, `PAYOUT_GATEWAYS`, `SUPPORTED_PAYOUT_CURRENCIES`
- [ ] Update `withdrawalRequest.types.ts` — add new fields to `IWithdrawalRequest` and `IPayoutDetails`
- [ ] Update `withdrawalRequest.model.ts` — add `currency`, `payoutGateway`, `amountUsd`, `conversionRate`, `razorpayContactId`, all Wise fields, international `payoutDetails` fields
- [ ] Update `platformCoinConfig.model.ts` — add currency-specific min withdrawal, conversion rates, gateway kill switches
- [ ] Create `userPayoutProfile.model.ts` (new model)
- [ ] Add `country` field to `user.model.ts` if not already present

### Phase 2 — Infrastructure

- [ ] Create `src/infrastructure/payment/wise-payout.service.ts`
- [ ] Create `src/infrastructure/payment/razorpay-payout.service.ts` (extracted from `razorpay.service.ts`)
- [ ] Create `src/infrastructure/payment/payout-router.service.ts`
- [ ] Register new services in DI container (`src/container/registry.ts`)

### Phase 3 — Environment & Secrets

- [ ] Generate RSA key pair for Wise SCA (`openssl genrsa -out wise_private.pem 2048`)
- [ ] Register Wise public key in Wise Developer Portal
- [ ] Add all new env vars to `.env` (sandbox values) and Railway/Fly secrets (live values)
- [ ] Configure `src/config/env.ts` to expose new Wise env vars

### Phase 4 — Feature Implementation

- [ ] Create `src/features/withdrawalRequest/` full feature module:
  - `controllers/withdrawalRequest.controller.ts`
  - `service/withdrawalRequest.service.ts` (gateway dispatch logic)
  - `repositories/withdrawalRequest.repository.ts`
  - `routes/withdrawalRequest.routes.ts`
- [ ] Create `src/features/userPayoutProfile/` feature module
- [ ] Update `src/dto/` — add `CreateWithdrawalRequestSchema` with international validation
- [ ] Create BullMQ payout dispatch job (`src/jobs/payout-dispatch.job.ts`)

### Phase 5 — Webhooks

- [ ] Create `POST /api/v1/webhooks/razorpay-payouts` handler
- [ ] Create `POST /api/v1/webhooks/wise-payouts` handler
- [ ] Register both in `src/routes/`
- [ ] Use `fastify-raw-body` plugin for raw body access in webhook routes

### Phase 6 — Admin

- [ ] Admin withdrawal queue endpoint with gateway filter
- [ ] Admin approve endpoint (enqueues BullMQ job)
- [ ] Admin reject endpoint (returns coins atomically)
- [ ] Admin retry failed payout endpoint
- [ ] Admin stats endpoint
- [ ] Admin payout status sync endpoint (manual poll from gateway)

### Phase 7 — Register Webhooks in Dashboards

- [ ] Register Razorpay payout webhook URL in **RazorpayX Dashboard** → Settings → Webhooks
  - URL: `https://your-api.com/api/v1/webhooks/razorpay-payouts`
  - Events: `payout.*`, `fund_account.validation.*`
- [ ] Register Wise webhook URL in **Wise Developer Portal** → Applications → Webhooks
  - URL: `https://your-api.com/api/v1/webhooks/wise-payouts`
  - Events: `transfers#state-change`

### Phase 8 — Testing & Go-Live

- [ ] Integration test with Razorpay sandbox (full approval → webhook → completed flow)
- [ ] Integration test with Wise sandbox (full approval → fund → state-change webhook → completed flow)
- [ ] Load test admin queue endpoint
- [ ] Verify idempotency — double-approve does not double-pay
- [ ] Verify coin refund on rejection and failure
- [ ] Go live with Razorpay LIVE keys + Wise LIVE keys
- [ ] Monitor first 10 real payouts manually

---

## Quick Reference: Gateway Decision Matrix

```
User chooses desiredCurrency in the request
        │
        ├── desiredCurrency = 'INR'
        │         │
        │         ▼
        │    payoutGateway = 'razorpay'
        │    amountInr = coins × coinToInrRate
        │    minCoins = 500 (configurable)
        │    Methods: upi | bank_transfer (IFSC required)
        │    Money path: RazorpayX INR balance → user's INR account
        │    Speed: Instant (UPI) to 2-4 hrs (NEFT)
        │    Webhook: /webhooks/razorpay-payouts
        │
        └── desiredCurrency = USD | GBP | EUR | AUD | SGD | ...
                  │
                  ▼
             payoutGateway = 'wise'
             amountInr = coins × coinToInrRate  ← SAME formula as INR!
             minCoins = 5000 (configurable — higher to cover Wise fees)
             Methods: bank_transfer only (no UPI)
             Money path: Wise INR balance → FX → user's foreign bank account
             Processing: Quote (INR→target) + Recipient + Transfer + Fund (SCA)
             Speed: 1-3 business days (local rails)
             Webhook: /webhooks/wise-payouts

Key rule: ANY user can choose ANY supported currency.
An Indian user with a UK account can get GBP.
A US user can also get AUD if they want.
The gateway is decided by desiredCurrency — NOT by user country.
```

---

## How Wise Knows to Debit INR from Your Account

When you create a Wise business account and fund it with INR (via NEFT/IMPS from your Indian bank), Wise holds an INR balance for you. When you fund a transfer with `type: 'BALANCE'`, Wise debits your INR balance, converts to the target currency at the live rate, and sends it to the recipient's local bank.

Your setup:
```
Your Indian Bank Account
        │
        │ (Top up via NEFT/IMPS)
        ▼
Wise Business Account (INR Balance)
        │
        │ (Wise debits INR, converts to target currency)
        ▼
Recipient's Bank (USD / GBP / EUR / AUD / ...)
```

This is why there is **no separate USD account** needed. Everything flows from your single INR Wise balance.
