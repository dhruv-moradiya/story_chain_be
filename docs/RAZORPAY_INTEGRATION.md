# Razorpay Integration - StoryChain Premium Plans

## Overview

This document outlines the complete backend implementation strategy for integrating Razorpay payments into StoryChain with three subscription tiers: **Free**, **Pro**, and **Premium**. Razorpay is India's leading payment gateway, ideal for INR-based transactions and Indian customers.

---

## Table of Contents

1. [Subscription Plans](#subscription-plans)
2. [Architecture Overview](#architecture-overview)
3. [Database Schema](#database-schema)
4. [Razorpay Configuration](#razorpay-configuration)
5. [Razorpay Service Implementation](#razorpay-service-implementation)
6. [API Endpoints](#api-endpoints)
7. [Webhook Handling](#webhook-handling)
8. [Feature Gating](#feature-gating)
9. [Implementation Steps](#implementation-steps)
10. [Security Considerations](#security-considerations)
11. [Testing Strategy](#testing-strategy)
12. [Error Handling](#error-handling)
13. [Frequently Asked Questions (FAQ)](#frequently-asked-questions-faq)
    - [Can I cancel my subscription anytime?](#can-i-cancel-my-subscription-anytime)
    - [What happens to my stories if I downgrade?](#what-happens-to-my-stories-if-i-downgrade)
    - [Do you offer refunds?](#do-you-offer-refunds)
    - [What payment methods do you accept?](#what-payment-methods-do-you-accept)
    - [Can I pay in USD if I'm outside India?](#can-i-pay-in-usd-if-im-outside-india)
    - [Can I pause my subscription?](#can-i-pause-my-subscription)

---

## Subscription Plans

### Plan Comparison Matrix

| Feature                     | Free             | Pro (₹799/mo)      | Premium (₹1,499/mo)           |
| --------------------------- | ---------------- | ------------------ | ----------------------------- |
| **Stories**                 | 3 active stories | 15 active stories  | Unlimited stories             |
| **Chapters per Story**      | 10 chapters      | 50 chapters        | Unlimited chapters            |
| **Collaborators per Story** | 2 collaborators  | 10 collaborators   | Unlimited collaborators       |
| **Pull Requests**           | 5/month          | 50/month           | Unlimited                     |
| **AI Writing Assistance**   | -                | Basic suggestions  | Advanced AI features          |
| **Analytics**               | Basic stats      | Detailed analytics | Advanced insights + exports   |
| **Custom Story Themes**     | -                | 5 themes           | Unlimited themes              |
| **Priority Support**        | -                | Email support      | 24/7 priority support         |
| **Early Access Features**   | -                | -                  | Beta features access          |
| **Ad-Free Experience**      | -                | Yes                | Yes                           |
| **Export Options**          | -                | PDF export         | All formats (PDF, EPUB, etc.) |
| **API Access**              | -                | -                  | Full API access               |

### Pricing Structure (INR)

```typescript
// src/constants/razorpay-plans.ts

export const RAZORPAY_PLANS = {
  FREE: {
    planId: null,
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'INR',
  },
  PRO: {
    monthlyPlanId: 'plan_pro_monthly', // Replace with actual Razorpay Plan ID
    yearlyPlanId: 'plan_pro_yearly', // Replace with actual Razorpay Plan ID
    monthlyPrice: 79900, // ₹799 in paise
    yearlyPrice: 799000, // ₹7,990 in paise (2 months free)
    currency: 'INR',
  },
  PREMIUM: {
    monthlyPlanId: 'plan_premium_monthly', // Replace with actual Razorpay Plan ID
    yearlyPlanId: 'plan_premium_yearly', // Replace with actual Razorpay Plan ID
    monthlyPrice: 149900, // ₹1,499 in paise
    yearlyPrice: 1499000, // ₹14,990 in paise (2 months free)
    currency: 'INR',
  },
};

// USD Pricing (for international users)
export const RAZORPAY_PLANS_USD = {
  FREE: {
    planId: null,
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'USD',
  },
  PRO: {
    monthlyPlanId: 'plan_pro_monthly_usd',
    yearlyPlanId: 'plan_pro_yearly_usd',
    monthlyPrice: 999, // $9.99 in cents
    yearlyPrice: 9990, // $99.90 in cents
    currency: 'USD',
  },
  PREMIUM: {
    monthlyPlanId: 'plan_premium_monthly_usd',
    yearlyPlanId: 'plan_premium_yearly_usd',
    monthlyPrice: 1999, // $19.99 in cents
    yearlyPrice: 19990, // $199.90 in cents
    currency: 'USD',
  },
};
```

---

## Architecture Overview

### High-Level Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  StoryChain │────▶│  Razorpay   │
│  (Frontend) │◀────│   Backend   │◀────│    API      │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                    │
                           ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  MongoDB    │     │  Webhooks   │
                    │  Database   │     │  (Events)   │
                    └─────────────┘     └─────────────┘
```

### Razorpay Payment Flow

```
1. User selects plan → Frontend
2. Create Razorpay Order → Backend API
3. Return order_id to frontend
4. Open Razorpay Checkout → Frontend
5. User completes payment → Razorpay
6. Payment success callback → Frontend
7. Verify payment signature → Backend
8. Activate subscription → Backend
9. Webhook confirmation → Razorpay to Backend
```

### Component Structure

```
src/
├── features/
│   └── subscription/
│       ├── subscription.controller.ts
│       ├── subscription.service.ts
│       ├── subscription.routes.ts
│       ├── subscription.types.ts
│       ├── subscription.validators.ts
│       ├── repository/
│       │   ├── subscription.repository.ts
│       │   └── payment-history.repository.ts
│       └── pipelines/
│           └── subscription.pipelines.ts
├── models/
│   ├── subscription.model.ts
│   └── payment-history.model.ts
├── services/
│   └── razorpay/
│       ├── razorpay.service.ts
│       ├── razorpay.webhook.ts
│       └── razorpay.types.ts
├── schema/
│   └── subscription.schema.ts
├── middlewares/
│   └── subscription.middleware.ts
└── constants/
    ├── plans.ts
    └── razorpay-plans.ts
```

---

## Database Schema

### Subscription Model

```typescript
// src/models/subscription.model.ts

import mongoose, { Schema, Document } from 'mongoose';

export enum SubscriptionPlan {
  FREE = 'FREE',
  PRO = 'PRO',
  PREMIUM = 'PREMIUM',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CREATED = 'created',
  AUTHENTICATED = 'authenticated',
  PENDING = 'pending',
  HALTED = 'halted',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
  EXPIRED = 'expired',
  COMPLETED = 'completed',
}

export enum BillingInterval {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;

  // Razorpay identifiers
  razorpayCustomerId: string;
  razorpaySubscriptionId: string | null;
  razorpayPlanId: string | null;

  // Plan details
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingInterval: BillingInterval | null;
  currency: 'INR' | 'USD';

  // Dates
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  startAt: Date | null;
  endAt: Date | null;
  chargeAt: Date | null;
  cancelledAt: Date | null;
  pausedAt: Date | null;

  // Billing details
  totalCount: number; // Total billing cycles
  paidCount: number; // Completed billing cycles
  remainingCount: number; // Remaining billing cycles
  shortUrl: string | null; // Razorpay hosted payment link

  // Payment method
  paymentMethod: {
    type: 'card' | 'emandate' | 'nach' | 'upi' | null;
    last4: string | null;
    bank: string | null;
  };

  // Usage tracking
  usage: {
    storiesCreated: number;
    chaptersCreated: number;
    pullRequestsThisMonth: number;
    collaboratorsAdded: number;
    lastResetDate: Date;
  };

  // Notes/metadata
  notes: Record<string, string>;

  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    razorpayCustomerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    razorpaySubscriptionId: {
      type: String,
      sparse: true,
      index: true,
    },
    razorpayPlanId: {
      type: String,
    },
    plan: {
      type: String,
      enum: Object.values(SubscriptionPlan),
      default: SubscriptionPlan.FREE,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      default: SubscriptionStatus.CREATED,
      index: true,
    },
    billingInterval: {
      type: String,
      enum: Object.values(BillingInterval),
    },
    currency: {
      type: String,
      enum: ['INR', 'USD'],
      default: 'INR',
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    startAt: Date,
    endAt: Date,
    chargeAt: Date,
    cancelledAt: Date,
    pausedAt: Date,
    totalCount: {
      type: Number,
      default: 0,
    },
    paidCount: {
      type: Number,
      default: 0,
    },
    remainingCount: {
      type: Number,
      default: 0,
    },
    shortUrl: String,
    paymentMethod: {
      type: {
        type: String,
        enum: ['card', 'emandate', 'nach', 'upi', null],
      },
      last4: String,
      bank: String,
    },
    usage: {
      storiesCreated: { type: Number, default: 0 },
      chaptersCreated: { type: Number, default: 0 },
      pullRequestsThisMonth: { type: Number, default: 0 },
      collaboratorsAdded: { type: Number, default: 0 },
      lastResetDate: { type: Date, default: Date.now },
    },
    notes: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
subscriptionSchema.index({ plan: 1, status: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1, status: 1 });
subscriptionSchema.index({ chargeAt: 1, status: 1 });

export const Subscription = mongoose.model<ISubscription>('Subscription', subscriptionSchema);
```

### Payment History Model

```typescript
// src/models/payment-history.model.ts

import mongoose, { Schema, Document } from 'mongoose';

export enum PaymentStatus {
  CREATED = 'created',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

export interface IPaymentHistory extends Document {
  userId: mongoose.Types.ObjectId;
  subscriptionId: mongoose.Types.ObjectId;

  // Razorpay identifiers
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySubscriptionId: string;
  razorpaySignature: string;
  razorpayInvoiceId: string | null;

  // Payment details
  amount: number; // in paise/cents
  currency: 'INR' | 'USD';
  status: PaymentStatus;
  method: string; // card, upi, netbanking, wallet, etc.

  // Card/Payment method details (masked)
  paymentMethodDetails: {
    type: string;
    last4: string | null;
    network: string | null; // Visa, Mastercard, etc.
    bank: string | null;
    wallet: string | null;
    vpa: string | null; // UPI VPA
  };

  // Invoice details
  invoiceId: string | null;
  invoiceNumber: string | null;

  // Refund tracking
  refundedAmount: number;
  refundId: string | null;
  refundReason: string | null;

  // Error details (for failed payments)
  errorCode: string | null;
  errorDescription: string | null;
  errorSource: string | null;
  errorStep: string | null;
  errorReason: string | null;

  // Metadata
  description: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  capturedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // International payment details
  international: boolean;
  fee: number; // Razorpay fee in paise
  tax: number; // Tax on fee in paise
}

const paymentHistorySchema = new Schema<IPaymentHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      required: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      index: true,
    },
    razorpaySubscriptionId: {
      type: String,
      index: true,
    },
    razorpaySignature: String,
    razorpayInvoiceId: String,
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      enum: ['INR', 'USD'],
      default: 'INR',
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      required: true,
      index: true,
    },
    method: String,
    paymentMethodDetails: {
      type: String,
      last4: String,
      network: String,
      bank: String,
      wallet: String,
      vpa: String,
    },
    invoiceId: String,
    invoiceNumber: String,
    refundedAmount: {
      type: Number,
      default: 0,
    },
    refundId: String,
    refundReason: String,
    errorCode: String,
    errorDescription: String,
    errorSource: String,
    errorStep: String,
    errorReason: String,
    description: String,
    billingPeriodStart: Date,
    billingPeriodEnd: Date,
    capturedAt: Date,
    international: {
      type: Boolean,
      default: false,
    },
    fee: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
paymentHistorySchema.index({ userId: 1, createdAt: -1 });
paymentHistorySchema.index({ razorpaySubscriptionId: 1, createdAt: -1 });

export const PaymentHistory = mongoose.model<IPaymentHistory>(
  'PaymentHistory',
  paymentHistorySchema
);
```

---

## Razorpay Configuration

### Environment Variables

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# Razorpay Plan IDs (create in Razorpay Dashboard)
RAZORPAY_PLAN_PRO_MONTHLY=plan_xxxxxxxxxxxxx
RAZORPAY_PLAN_PRO_YEARLY=plan_xxxxxxxxxxxxx
RAZORPAY_PLAN_PREMIUM_MONTHLY=plan_xxxxxxxxxxxxx
RAZORPAY_PLAN_PREMIUM_YEARLY=plan_xxxxxxxxxxxxx

# USD Plans (optional - for international)
RAZORPAY_PLAN_PRO_MONTHLY_USD=plan_xxxxxxxxxxxxx
RAZORPAY_PLAN_PRO_YEARLY_USD=plan_xxxxxxxxxxxxx
RAZORPAY_PLAN_PREMIUM_MONTHLY_USD=plan_xxxxxxxxxxxxx
RAZORPAY_PLAN_PREMIUM_YEARLY_USD=plan_xxxxxxxxxxxxx

# Frontend URL for redirects
FRONTEND_URL=http://localhost:5173
```

### Environment Schema Validation

```typescript
// src/config/env.ts - Add Razorpay validation

import { z } from 'zod';

const envSchema = z.object({
  // ... existing validations ...

  // Razorpay
  RAZORPAY_KEY_ID: z.string().startsWith('rzp_'),
  RAZORPAY_KEY_SECRET: z.string().min(20),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(20),

  // Razorpay Plan IDs
  RAZORPAY_PLAN_PRO_MONTHLY: z.string().startsWith('plan_'),
  RAZORPAY_PLAN_PRO_YEARLY: z.string().startsWith('plan_'),
  RAZORPAY_PLAN_PREMIUM_MONTHLY: z.string().startsWith('plan_'),
  RAZORPAY_PLAN_PREMIUM_YEARLY: z.string().startsWith('plan_'),

  // Optional USD Plans
  RAZORPAY_PLAN_PRO_MONTHLY_USD: z.string().startsWith('plan_').optional(),
  RAZORPAY_PLAN_PRO_YEARLY_USD: z.string().startsWith('plan_').optional(),
  RAZORPAY_PLAN_PREMIUM_MONTHLY_USD: z.string().startsWith('plan_').optional(),
  RAZORPAY_PLAN_PREMIUM_YEARLY_USD: z.string().startsWith('plan_').optional(),
});

export const env = envSchema.parse(process.env);
```

---

## Razorpay Service Implementation

### Main Razorpay Service

```typescript
// src/services/razorpay/razorpay.service.ts

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../../config/env';
import { BaseModule } from '../../utils/baseClass';
import { SubscriptionPlan, BillingInterval } from '../../models/subscription.model';

export interface CreateCustomerParams {
  name: string;
  email: string;
  contact: string;
  userId: string;
}

export interface CreateSubscriptionParams {
  planId: string;
  customerId: string;
  totalCount?: number;
  startAt?: number;
  expireBy?: number;
  customerNotify?: 0 | 1;
  notes?: Record<string, string>;
}

export interface CreateOrderParams {
  amount: number;
  currency: 'INR' | 'USD';
  receipt: string;
  notes?: Record<string, string>;
}

export class RazorpayService extends BaseModule {
  private razorpay: Razorpay;

  constructor() {
    super('RazorpayService');
    this.razorpay = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }

  // ============================================
  // CUSTOMER MANAGEMENT
  // ============================================

  /**
   * Create a new Razorpay customer
   */
  async createCustomer(params: CreateCustomerParams): Promise<any> {
    try {
      const customer = await this.razorpay.customers.create({
        name: params.name,
        email: params.email,
        contact: params.contact,
        notes: {
          userId: params.userId,
        },
      });
      this.logInfo('Customer created', { customerId: customer.id });
      return customer;
    } catch (error) {
      this.logError('Failed to create customer', { error, params });
      throw error;
    }
  }

  /**
   * Fetch customer by ID
   */
  async getCustomer(customerId: string): Promise<any> {
    try {
      return await this.razorpay.customers.fetch(customerId);
    } catch (error) {
      this.logError('Failed to fetch customer', { customerId, error });
      throw error;
    }
  }

  /**
   * Update customer details
   */
  async updateCustomer(customerId: string, params: Partial<CreateCustomerParams>): Promise<any> {
    try {
      return await this.razorpay.customers.edit(customerId, params);
    } catch (error) {
      this.logError('Failed to update customer', { customerId, error });
      throw error;
    }
  }

  // ============================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================

  /**
   * Create a new subscription
   */
  async createSubscription(params: CreateSubscriptionParams): Promise<any> {
    try {
      const subscription = await this.razorpay.subscriptions.create({
        plan_id: params.planId,
        customer_id: params.customerId,
        total_count: params.totalCount || 12, // Default 12 billing cycles
        start_at: params.startAt,
        expire_by: params.expireBy,
        customer_notify: params.customerNotify ?? 1,
        notes: params.notes,
      });

      this.logInfo('Subscription created', {
        subscriptionId: subscription.id,
        planId: params.planId,
      });

      return subscription;
    } catch (error) {
      this.logError('Failed to create subscription', { error, params });
      throw error;
    }
  }

  /**
   * Fetch subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<any> {
    try {
      return await this.razorpay.subscriptions.fetch(subscriptionId);
    } catch (error) {
      this.logError('Failed to fetch subscription', { subscriptionId, error });
      throw error;
    }
  }

  /**
   * Cancel a subscription
   * @param cancelAtCycleEnd - If true, cancels at end of current billing cycle
   */
  async cancelSubscription(subscriptionId: string, cancelAtCycleEnd: boolean = true): Promise<any> {
    try {
      const subscription = await this.razorpay.subscriptions.cancel(
        subscriptionId,
        cancelAtCycleEnd
      );

      this.logInfo('Subscription cancelled', {
        subscriptionId,
        cancelAtCycleEnd,
      });

      return subscription;
    } catch (error) {
      this.logError('Failed to cancel subscription', {
        subscriptionId,
        error,
      });
      throw error;
    }
  }

  /**
   * Pause a subscription
   */
  async pauseSubscription(
    subscriptionId: string,
    pauseAt: 'now' | 'cycle_end' = 'cycle_end'
  ): Promise<any> {
    try {
      const subscription = await this.razorpay.subscriptions.pause(subscriptionId, {
        pause_at: pauseAt,
      });

      this.logInfo('Subscription paused', { subscriptionId, pauseAt });
      return subscription;
    } catch (error) {
      this.logError('Failed to pause subscription', { subscriptionId, error });
      throw error;
    }
  }

  /**
   * Resume a paused subscription
   */
  async resumeSubscription(subscriptionId: string): Promise<any> {
    try {
      const subscription = await this.razorpay.subscriptions.resume(subscriptionId);

      this.logInfo('Subscription resumed', { subscriptionId });
      return subscription;
    } catch (error) {
      this.logError('Failed to resume subscription', {
        subscriptionId,
        error,
      });
      throw error;
    }
  }

  /**
   * Update subscription (change plan)
   */
  async updateSubscription(
    subscriptionId: string,
    params: {
      planId?: string;
      quantity?: number;
      remainingCount?: number;
      startAt?: number;
      scheduleChangeAt?: 'now' | 'cycle_end';
      customerNotify?: 0 | 1;
    }
  ): Promise<any> {
    try {
      const updateParams: any = {};

      if (params.planId) updateParams.plan_id = params.planId;
      if (params.quantity) updateParams.quantity = params.quantity;
      if (params.remainingCount) updateParams.remaining_count = params.remainingCount;
      if (params.startAt) updateParams.start_at = params.startAt;
      if (params.scheduleChangeAt) updateParams.schedule_change_at = params.scheduleChangeAt;
      if (params.customerNotify !== undefined) updateParams.customer_notify = params.customerNotify;

      const subscription = await this.razorpay.subscriptions.update(subscriptionId, updateParams);

      this.logInfo('Subscription updated', { subscriptionId, params });
      return subscription;
    } catch (error) {
      this.logError('Failed to update subscription', {
        subscriptionId,
        error,
      });
      throw error;
    }
  }

  /**
   * Fetch all invoices for a subscription
   */
  async getSubscriptionInvoices(subscriptionId: string): Promise<any[]> {
    try {
      const invoices = await this.razorpay.invoices.all({
        subscription_id: subscriptionId,
      });
      return invoices.items || [];
    } catch (error) {
      this.logError('Failed to fetch subscription invoices', {
        subscriptionId,
        error,
      });
      throw error;
    }
  }

  // ============================================
  // ORDER MANAGEMENT (for one-time payments)
  // ============================================

  /**
   * Create an order for one-time payment
   */
  async createOrder(params: CreateOrderParams): Promise<any> {
    try {
      const order = await this.razorpay.orders.create({
        amount: params.amount,
        currency: params.currency,
        receipt: params.receipt,
        notes: params.notes,
      });

      this.logInfo('Order created', { orderId: order.id });
      return order;
    } catch (error) {
      this.logError('Failed to create order', { error, params });
      throw error;
    }
  }

  /**
   * Fetch order by ID
   */
  async getOrder(orderId: string): Promise<any> {
    try {
      return await this.razorpay.orders.fetch(orderId);
    } catch (error) {
      this.logError('Failed to fetch order', { orderId, error });
      throw error;
    }
  }

  // ============================================
  // PAYMENT MANAGEMENT
  // ============================================

  /**
   * Fetch payment by ID
   */
  async getPayment(paymentId: string): Promise<any> {
    try {
      return await this.razorpay.payments.fetch(paymentId);
    } catch (error) {
      this.logError('Failed to fetch payment', { paymentId, error });
      throw error;
    }
  }

  /**
   * Capture a payment (for orders)
   */
  async capturePayment(paymentId: string, amount: number, currency: string): Promise<any> {
    try {
      return await this.razorpay.payments.capture(paymentId, amount, currency);
    } catch (error) {
      this.logError('Failed to capture payment', { paymentId, error });
      throw error;
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(
    paymentId: string,
    amount?: number,
    notes?: Record<string, string>
  ): Promise<any> {
    try {
      const refund = await this.razorpay.payments.refund(paymentId, {
        amount,
        notes,
      });

      this.logInfo('Payment refunded', { paymentId, amount });
      return refund;
    } catch (error) {
      this.logError('Failed to refund payment', { paymentId, error });
      throw error;
    }
  }

  // ============================================
  // PLAN MANAGEMENT
  // ============================================

  /**
   * Create a plan (usually done via dashboard, but API available)
   */
  async createPlan(params: {
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    item: {
      name: string;
      amount: number;
      currency: 'INR' | 'USD';
      description?: string;
    };
    notes?: Record<string, string>;
  }): Promise<any> {
    try {
      return await this.razorpay.plans.create(params);
    } catch (error) {
      this.logError('Failed to create plan', { error, params });
      throw error;
    }
  }

  /**
   * Fetch plan by ID
   */
  async getPlan(planId: string): Promise<any> {
    try {
      return await this.razorpay.plans.fetch(planId);
    } catch (error) {
      this.logError('Failed to fetch plan', { planId, error });
      throw error;
    }
  }

  /**
   * Fetch all plans
   */
  async getAllPlans(): Promise<any[]> {
    try {
      const plans = await this.razorpay.plans.all();
      return plans.items || [];
    } catch (error) {
      this.logError('Failed to fetch plans', { error });
      throw error;
    }
  }

  // ============================================
  // INVOICE MANAGEMENT
  // ============================================

  /**
   * Fetch invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<any> {
    try {
      return await this.razorpay.invoices.fetch(invoiceId);
    } catch (error) {
      this.logError('Failed to fetch invoice', { invoiceId, error });
      throw error;
    }
  }

  /**
   * Fetch all invoices for a customer
   */
  async getCustomerInvoices(customerId: string): Promise<any[]> {
    try {
      const invoices = await this.razorpay.invoices.all({
        customer_id: customerId,
      });
      return invoices.items || [];
    } catch (error) {
      this.logError('Failed to fetch customer invoices', {
        customerId,
        error,
      });
      throw error;
    }
  }

  // ============================================
  // SIGNATURE VERIFICATION
  // ============================================

  /**
   * Verify payment signature for subscription payments
   */
  verifySubscriptionSignature(params: {
    subscriptionId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    const generatedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${params.paymentId}|${params.subscriptionId}`)
      .digest('hex');

    return generatedSignature === params.signature;
  }

  /**
   * Verify payment signature for order payments
   */
  verifyOrderSignature(params: { orderId: string; paymentId: string; signature: string }): boolean {
    const generatedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${params.orderId}|${params.paymentId}`)
      .digest('hex');

    return generatedSignature === params.signature;
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    body: string,
    signature: string,
    secret: string = env.RAZORPAY_WEBHOOK_SECRET
  ): boolean {
    const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');

    return expectedSignature === signature;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Get Plan ID based on subscription plan and interval
   */
  getPlanId(
    plan: SubscriptionPlan,
    interval: BillingInterval,
    currency: 'INR' | 'USD' = 'INR'
  ): string {
    const planMap = {
      INR: {
        [SubscriptionPlan.PRO]: {
          [BillingInterval.MONTHLY]: env.RAZORPAY_PLAN_PRO_MONTHLY,
          [BillingInterval.YEARLY]: env.RAZORPAY_PLAN_PRO_YEARLY,
        },
        [SubscriptionPlan.PREMIUM]: {
          [BillingInterval.MONTHLY]: env.RAZORPAY_PLAN_PREMIUM_MONTHLY,
          [BillingInterval.YEARLY]: env.RAZORPAY_PLAN_PREMIUM_YEARLY,
        },
      },
      USD: {
        [SubscriptionPlan.PRO]: {
          [BillingInterval.MONTHLY]: env.RAZORPAY_PLAN_PRO_MONTHLY_USD,
          [BillingInterval.YEARLY]: env.RAZORPAY_PLAN_PRO_YEARLY_USD,
        },
        [SubscriptionPlan.PREMIUM]: {
          [BillingInterval.MONTHLY]: env.RAZORPAY_PLAN_PREMIUM_MONTHLY_USD,
          [BillingInterval.YEARLY]: env.RAZORPAY_PLAN_PREMIUM_YEARLY_USD,
        },
      },
    };

    const planId = planMap[currency]?.[plan]?.[interval];

    if (!planId) {
      throw new Error(`Invalid plan configuration: ${plan}/${interval}/${currency}`);
    }

    return planId;
  }

  /**
   * Get plan details from Plan ID
   */
  getPlanFromPlanId(planId: string): {
    plan: SubscriptionPlan;
    interval: BillingInterval;
    currency: 'INR' | 'USD';
  } {
    const planIdMap: Record<
      string,
      { plan: SubscriptionPlan; interval: BillingInterval; currency: 'INR' | 'USD' }
    > = {
      [env.RAZORPAY_PLAN_PRO_MONTHLY]: {
        plan: SubscriptionPlan.PRO,
        interval: BillingInterval.MONTHLY,
        currency: 'INR',
      },
      [env.RAZORPAY_PLAN_PRO_YEARLY]: {
        plan: SubscriptionPlan.PRO,
        interval: BillingInterval.YEARLY,
        currency: 'INR',
      },
      [env.RAZORPAY_PLAN_PREMIUM_MONTHLY]: {
        plan: SubscriptionPlan.PREMIUM,
        interval: BillingInterval.MONTHLY,
        currency: 'INR',
      },
      [env.RAZORPAY_PLAN_PREMIUM_YEARLY]: {
        plan: SubscriptionPlan.PREMIUM,
        interval: BillingInterval.YEARLY,
        currency: 'INR',
      },
    };

    // Add USD plans if configured
    if (env.RAZORPAY_PLAN_PRO_MONTHLY_USD) {
      planIdMap[env.RAZORPAY_PLAN_PRO_MONTHLY_USD] = {
        plan: SubscriptionPlan.PRO,
        interval: BillingInterval.MONTHLY,
        currency: 'USD',
      };
    }
    if (env.RAZORPAY_PLAN_PRO_YEARLY_USD) {
      planIdMap[env.RAZORPAY_PLAN_PRO_YEARLY_USD] = {
        plan: SubscriptionPlan.PRO,
        interval: BillingInterval.YEARLY,
        currency: 'USD',
      };
    }
    if (env.RAZORPAY_PLAN_PREMIUM_MONTHLY_USD) {
      planIdMap[env.RAZORPAY_PLAN_PREMIUM_MONTHLY_USD] = {
        plan: SubscriptionPlan.PREMIUM,
        interval: BillingInterval.MONTHLY,
        currency: 'USD',
      };
    }
    if (env.RAZORPAY_PLAN_PREMIUM_YEARLY_USD) {
      planIdMap[env.RAZORPAY_PLAN_PREMIUM_YEARLY_USD] = {
        plan: SubscriptionPlan.PREMIUM,
        interval: BillingInterval.YEARLY,
        currency: 'USD',
      };
    }

    const result = planIdMap[planId];

    if (!result) {
      return {
        plan: SubscriptionPlan.FREE,
        interval: BillingInterval.MONTHLY,
        currency: 'INR',
      };
    }

    return result;
  }

  /**
   * Format amount from paise to rupees for display
   */
  formatAmount(amountInPaise: number, currency: 'INR' | 'USD' = 'INR'): string {
    const amount = amountInPaise / 100;
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

export const razorpayService = new RazorpayService();
```

### Razorpay Types

```typescript
// src/services/razorpay/razorpay.types.ts

export interface RazorpayCustomer {
  id: string;
  entity: 'customer';
  name: string;
  email: string;
  contact: string;
  gstin: string | null;
  notes: Record<string, string>;
  created_at: number;
}

export interface RazorpaySubscription {
  id: string;
  entity: 'subscription';
  plan_id: string;
  customer_id: string;
  status:
    | 'created'
    | 'authenticated'
    | 'active'
    | 'pending'
    | 'halted'
    | 'cancelled'
    | 'completed'
    | 'expired'
    | 'paused';
  current_start: number | null;
  current_end: number | null;
  ended_at: number | null;
  quantity: number;
  notes: Record<string, string>;
  charge_at: number | null;
  start_at: number | null;
  end_at: number | null;
  auth_attempts: number;
  total_count: number;
  paid_count: number;
  remaining_count: number;
  customer_notify: 0 | 1;
  created_at: number;
  expire_by: number | null;
  short_url: string;
  has_scheduled_changes: boolean;
  change_scheduled_at: number | null;
  source: string;
  payment_method: string;
  offer_id: string | null;
}

export interface RazorpayPayment {
  id: string;
  entity: 'payment';
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  order_id: string;
  invoice_id: string | null;
  international: boolean;
  method: 'card' | 'netbanking' | 'wallet' | 'emi' | 'upi' | 'cardless_emi' | 'paylater';
  amount_refunded: number;
  refund_status: string | null;
  captured: boolean;
  description: string | null;
  card_id: string | null;
  bank: string | null;
  wallet: string | null;
  vpa: string | null;
  email: string;
  contact: string;
  customer_id: string | null;
  notes: Record<string, string>;
  fee: number;
  tax: number;
  error_code: string | null;
  error_description: string | null;
  error_source: string | null;
  error_step: string | null;
  error_reason: string | null;
  acquirer_data: {
    bank_transaction_id?: string;
    auth_code?: string;
  };
  created_at: number;
}

export interface RazorpayPlan {
  id: string;
  entity: 'plan';
  interval: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  item: {
    id: string;
    active: boolean;
    amount: number;
    unit_amount: number;
    currency: string;
    name: string;
    description: string;
    unit: string | null;
    hsn_code: string | null;
    sac_code: string | null;
    tax_inclusive: boolean;
    tax_id: string | null;
    tax_group_id: string | null;
  };
  notes: Record<string, string>;
  created_at: number;
}

export interface RazorpayInvoice {
  id: string;
  entity: 'invoice';
  type: 'invoice' | 'link';
  invoice_number: string;
  customer_id: string;
  customer_details: {
    id: string;
    name: string;
    email: string;
    contact: string;
    billing_address: any;
    shipping_address: any;
  };
  order_id: string;
  line_items: Array<{
    id: string;
    item_id: string;
    name: string;
    description: string;
    amount: number;
    unit_amount: number;
    gross_amount: number;
    tax_amount: number;
    taxable_amount: number;
    net_amount: number;
    currency: string;
    type: string;
    unit: string | null;
    quantity: number;
    taxes: any[];
    hsn_code: string | null;
    sac_code: string | null;
  }>;
  payment_id: string | null;
  status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'cancelled' | 'expired';
  expire_by: number | null;
  issued_at: number | null;
  paid_at: number | null;
  cancelled_at: number | null;
  expired_at: number | null;
  sms_status: string | null;
  email_status: string | null;
  date: number;
  terms: string | null;
  partial_payment: boolean;
  gross_amount: number;
  tax_amount: number;
  taxable_amount: number;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  currency_symbol: string;
  description: string;
  notes: Record<string, string>;
  comment: string | null;
  short_url: string;
  view_less: boolean;
  billing_start: number | null;
  billing_end: number | null;
  group_taxes_discounts: boolean;
  created_at: number;
  subscription_status: string | null;
}

export interface RazorpayWebhookEvent {
  entity: 'event';
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    subscription?: { entity: RazorpaySubscription };
    payment?: { entity: RazorpayPayment };
    invoice?: { entity: RazorpayInvoice };
    order?: { entity: any };
  };
  created_at: number;
}

// Webhook event types
export type RazorpayWebhookEventType =
  | 'subscription.activated'
  | 'subscription.authenticated'
  | 'subscription.charged'
  | 'subscription.completed'
  | 'subscription.updated'
  | 'subscription.pending'
  | 'subscription.halted'
  | 'subscription.cancelled'
  | 'subscription.paused'
  | 'subscription.resumed'
  | 'payment.authorized'
  | 'payment.captured'
  | 'payment.failed'
  | 'invoice.paid'
  | 'invoice.partially_paid'
  | 'invoice.expired';
```

---

## API Endpoints

### Routes Definition

```typescript
// src/features/subscription/subscription.routes.ts

import { FastifyInstance } from 'fastify';
import { SubscriptionController } from './subscription.controller';
import { validateAuth } from '../../middlewares/auth.middleware';
import {
  createSubscriptionSchema,
  verifyPaymentSchema,
  changePlanSchema,
  cancelSubscriptionSchema,
} from './subscription.validators';

export async function subscriptionRoutes(app: FastifyInstance) {
  const controller = new SubscriptionController();

  // ============================================
  // PUBLIC ROUTES
  // ============================================

  // Get available plans
  app.get(
    '/subscription/plans',
    {
      schema: {
        tags: ['Subscription'],
        summary: 'Get all available subscription plans',
        response: {
          200: { $ref: 'PlansResponse#' },
        },
      },
    },
    controller.getPlans.bind(controller)
  );

  // Razorpay Webhook (no auth - uses Razorpay signature)
  app.post(
    '/webhooks/razorpay',
    {
      config: {
        rawBody: true,
      },
      schema: {
        tags: ['Webhooks'],
        summary: 'Razorpay webhook endpoint',
        hide: true,
      },
    },
    controller.handleWebhook.bind(controller)
  );

  // ============================================
  // AUTHENTICATED ROUTES
  // ============================================

  // Get current subscription
  app.get(
    '/subscription',
    {
      preHandler: [validateAuth],
      schema: {
        tags: ['Subscription'],
        summary: 'Get current user subscription',
        security: [{ bearerAuth: [] }],
        response: {
          200: { $ref: 'SubscriptionResponse#' },
        },
      },
    },
    controller.getCurrentSubscription.bind(controller)
  );

  // Create subscription (initiate payment)
  app.post(
    '/subscription/create',
    {
      preHandler: [validateAuth],
      schema: {
        tags: ['Subscription'],
        summary: 'Create a new subscription',
        security: [{ bearerAuth: [] }],
        body: createSubscriptionSchema,
        response: {
          200: { $ref: 'CreateSubscriptionResponse#' },
        },
      },
    },
    controller.createSubscription.bind(controller)
  );

  // Verify payment after checkout
  app.post(
    '/subscription/verify',
    {
      preHandler: [validateAuth],
      schema: {
        tags: ['Subscription'],
        summary: 'Verify subscription payment',
        security: [{ bearerAuth: [] }],
        body: verifyPaymentSchema,
        response: {
          200: { $ref: 'SubscriptionResponse#' },
        },
      },
    },
    controller.verifyPayment.bind(controller)
  );

  // Change plan
  app.post(
    '/subscription/change-plan',
    {
      preHandler: [validateAuth],
      schema: {
        tags: ['Subscription'],
        summary: 'Change subscription plan',
        security: [{ bearerAuth: [] }],
        body: changePlanSchema,
        response: {
          200: { $ref: 'SubscriptionResponse#' },
        },
      },
    },
    controller.changePlan.bind(controller)
  );

  // Cancel subscription
  app.post(
    '/subscription/cancel',
    {
      preHandler: [validateAuth],
      schema: {
        tags: ['Subscription'],
        summary: 'Cancel subscription',
        security: [{ bearerAuth: [] }],
        body: cancelSubscriptionSchema,
        response: {
          200: { $ref: 'SubscriptionResponse#' },
        },
      },
    },
    controller.cancelSubscription.bind(controller)
  );

  // Pause subscription
  app.post(
    '/subscription/pause',
    {
      preHandler: [validateAuth],
      schema: {
        tags: ['Subscription'],
        summary: 'Pause subscription',
        security: [{ bearerAuth: [] }],
        response: {
          200: { $ref: 'SubscriptionResponse#' },
        },
      },
    },
    controller.pauseSubscription.bind(controller)
  );

  // Resume subscription
  app.post(
    '/subscription/resume',
    {
      preHandler: [validateAuth],
      schema: {
        tags: ['Subscription'],
        summary: 'Resume paused subscription',
        security: [{ bearerAuth: [] }],
        response: {
          200: { $ref: 'SubscriptionResponse#' },
        },
      },
    },
    controller.resumeSubscription.bind(controller)
  );

  // Get payment history
  app.get(
    '/subscription/payments',
    {
      preHandler: [validateAuth],
      schema: {
        tags: ['Subscription'],
        summary: 'Get payment history',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 10 },
            offset: { type: 'number', default: 0 },
          },
        },
        response: {
          200: { $ref: 'PaymentHistoryResponse#' },
        },
      },
    },
    controller.getPaymentHistory.bind(controller)
  );

  // Get invoices
  app.get(
    '/subscription/invoices',
    {
      preHandler: [validateAuth],
      schema: {
        tags: ['Subscription'],
        summary: 'Get invoices',
        security: [{ bearerAuth: [] }],
        response: {
          200: { $ref: 'InvoicesResponse#' },
        },
      },
    },
    controller.getInvoices.bind(controller)
  );

  // Get usage stats
  app.get(
    '/subscription/usage',
    {
      preHandler: [validateAuth],
      schema: {
        tags: ['Subscription'],
        summary: 'Get current usage statistics',
        security: [{ bearerAuth: [] }],
        response: {
          200: { $ref: 'UsageStatsResponse#' },
        },
      },
    },
    controller.getUsageStats.bind(controller)
  );
}
```

### Validators

```typescript
// src/features/subscription/subscription.validators.ts

import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  plan: z.enum(['PRO', 'PREMIUM']),
  interval: z.enum(['monthly', 'yearly']),
  currency: z.enum(['INR', 'USD']).default('INR'),
});

export const verifyPaymentSchema = z.object({
  razorpay_payment_id: z.string(),
  razorpay_subscription_id: z.string(),
  razorpay_signature: z.string(),
});

export const changePlanSchema = z.object({
  plan: z.enum(['PRO', 'PREMIUM']),
  interval: z.enum(['monthly', 'yearly']),
  scheduleChange: z.enum(['now', 'cycle_end']).default('cycle_end'),
});

export const cancelSubscriptionSchema = z.object({
  immediate: z.boolean().default(false),
  reason: z.string().optional(),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type ChangePlanInput = z.infer<typeof changePlanSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
```

### Controller Implementation

```typescript
// src/features/subscription/subscription.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseModule } from '../../utils/baseClass';
import { SubscriptionService } from './subscription.service';
import { ApiResponse } from '../../utils/apiResponse';
import {
  CreateSubscriptionInput,
  VerifyPaymentInput,
  ChangePlanInput,
  CancelSubscriptionInput,
} from './subscription.validators';

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    clerkId: string;
    email: string;
    username: string;
  };
}

export class SubscriptionController extends BaseModule {
  private subscriptionService: SubscriptionService;

  constructor() {
    super('SubscriptionController');
    this.subscriptionService = new SubscriptionService();
  }

  /**
   * Get available subscription plans
   */
  async getPlans(request: FastifyRequest, reply: FastifyReply) {
    const plans = this.subscriptionService.getAvailablePlans();
    return ApiResponse.success(reply, plans, 'Plans retrieved successfully');
  }

  /**
   * Get current user's subscription
   */
  async getCurrentSubscription(request: AuthenticatedRequest, reply: FastifyReply) {
    const subscription = await this.subscriptionService.getSubscription(request.user.id);
    return ApiResponse.success(reply, subscription, 'Subscription retrieved successfully');
  }

  /**
   * Create a new subscription
   */
  async createSubscription(request: AuthenticatedRequest, reply: FastifyReply) {
    const body = request.body as CreateSubscriptionInput;

    const result = await this.subscriptionService.createSubscription({
      userId: request.user.id,
      email: request.user.email,
      name: request.user.username,
      plan: body.plan as 'PRO' | 'PREMIUM',
      interval: body.interval as 'monthly' | 'yearly',
      currency: body.currency as 'INR' | 'USD',
    });

    return ApiResponse.success(reply, result, 'Subscription created successfully');
  }

  /**
   * Verify payment after Razorpay checkout
   */
  async verifyPayment(request: AuthenticatedRequest, reply: FastifyReply) {
    const body = request.body as VerifyPaymentInput;

    const subscription = await this.subscriptionService.verifyPayment({
      userId: request.user.id,
      razorpayPaymentId: body.razorpay_payment_id,
      razorpaySubscriptionId: body.razorpay_subscription_id,
      razorpaySignature: body.razorpay_signature,
    });

    return ApiResponse.success(reply, subscription, 'Payment verified successfully');
  }

  /**
   * Change subscription plan
   */
  async changePlan(request: AuthenticatedRequest, reply: FastifyReply) {
    const body = request.body as ChangePlanInput;

    const subscription = await this.subscriptionService.changePlan({
      userId: request.user.id,
      newPlan: body.plan as 'PRO' | 'PREMIUM',
      newInterval: body.interval as 'monthly' | 'yearly',
      scheduleChange: body.scheduleChange as 'now' | 'cycle_end',
    });

    return ApiResponse.success(reply, subscription, 'Plan changed successfully');
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(request: AuthenticatedRequest, reply: FastifyReply) {
    const body = request.body as CancelSubscriptionInput;

    const subscription = await this.subscriptionService.cancelSubscription(
      request.user.id,
      body.immediate,
      body.reason
    );

    return ApiResponse.success(reply, subscription, 'Subscription cancelled successfully');
  }

  /**
   * Pause subscription
   */
  async pauseSubscription(request: AuthenticatedRequest, reply: FastifyReply) {
    const subscription = await this.subscriptionService.pauseSubscription(request.user.id);

    return ApiResponse.success(reply, subscription, 'Subscription paused successfully');
  }

  /**
   * Resume subscription
   */
  async resumeSubscription(request: AuthenticatedRequest, reply: FastifyReply) {
    const subscription = await this.subscriptionService.resumeSubscription(request.user.id);

    return ApiResponse.success(reply, subscription, 'Subscription resumed successfully');
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(request: AuthenticatedRequest, reply: FastifyReply) {
    const { limit = 10, offset = 0 } = request.query as {
      limit?: number;
      offset?: number;
    };

    const history = await this.subscriptionService.getPaymentHistory(
      request.user.id,
      limit,
      offset
    );

    return ApiResponse.success(reply, history, 'Payment history retrieved successfully');
  }

  /**
   * Get invoices
   */
  async getInvoices(request: AuthenticatedRequest, reply: FastifyReply) {
    const invoices = await this.subscriptionService.getInvoices(request.user.id);

    return ApiResponse.success(reply, invoices, 'Invoices retrieved successfully');
  }

  /**
   * Get usage stats
   */
  async getUsageStats(request: AuthenticatedRequest, reply: FastifyReply) {
    const usage = await this.subscriptionService.getUsageStats(request.user.id);
    return ApiResponse.success(reply, usage, 'Usage stats retrieved successfully');
  }

  /**
   * Handle Razorpay webhook
   */
  async handleWebhook(request: FastifyRequest, reply: FastifyReply) {
    const signature = request.headers['x-razorpay-signature'] as string;
    const rawBody = (request as any).rawBody;

    try {
      await this.subscriptionService.handleWebhook(rawBody, signature);
      return reply.status(200).send({ status: 'ok' });
    } catch (error) {
      this.logError('Webhook handling failed', { error });
      return reply.status(400).send({ error: 'Webhook handling failed' });
    }
  }
}
```

---

## Webhook Handling

### Webhook Handler

```typescript
// src/services/razorpay/razorpay.webhook.ts

import { razorpayService } from './razorpay.service';
import { SubscriptionRepository } from '../../features/subscription/repository/subscription.repository';
import { PaymentHistoryRepository } from '../../features/subscription/repository/payment-history.repository';
import { NotificationService } from '../notification/notification.service';
import { QueueService } from '../queue/queue.service';
import { SubscriptionStatus, SubscriptionPlan } from '../../models/subscription.model';
import { PaymentStatus } from '../../models/payment-history.model';
import { BaseModule } from '../../utils/baseClass';
import {
  RazorpayWebhookEvent,
  RazorpaySubscription,
  RazorpayPayment,
  RazorpayInvoice,
} from './razorpay.types';

export class RazorpayWebhookHandler extends BaseModule {
  private subscriptionRepo: SubscriptionRepository;
  private paymentHistoryRepo: PaymentHistoryRepository;
  private notificationService: NotificationService;
  private queueService: QueueService;

  constructor() {
    super('RazorpayWebhookHandler');
    this.subscriptionRepo = new SubscriptionRepository();
    this.paymentHistoryRepo = new PaymentHistoryRepository();
    this.notificationService = new NotificationService();
    this.queueService = new QueueService();
  }

  /**
   * Main webhook event handler
   */
  async handleEvent(event: RazorpayWebhookEvent): Promise<void> {
    this.logInfo('Processing webhook event', { type: event.event });

    switch (event.event) {
      // Subscription events
      case 'subscription.authenticated':
        await this.handleSubscriptionAuthenticated(event.payload.subscription!.entity);
        break;

      case 'subscription.activated':
        await this.handleSubscriptionActivated(event.payload.subscription!.entity);
        break;

      case 'subscription.charged':
        await this.handleSubscriptionCharged(
          event.payload.subscription!.entity,
          event.payload.payment!.entity
        );
        break;

      case 'subscription.pending':
        await this.handleSubscriptionPending(event.payload.subscription!.entity);
        break;

      case 'subscription.halted':
        await this.handleSubscriptionHalted(event.payload.subscription!.entity);
        break;

      case 'subscription.cancelled':
        await this.handleSubscriptionCancelled(event.payload.subscription!.entity);
        break;

      case 'subscription.paused':
        await this.handleSubscriptionPaused(event.payload.subscription!.entity);
        break;

      case 'subscription.resumed':
        await this.handleSubscriptionResumed(event.payload.subscription!.entity);
        break;

      case 'subscription.completed':
        await this.handleSubscriptionCompleted(event.payload.subscription!.entity);
        break;

      case 'subscription.updated':
        await this.handleSubscriptionUpdated(event.payload.subscription!.entity);
        break;

      // Payment events
      case 'payment.authorized':
        await this.handlePaymentAuthorized(event.payload.payment!.entity);
        break;

      case 'payment.captured':
        await this.handlePaymentCaptured(event.payload.payment!.entity);
        break;

      case 'payment.failed':
        await this.handlePaymentFailed(event.payload.payment!.entity);
        break;

      // Invoice events
      case 'invoice.paid':
        await this.handleInvoicePaid(event.payload.invoice!.entity);
        break;

      case 'invoice.expired':
        await this.handleInvoiceExpired(event.payload.invoice!.entity);
        break;

      default:
        this.logInfo('Unhandled webhook event', { type: event.event });
    }
  }

  // ============================================
  // SUBSCRIPTION EVENT HANDLERS
  // ============================================

  private async handleSubscriptionAuthenticated(subscription: RazorpaySubscription): Promise<void> {
    this.logInfo('Subscription authenticated', { id: subscription.id });

    const existingSub = await this.subscriptionRepo.findByRazorpayCustomerId(
      subscription.customer_id
    );

    if (existingSub) {
      await this.subscriptionRepo.update(existingSub._id, {
        razorpaySubscriptionId: subscription.id,
        status: SubscriptionStatus.AUTHENTICATED,
      });
    }
  }

  private async handleSubscriptionActivated(subscription: RazorpaySubscription): Promise<void> {
    this.logInfo('Subscription activated', { id: subscription.id });

    const existingSub = await this.subscriptionRepo.findByRazorpaySubscriptionId(subscription.id);

    if (!existingSub) {
      this.logError('Subscription not found', { id: subscription.id });
      return;
    }

    const { plan, interval, currency } = razorpayService.getPlanFromPlanId(subscription.plan_id);

    await this.subscriptionRepo.update(existingSub._id, {
      plan,
      billingInterval: interval,
      currency,
      status: SubscriptionStatus.ACTIVE,
      razorpayPlanId: subscription.plan_id,
      currentPeriodStart: subscription.current_start
        ? new Date(subscription.current_start * 1000)
        : null,
      currentPeriodEnd: subscription.current_end ? new Date(subscription.current_end * 1000) : null,
      chargeAt: subscription.charge_at ? new Date(subscription.charge_at * 1000) : null,
      totalCount: subscription.total_count,
      paidCount: subscription.paid_count,
      remainingCount: subscription.remaining_count,
      shortUrl: subscription.short_url,
    });

    // Send welcome notification
    await this.notificationService.createNotification({
      userId: existingSub.userId,
      type: 'SUBSCRIPTION_ACTIVATED',
      title: 'Subscription Activated',
      message: `Welcome to ${plan} plan! Your subscription is now active.`,
      data: { plan },
    });

    // Send welcome email
    await this.queueService.addJob('sendEmail', {
      type: 'SUBSCRIPTION_WELCOME',
      userId: existingSub.userId.toString(),
      data: { plan },
    });
  }

  private async handleSubscriptionCharged(
    subscription: RazorpaySubscription,
    payment: RazorpayPayment
  ): Promise<void> {
    this.logInfo('Subscription charged', {
      subscriptionId: subscription.id,
      paymentId: payment.id,
    });

    const existingSub = await this.subscriptionRepo.findByRazorpaySubscriptionId(subscription.id);

    if (!existingSub) {
      this.logError('Subscription not found for charge', {
        id: subscription.id,
      });
      return;
    }

    // Update subscription
    await this.subscriptionRepo.update(existingSub._id, {
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: subscription.current_start
        ? new Date(subscription.current_start * 1000)
        : null,
      currentPeriodEnd: subscription.current_end ? new Date(subscription.current_end * 1000) : null,
      chargeAt: subscription.charge_at ? new Date(subscription.charge_at * 1000) : null,
      paidCount: subscription.paid_count,
      remainingCount: subscription.remaining_count,
    });

    // Record payment
    await this.paymentHistoryRepo.create({
      userId: existingSub.userId,
      subscriptionId: existingSub._id,
      razorpayPaymentId: payment.id,
      razorpayOrderId: payment.order_id,
      razorpaySubscriptionId: subscription.id,
      razorpaySignature: '',
      razorpayInvoiceId: payment.invoice_id,
      amount: payment.amount,
      currency: payment.currency as 'INR' | 'USD',
      status: PaymentStatus.CAPTURED,
      method: payment.method,
      paymentMethodDetails: {
        type: payment.method,
        last4: null,
        network: null,
        bank: payment.bank,
        wallet: payment.wallet,
        vpa: payment.vpa,
      },
      description: `Subscription payment for ${existingSub.plan}`,
      billingPeriodStart: subscription.current_start
        ? new Date(subscription.current_start * 1000)
        : new Date(),
      billingPeriodEnd: subscription.current_end
        ? new Date(subscription.current_end * 1000)
        : new Date(),
      capturedAt: new Date(),
      international: payment.international,
      fee: payment.fee,
      tax: payment.tax,
    });

    // Send payment receipt
    await this.queueService.addJob('sendEmail', {
      type: 'PAYMENT_RECEIPT',
      userId: existingSub.userId.toString(),
      data: {
        amount: payment.amount / 100,
        currency: payment.currency,
        paymentId: payment.id,
      },
    });
  }

  private async handleSubscriptionPending(subscription: RazorpaySubscription): Promise<void> {
    this.logInfo('Subscription pending', { id: subscription.id });

    const existingSub = await this.subscriptionRepo.findByRazorpaySubscriptionId(subscription.id);

    if (!existingSub) return;

    await this.subscriptionRepo.update(existingSub._id, {
      status: SubscriptionStatus.PENDING,
    });

    // Notify user about pending payment
    await this.notificationService.createNotification({
      userId: existingSub.userId,
      type: 'PAYMENT_PENDING',
      title: 'Payment Pending',
      message: 'Your subscription payment is pending. Please complete the payment.',
      priority: 'high',
    });
  }

  private async handleSubscriptionHalted(subscription: RazorpaySubscription): Promise<void> {
    this.logInfo('Subscription halted', { id: subscription.id });

    const existingSub = await this.subscriptionRepo.findByRazorpaySubscriptionId(subscription.id);

    if (!existingSub) return;

    await this.subscriptionRepo.update(existingSub._id, {
      status: SubscriptionStatus.HALTED,
    });

    // Notify user about halted subscription
    await this.notificationService.createNotification({
      userId: existingSub.userId,
      type: 'SUBSCRIPTION_HALTED',
      title: 'Subscription Halted',
      message:
        'Your subscription has been halted due to payment failure. Please update your payment method.',
      priority: 'high',
    });

    // Send email
    await this.queueService.addJob('sendEmail', {
      type: 'SUBSCRIPTION_HALTED',
      userId: existingSub.userId.toString(),
    });
  }

  private async handleSubscriptionCancelled(subscription: RazorpaySubscription): Promise<void> {
    this.logInfo('Subscription cancelled', { id: subscription.id });

    const existingSub = await this.subscriptionRepo.findByRazorpaySubscriptionId(subscription.id);

    if (!existingSub) return;

    // Downgrade to free plan
    await this.subscriptionRepo.update(existingSub._id, {
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.CANCELLED,
      razorpaySubscriptionId: null,
      razorpayPlanId: null,
      cancelledAt: new Date(),
    });

    // Notify user
    await this.notificationService.createNotification({
      userId: existingSub.userId,
      type: 'SUBSCRIPTION_CANCELLED',
      title: 'Subscription Cancelled',
      message: 'Your subscription has been cancelled. You are now on the Free plan.',
    });

    // Send email
    await this.queueService.addJob('sendEmail', {
      type: 'SUBSCRIPTION_CANCELLED',
      userId: existingSub.userId.toString(),
    });
  }

  private async handleSubscriptionPaused(subscription: RazorpaySubscription): Promise<void> {
    this.logInfo('Subscription paused', { id: subscription.id });

    const existingSub = await this.subscriptionRepo.findByRazorpaySubscriptionId(subscription.id);

    if (!existingSub) return;

    await this.subscriptionRepo.update(existingSub._id, {
      status: SubscriptionStatus.PAUSED,
      pausedAt: new Date(),
    });

    await this.notificationService.createNotification({
      userId: existingSub.userId,
      type: 'SUBSCRIPTION_PAUSED',
      title: 'Subscription Paused',
      message: 'Your subscription has been paused. You can resume it anytime.',
    });
  }

  private async handleSubscriptionResumed(subscription: RazorpaySubscription): Promise<void> {
    this.logInfo('Subscription resumed', { id: subscription.id });

    const existingSub = await this.subscriptionRepo.findByRazorpaySubscriptionId(subscription.id);

    if (!existingSub) return;

    await this.subscriptionRepo.update(existingSub._id, {
      status: SubscriptionStatus.ACTIVE,
      pausedAt: null,
    });

    await this.notificationService.createNotification({
      userId: existingSub.userId,
      type: 'SUBSCRIPTION_RESUMED',
      title: 'Subscription Resumed',
      message: 'Your subscription has been resumed successfully.',
    });
  }

  private async handleSubscriptionCompleted(subscription: RazorpaySubscription): Promise<void> {
    this.logInfo('Subscription completed', { id: subscription.id });

    const existingSub = await this.subscriptionRepo.findByRazorpaySubscriptionId(subscription.id);

    if (!existingSub) return;

    // Downgrade to free after subscription completes
    await this.subscriptionRepo.update(existingSub._id, {
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.COMPLETED,
      razorpaySubscriptionId: null,
      razorpayPlanId: null,
    });

    await this.notificationService.createNotification({
      userId: existingSub.userId,
      type: 'SUBSCRIPTION_COMPLETED',
      title: 'Subscription Completed',
      message:
        'Your subscription has completed all billing cycles. Consider renewing to continue enjoying premium features.',
    });
  }

  private async handleSubscriptionUpdated(subscription: RazorpaySubscription): Promise<void> {
    this.logInfo('Subscription updated', { id: subscription.id });

    const existingSub = await this.subscriptionRepo.findByRazorpaySubscriptionId(subscription.id);

    if (!existingSub) return;

    const { plan, interval, currency } = razorpayService.getPlanFromPlanId(subscription.plan_id);

    const previousPlan = existingSub.plan;

    await this.subscriptionRepo.update(existingSub._id, {
      plan,
      billingInterval: interval,
      currency,
      razorpayPlanId: subscription.plan_id,
      status: subscription.status as SubscriptionStatus,
      currentPeriodStart: subscription.current_start
        ? new Date(subscription.current_start * 1000)
        : null,
      currentPeriodEnd: subscription.current_end ? new Date(subscription.current_end * 1000) : null,
      chargeAt: subscription.charge_at ? new Date(subscription.charge_at * 1000) : null,
      totalCount: subscription.total_count,
      paidCount: subscription.paid_count,
      remainingCount: subscription.remaining_count,
    });

    // Notify on plan changes
    if (previousPlan !== plan) {
      await this.notificationService.createNotification({
        userId: existingSub.userId,
        type: 'PLAN_CHANGED',
        title: 'Plan Updated',
        message: `Your plan has been changed from ${previousPlan} to ${plan}.`,
        data: { previousPlan, newPlan: plan },
      });
    }
  }

  // ============================================
  // PAYMENT EVENT HANDLERS
  // ============================================

  private async handlePaymentAuthorized(payment: RazorpayPayment): Promise<void> {
    this.logInfo('Payment authorized', { id: payment.id });
    // Payment will be captured automatically for subscriptions
  }

  private async handlePaymentCaptured(payment: RazorpayPayment): Promise<void> {
    this.logInfo('Payment captured', { id: payment.id });
    // Payment recording is handled in subscription.charged event
  }

  private async handlePaymentFailed(payment: RazorpayPayment): Promise<void> {
    this.logInfo('Payment failed', {
      id: payment.id,
      error: payment.error_description,
    });

    // Find subscription by customer ID
    if (!payment.customer_id) return;

    const existingSub = await this.subscriptionRepo.findByRazorpayCustomerId(payment.customer_id);

    if (!existingSub) return;

    // Record failed payment
    await this.paymentHistoryRepo.create({
      userId: existingSub.userId,
      subscriptionId: existingSub._id,
      razorpayPaymentId: payment.id,
      razorpayOrderId: payment.order_id,
      razorpaySubscriptionId: existingSub.razorpaySubscriptionId || '',
      razorpaySignature: '',
      razorpayInvoiceId: payment.invoice_id,
      amount: payment.amount,
      currency: payment.currency as 'INR' | 'USD',
      status: PaymentStatus.FAILED,
      method: payment.method,
      paymentMethodDetails: {
        type: payment.method,
        last4: null,
        network: null,
        bank: payment.bank,
        wallet: payment.wallet,
        vpa: payment.vpa,
      },
      errorCode: payment.error_code,
      errorDescription: payment.error_description,
      errorSource: payment.error_source,
      errorStep: payment.error_step,
      errorReason: payment.error_reason,
      description: 'Failed payment attempt',
      billingPeriodStart: new Date(),
      billingPeriodEnd: new Date(),
      capturedAt: null,
      international: payment.international,
      fee: 0,
      tax: 0,
    });

    // Notify user
    await this.notificationService.createNotification({
      userId: existingSub.userId,
      type: 'PAYMENT_FAILED',
      title: 'Payment Failed',
      message: `Payment failed: ${payment.error_description || 'Unknown error'}. Please try again.`,
      priority: 'high',
    });

    // Send email
    await this.queueService.addJob('sendEmail', {
      type: 'PAYMENT_FAILED',
      userId: existingSub.userId.toString(),
      data: {
        amount: payment.amount / 100,
        error: payment.error_description,
      },
    });
  }

  // ============================================
  // INVOICE EVENT HANDLERS
  // ============================================

  private async handleInvoicePaid(invoice: RazorpayInvoice): Promise<void> {
    this.logInfo('Invoice paid', { id: invoice.id });
    // Invoice handling is already covered by subscription.charged
  }

  private async handleInvoiceExpired(invoice: RazorpayInvoice): Promise<void> {
    this.logInfo('Invoice expired', { id: invoice.id });

    const existingSub = await this.subscriptionRepo.findByRazorpayCustomerId(invoice.customer_id);

    if (!existingSub) return;

    await this.notificationService.createNotification({
      userId: existingSub.userId,
      type: 'INVOICE_EXPIRED',
      title: 'Invoice Expired',
      message: 'Your invoice has expired. Please contact support if you need assistance.',
    });
  }
}

export const razorpayWebhookHandler = new RazorpayWebhookHandler();
```

---

## Feature Gating

### Plan Limits Configuration

```typescript
// src/constants/plans.ts

import { SubscriptionPlan } from '../models/subscription.model';

export interface PlanLimits {
  maxStories: number;
  maxChaptersPerStory: number;
  maxCollaboratorsPerStory: number;
  maxPullRequestsPerMonth: number;
  aiWritingAssistance: 'none' | 'basic' | 'advanced';
  analytics: 'basic' | 'detailed' | 'advanced';
  customThemes: number;
  exportFormats: string[];
  prioritySupport: boolean;
  earlyAccess: boolean;
  adFree: boolean;
  apiAccess: boolean;
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  [SubscriptionPlan.FREE]: {
    maxStories: 3,
    maxChaptersPerStory: 10,
    maxCollaboratorsPerStory: 2,
    maxPullRequestsPerMonth: 5,
    aiWritingAssistance: 'none',
    analytics: 'basic',
    customThemes: 0,
    exportFormats: [],
    prioritySupport: false,
    earlyAccess: false,
    adFree: false,
    apiAccess: false,
  },
  [SubscriptionPlan.PRO]: {
    maxStories: 15,
    maxChaptersPerStory: 50,
    maxCollaboratorsPerStory: 10,
    maxPullRequestsPerMonth: 50,
    aiWritingAssistance: 'basic',
    analytics: 'detailed',
    customThemes: 5,
    exportFormats: ['pdf'],
    prioritySupport: false,
    earlyAccess: false,
    adFree: true,
    apiAccess: false,
  },
  [SubscriptionPlan.PREMIUM]: {
    maxStories: Infinity,
    maxChaptersPerStory: Infinity,
    maxCollaboratorsPerStory: Infinity,
    maxPullRequestsPerMonth: Infinity,
    aiWritingAssistance: 'advanced',
    analytics: 'advanced',
    customThemes: Infinity,
    exportFormats: ['pdf', 'epub', 'docx', 'txt'],
    prioritySupport: true,
    earlyAccess: true,
    adFree: true,
    apiAccess: true,
  },
};

export const isUnlimited = (value: number): boolean => value === Infinity;
```

### Feature Guard Middleware

```typescript
// src/middlewares/subscription.middleware.ts

import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { SubscriptionRepository } from '../features/subscription/repository/subscription.repository';
import { PLAN_LIMITS, PlanLimits } from '../constants/plans';
import { SubscriptionPlan, SubscriptionStatus } from '../models/subscription.model';
import { ApiError } from '../utils/apiError';
import { HTTP_STATUS } from '../constants/httpStatus';

const subscriptionRepo = new SubscriptionRepository();

interface AuthenticatedRequest extends FastifyRequest {
  user: { id: string };
  subscription?: {
    plan: SubscriptionPlan;
    limits: PlanLimits;
    usage: {
      storiesCreated: number;
      chaptersCreated: number;
      pullRequestsThisMonth: number;
      collaboratorsAdded: number;
    };
  };
}

/**
 * Load subscription data into request
 */
export async function loadSubscription(
  request: AuthenticatedRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
) {
  try {
    const subscription = await subscriptionRepo.findByUserId(request.user.id);

    const plan = subscription?.plan || SubscriptionPlan.FREE;
    const isActive =
      !subscription ||
      subscription.status === SubscriptionStatus.ACTIVE ||
      subscription.status === SubscriptionStatus.AUTHENTICATED;

    request.subscription = {
      plan: isActive ? plan : SubscriptionPlan.FREE,
      limits: PLAN_LIMITS[isActive ? plan : SubscriptionPlan.FREE],
      usage: subscription?.usage || {
        storiesCreated: 0,
        chaptersCreated: 0,
        pullRequestsThisMonth: 0,
        collaboratorsAdded: 0,
      },
    };

    done();
  } catch (error) {
    done(error as Error);
  }
}

/**
 * Require specific plan or higher
 */
export function requirePlan(minimumPlan: SubscriptionPlan) {
  const planHierarchy = {
    [SubscriptionPlan.FREE]: 0,
    [SubscriptionPlan.PRO]: 1,
    [SubscriptionPlan.PREMIUM]: 2,
  };

  return async function (
    request: AuthenticatedRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction
  ) {
    if (!request.subscription) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Subscription information not loaded');
    }

    const userPlanLevel = planHierarchy[request.subscription.plan];
    const requiredPlanLevel = planHierarchy[minimumPlan];

    if (userPlanLevel < requiredPlanLevel) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        `This feature requires ${minimumPlan} plan or higher. Please upgrade to access this feature.`,
        {
          code: 'PLAN_REQUIRED',
          requiredPlan: minimumPlan,
          currentPlan: request.subscription.plan,
        }
      );
    }

    done();
  };
}

/**
 * Check story creation limit
 */
export async function checkStoryLimit(
  request: AuthenticatedRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
) {
  if (!request.subscription) {
    done(new Error('Subscription not loaded'));
    return;
  }

  const { limits, usage } = request.subscription;

  if (limits.maxStories !== Infinity && usage.storiesCreated >= limits.maxStories) {
    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      `You have reached your story limit (${limits.maxStories}). Upgrade your plan to create more stories.`,
      {
        code: 'STORY_LIMIT_REACHED',
        limit: limits.maxStories,
        current: usage.storiesCreated,
      }
    );
  }

  done();
}

/**
 * Check feature availability
 */
export function requireFeature(feature: keyof PlanLimits) {
  return async function (
    request: AuthenticatedRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction
  ) {
    if (!request.subscription) {
      done(new Error('Subscription not loaded'));
      return;
    }

    const value = request.subscription.limits[feature];

    // Check boolean features
    if (typeof value === 'boolean' && !value) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        `${String(feature)} is not available on your plan. Please upgrade.`,
        {
          code: 'FEATURE_NOT_AVAILABLE',
          feature,
          currentPlan: request.subscription.plan,
        }
      );
    }

    // Check 'none' string value
    if (value === 'none') {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        `${String(feature)} is not available on your plan. Please upgrade.`,
        {
          code: 'FEATURE_NOT_AVAILABLE',
          feature,
          currentPlan: request.subscription.plan,
        }
      );
    }

    // Check empty arrays
    if (Array.isArray(value) && value.length === 0) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        `${String(feature)} is not available on your plan. Please upgrade.`,
        {
          code: 'FEATURE_NOT_AVAILABLE',
          feature,
          currentPlan: request.subscription.plan,
        }
      );
    }

    done();
  };
}
```

---

## Implementation Steps

### Phase 1: Foundation

1. **Install Dependencies**

   ```bash
   npm install razorpay
   npm install -D @types/razorpay
   ```

2. **Environment Configuration**
   - Create Razorpay account at https://razorpay.com
   - Get API keys from Dashboard > Settings > API Keys
   - Create subscription plans in Dashboard > Subscriptions > Plans
   - Add environment variables

3. **Create Database Models**
   - `subscription.model.ts`
   - `payment-history.model.ts`

4. **Implement Razorpay Service**
   - Customer management
   - Subscription CRUD
   - Payment verification
   - Webhook verification

### Phase 2: Core Features

5. **Create Subscription Feature Module**
   - Repository layer
   - Service layer
   - Controller layer
   - Route definitions
   - Validators

6. **Implement Webhook Handler**
   - Set up webhook endpoint in Razorpay Dashboard
   - Event processing
   - Status synchronization
   - Payment recording
   - Notification triggers

7. **Create Feature Gating Middleware**
   - Plan limits configuration
   - Guard middlewares
   - Usage tracking

### Phase 3: Integration

8. **Integrate with Existing Features**
   - Add subscription checks to story creation
   - Add checks to chapter creation
   - Add checks to collaborator management
   - Add checks to PR creation

9. **Update User Registration Flow**
   - Create Razorpay customer on signup
   - Initialize free subscription record

10. **Add Usage Tracking**
    - Increment counters on resource creation
    - Monthly reset job for PR limits

### Phase 4: Testing & Production

11. **Testing in Test Mode**
    - Use test API keys
    - Test all payment flows
    - Verify webhooks using Razorpay webhook testing

12. **Go Live**
    - Switch to live API keys
    - Update webhook URLs
    - Monitor transactions

---

## Security Considerations

### Signature Verification

```typescript
// Always verify webhook signatures
const isValid = razorpayService.verifyWebhookSignature(
  rawBody,
  signature,
  env.RAZORPAY_WEBHOOK_SECRET
);

if (!isValid) {
  throw new Error('Invalid webhook signature');
}
```

### API Key Security

- Store keys in environment variables only
- Never expose secret key to frontend
- Use key_id (public) on frontend, key_secret (private) on backend
- Rotate keys periodically

### PCI Compliance

- Never handle raw card data
- Use Razorpay Checkout (hosted) for payment collection
- All payment data is handled by Razorpay

### Data Protection

```typescript
// Store only references, never sensitive data
const subscription = {
  razorpayCustomerId: 'cust_xxxxx', // OK
  razorpaySubscriptionId: 'sub_xxxxx', // OK
  cardNumber: '4242...', // NEVER
};
```

---

## Testing Strategy

### Test Mode Setup

```typescript
// Use test API keys
RAZORPAY_KEY_ID = rzp_test_xxxxx;
RAZORPAY_KEY_SECRET = xxxxx;

// Test cards
const TEST_CARDS = {
  SUCCESS: '4111111111111111',
  FAILURE: '4242424242424242',
};
```

### Webhook Testing

1. Go to Razorpay Dashboard > Webhooks
2. Add webhook URL: `https://your-domain.com/webhooks/razorpay`
3. Select events to listen for
4. Use "Test Webhook" feature to send test events

### Unit Test Example

```typescript
describe('RazorpayService', () => {
  describe('verifySubscriptionSignature', () => {
    it('should verify valid signature', () => {
      const isValid = razorpayService.verifySubscriptionSignature({
        subscriptionId: 'sub_test123',
        paymentId: 'pay_test123',
        signature: 'valid_signature_here',
      });

      expect(isValid).toBe(true);
    });
  });
});
```

---

## Error Handling

### Common Razorpay Errors

```typescript
// src/utils/razorpay-errors.ts

export const RAZORPAY_ERROR_CODES = {
  BAD_REQUEST_ERROR: 'Invalid request parameters',
  GATEWAY_ERROR: 'Payment gateway error. Please try again.',
  SERVER_ERROR: 'Razorpay server error. Please try again later.',
  INVALID_SIGNATURE: 'Payment verification failed',
};

export function handleRazorpayError(error: any): string {
  if (error.error?.code) {
    return RAZORPAY_ERROR_CODES[error.error.code] || error.error.description;
  }
  return 'An unexpected error occurred with the payment. Please try again.';
}
```

---

## Frequently Asked Questions (FAQ)

### Can I cancel my subscription anytime?

**Yes, you can cancel your subscription at any time.** Here's how it works:

| Cancellation Type | What Happens |
|-------------------|--------------|
| **Cancel at end of billing cycle** (Default) | Your subscription remains active until the current billing period ends. You continue to have access to all premium features until that date. No further charges will be made. |
| **Immediate cancellation** | Your subscription is cancelled immediately. You lose access to premium features right away. No partial refunds are issued for the remaining days in your billing cycle. |

**How to cancel:**
1. Go to **Settings > Subscription**
2. Click **Cancel Subscription**
3. Choose between "Cancel at end of period" or "Cancel immediately"
4. Confirm your cancellation

**What happens after cancellation:**
- Your account is automatically downgraded to the **Free plan**
- All your stories, chapters, and content remain intact
- Collaborators beyond the Free plan limit will become read-only
- You can re-subscribe anytime to regain premium features

---

### What happens to my stories if I downgrade?

**Your content is never deleted.** However, feature limits will apply:

| Content Type | What Happens on Downgrade |
|--------------|---------------------------|
| **Stories** | All stories remain accessible. If you have more than 3 stories (Free limit), you cannot create new ones until you're below the limit or upgrade. Existing stories are NOT archived or deleted. |
| **Chapters** | All chapters remain intact. If a story exceeds 10 chapters (Free limit), you cannot add new chapters to that story until you upgrade. |
| **Collaborators** | Existing collaborators keep their access, but in **read-only mode** if you exceed the 2-collaborator limit. They cannot edit or contribute until you upgrade or remove collaborators. |
| **Pull Requests** | Pending PRs remain open. New PR creation is limited to 5/month on Free plan. |
| **AI Features** | AI writing assistance is disabled immediately. |
| **Analytics** | Reverts to basic stats only. Historical detailed analytics are preserved but inaccessible until upgrade. |
| **Exports** | Export functionality is disabled. |
| **Custom Themes** | Stories revert to default theme. Custom theme settings are saved and restored on upgrade. |

**Grace Period:**
- After downgrade, you have a **7-day grace period** to manage your content
- During this period, you can archive or delete excess stories to fit within Free limits
- No content is automatically deleted

**Re-upgrading:**
- All your premium features and settings are restored immediately upon re-subscribing
- No data is lost during the downgrade period

---

### Do you offer refunds?

**Refund Policy:**

| Situation | Refund Eligibility |
|-----------|-------------------|
| **Within 7 days of first payment** | Full refund available, no questions asked |
| **Technical issues preventing service use** | Pro-rated refund for affected period |
| **Accidental duplicate payment** | Full refund of duplicate charge |
| **After 7 days, change of mind** | No refund, but you can cancel future billing |
| **Mid-cycle cancellation** | No partial refund for remaining days |
| **Annual plan cancellation** | Pro-rated refund for unused months (minus 2-month discount received) |

**How to request a refund:**
1. Email **support@storychain.com** with your:
   - Account email
   - Razorpay Payment ID (starts with `pay_`)
   - Reason for refund request
2. Refund requests are processed within **5-7 business days**
3. Refunds are credited to the original payment method

**Refund Processing Time:**
| Payment Method | Refund Time |
|----------------|-------------|
| Credit/Debit Card | 5-7 business days |
| UPI | 2-3 business days |
| Net Banking | 5-7 business days |
| Wallet | 1-2 business days |

**Non-refundable:**
- Partial month charges after the 7-day period
- Service used during the billing period
- Fees charged by payment gateways

---

### What payment methods do you accept?

**For Indian Users (INR):**

| Payment Method | Supported | Notes |
|----------------|-----------|-------|
| **Credit Cards** | Visa, Mastercard, Amex, Diners, RuPay | All major cards accepted |
| **Debit Cards** | Visa, Mastercard, RuPay | Including international debit cards |
| **UPI** | All UPI apps | GPay, PhonePe, Paytm, BHIM, etc. |
| **Net Banking** | 50+ banks | HDFC, ICICI, SBI, Axis, and more |
| **Wallets** | Paytm, PhonePe, Amazon Pay, Mobikwik | Instant payment |
| **EMI** | Credit Card EMI | 3, 6, 9, 12-month options (Pro/Premium annual plans) |
| **Pay Later** | Simpl, LazyPay | Buy now, pay later options |

**For International Users (USD):**

| Payment Method | Supported | Notes |
|----------------|-----------|-------|
| **Credit Cards** | Visa, Mastercard, Amex | International cards |
| **Debit Cards** | Visa, Mastercard | Must be enabled for international transactions |
| **PayPal** | Coming Soon | Planned for future release |

**Recurring Payments:**
- Subscriptions use **auto-debit** for recurring charges
- Supported for: Cards (domestic & international), UPI Autopay, eNACH, eMandate
- You'll receive email reminders 3 days before each charge

**Payment Security:**
- All payments are processed through **Razorpay** (PCI-DSS Level 1 compliant)
- Card details are never stored on our servers
- 3D Secure (OTP) verification for added security

---

### Can I pay in USD if I'm outside India?

**Yes!** We offer USD pricing for international users.

**How currency is determined:**
1. **Automatic detection**: Based on your IP address location
2. **Manual selection**: You can choose your preferred currency at checkout

**USD Pricing:**

| Plan | Monthly | Yearly (2 months free) |
|------|---------|------------------------|
| Pro | $9.99/month | $99.90/year |
| Premium | $19.99/month | $199.90/year |

**Important Notes for International Payments:**

| Aspect | Details |
|--------|---------|
| **Currency conversion** | No conversion fees from our side. Your bank may charge forex fees. |
| **Card requirements** | Card must be enabled for international transactions |
| **Billing address** | International address accepted |
| **Invoices** | Generated in USD with international format |
| **Taxes** | No GST for international transactions. Local taxes may apply based on your country. |

**Switching Currency:**
- You can change currency only when creating a new subscription
- Existing subscriptions cannot switch currency mid-cycle
- Cancel current subscription and re-subscribe with preferred currency

**Supported Countries:**
We accept payments from **100+ countries**. Some countries may have restrictions based on international banking regulations.

---

### Can I pause my subscription?

**Yes, you can pause your subscription** for up to **3 billing cycles** (3 months for monthly, 3 years for yearly plans).

**How Pausing Works:**

| Aspect | Details |
|--------|---------|
| **When pause takes effect** | End of current billing cycle (you keep access until then) |
| **Maximum pause duration** | 3 billing cycles |
| **Access during pause** | Downgraded to Free plan limits |
| **Content** | All content preserved, no deletion |
| **Resumption** | Manual or automatic after pause period |
| **Billing** | No charges during pause period |

**How to pause:**
1. Go to **Settings > Subscription**
2. Click **Pause Subscription**
3. Select pause duration (1-3 cycles)
4. Confirm pause

**During pause period:**
- Account functions like Free plan
- Collaborator access becomes read-only (if over limit)
- AI features disabled
- Analytics limited to basic
- All content remains intact

**Resuming your subscription:**
- Click **Resume Subscription** in Settings
- Or subscription auto-resumes after pause period ends
- Full premium access restored immediately
- Billing resumes from resume date

**Pause vs Cancel:**

| Feature | Pause | Cancel |
|---------|-------|--------|
| Content preserved | Yes | Yes |
| Subscription saved | Yes | No (must re-subscribe) |
| Auto-resume option | Yes | No |
| Same pricing guaranteed | Yes | No (price may change) |
| Maximum duration | 3 cycles | Permanent |

**Limitations:**
- Cannot pause during first billing cycle
- Cannot pause if payment is overdue
- Annual plans: Pause extends end date (no refund for pause period)

---

### Additional FAQ

#### How do I upgrade my plan?

1. Go to **Settings > Subscription**
2. Click **Change Plan**
3. Select your new plan (Pro or Premium)
4. Choose billing cycle (Monthly/Yearly)
5. Complete payment

**Upgrade takes effect immediately.** You're charged the pro-rated difference for the remaining billing period.

#### How do I update my payment method?

1. Go to **Settings > Subscription > Payment Method**
2. Click **Update Payment Method**
3. Enter new card/UPI details
4. New method is used for future payments

#### What happens if my payment fails?

| Day | Action |
|-----|--------|
| Day 0 | Payment fails, you're notified via email |
| Day 1-3 | Razorpay retries payment automatically |
| Day 3 | Warning notification, subscription marked as "pending" |
| Day 7 | Final retry attempt |
| Day 7+ | Subscription marked as "halted", access limited |
| Day 14 | Subscription cancelled, downgraded to Free |

**To resolve:** Update your payment method or ensure sufficient balance.

#### Can I get an invoice for my payment?

Yes! Invoices are automatically generated for every payment.

- **Access invoices**: Settings > Subscription > Invoices
- **Download format**: PDF
- **Details included**: Company name (if provided), GST number (for Indian businesses), payment breakdown

#### Is there a free trial?

Currently, we don't offer a free trial. However:
- **Free plan** gives you access to core features
- **7-day refund policy** acts as a risk-free trial period
- Upgrade when you need premium features

---

## Additional Resources

- [Razorpay API Documentation](https://razorpay.com/docs/api/)
- [Razorpay Subscriptions Guide](https://razorpay.com/docs/payments/subscriptions/)
- [Razorpay Webhooks](https://razorpay.com/docs/webhooks/)
- [Razorpay Test Mode](https://razorpay.com/docs/payments/payments/test-mode/)
- [Razorpay Node.js SDK](https://github.com/razorpay/razorpay-node)
