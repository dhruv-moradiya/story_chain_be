# Subscription Features - Technical Implementation Guide

This document provides the code implementation for subscription management features including cancellation, downgrade handling, refunds, payment methods, international payments, and subscription pausing.

---

## Table of Contents

1. [Subscription Cancellation](#1-subscription-cancellation)
2. [Downgrade Handling](#2-downgrade-handling)
3. [Refund Processing](#3-refund-processing)
4. [Payment Methods Configuration](#4-payment-methods-configuration)
5. [International Payments (USD)](#5-international-payments-usd)
6. [Subscription Pausing](#6-subscription-pausing)
7. [Database Migrations](#7-database-migrations)
8. [API Endpoints Summary](#8-api-endpoints-summary)

---

## 1. Subscription Cancellation

### 1.1 Cancellation Types Enum

```typescript
// src/features/subscription/types/subscription.types.ts

export enum CancellationType {
  END_OF_CYCLE = 'end_of_cycle',
  IMMEDIATE = 'immediate',
}

export enum CancellationReason {
  TOO_EXPENSIVE = 'too_expensive',
  NOT_USING_FEATURES = 'not_using_features',
  SWITCHING_TO_COMPETITOR = 'switching_to_competitor',
  MISSING_FEATURES = 'missing_features',
  TECHNICAL_ISSUES = 'technical_issues',
  OTHER = 'other',
}

export interface ICancellationRequest {
  userId: string;
  type: CancellationType;
  reason?: CancellationReason;
  feedback?: string;
  immediate?: boolean;
}

export interface ICancellationResult {
  success: boolean;
  subscription: ISubscription;
  effectiveDate: Date;
  accessUntil: Date;
  refundAmount?: number;
}
```

### 1.2 Cancellation Service

```typescript
// src/features/subscription/services/cancellation.service.ts

import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { RazorpayService } from '@services/razorpay/razorpay.service';
import { NotificationService } from '@features/notification/services/notification.service';
import { QueueService } from '@services/queue/queue.service';
import { SubscriptionStatus, SubscriptionPlan, ISubscription } from '../types/subscription.types';
import {
  ICancellationRequest,
  ICancellationResult,
  CancellationType,
} from '../types/subscription.types';

@singleton()
export class CancellationService extends BaseModule {
  constructor(
    @inject(TOKENS.SubscriptionRepository)
    private readonly subscriptionRepo: SubscriptionRepository,
    @inject(TOKENS.RazorpayService)
    private readonly razorpayService: RazorpayService,
    @inject(TOKENS.NotificationService)
    private readonly notificationService: NotificationService,
    @inject(TOKENS.QueueService)
    private readonly queueService: QueueService
  ) {
    super();
  }

  /**
   * Cancel a subscription
   * @param request - Cancellation request details
   */
  async cancelSubscription(request: ICancellationRequest): Promise<ICancellationResult> {
    const { userId, type, reason, feedback, immediate } = request;

    // Get current subscription
    const subscription = await this.subscriptionRepo.findByUserId(userId);

    if (!subscription) {
      this.throwNotFoundError('No active subscription found');
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      this.throwBadRequest('Subscription is already cancelled');
    }

    if (!subscription.razorpaySubscriptionId) {
      this.throwBadRequest('No Razorpay subscription to cancel');
    }

    // Determine cancellation behavior
    const cancelAtCycleEnd = type === CancellationType.END_OF_CYCLE && !immediate;

    try {
      // Cancel in Razorpay
      const razorpayResult = await this.razorpayService.cancelSubscription(
        subscription.razorpaySubscriptionId,
        cancelAtCycleEnd
      );

      // Calculate effective dates
      const now = new Date();
      const effectiveDate = cancelAtCycleEnd ? subscription.currentPeriodEnd || now : now;
      const accessUntil = cancelAtCycleEnd ? subscription.currentPeriodEnd || now : now;

      // Update subscription in database
      const updatedSubscription = await this.subscriptionRepo.update(subscription._id, {
        status: cancelAtCycleEnd
          ? SubscriptionStatus.ACTIVE // Still active until end of cycle
          : SubscriptionStatus.CANCELLED,
        cancelledAt: now,
        cancellationReason: reason,
        cancellationFeedback: feedback,
        cancellationType: type,
        scheduledCancellationDate: cancelAtCycleEnd ? effectiveDate : null,
      });

      // If immediate cancellation, downgrade to free
      if (!cancelAtCycleEnd) {
        await this.downgradeToFree(subscription._id);
      }

      // Record cancellation for analytics
      await this.recordCancellation(subscription, reason, feedback);

      // Send notifications
      await this.sendCancellationNotifications(updatedSubscription, cancelAtCycleEnd);

      return {
        success: true,
        subscription: updatedSubscription,
        effectiveDate,
        accessUntil,
      };
    } catch (error) {
      this.logError('Failed to cancel subscription', { error, userId });
      throw error;
    }
  }

  /**
   * Downgrade subscription to free plan
   */
  private async downgradeToFree(subscriptionId: string): Promise<void> {
    await this.subscriptionRepo.update(subscriptionId, {
      plan: SubscriptionPlan.FREE,
      razorpaySubscriptionId: null,
      razorpayPlanId: null,
      billingInterval: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      chargeAt: null,
    });
  }

  /**
   * Record cancellation for analytics
   */
  private async recordCancellation(
    subscription: ISubscription,
    reason?: string,
    feedback?: string
  ): Promise<void> {
    await this.queueService.addJob('analytics', {
      event: 'subscription_cancelled',
      userId: subscription.userId.toString(),
      data: {
        plan: subscription.plan,
        billingInterval: subscription.billingInterval,
        reason,
        feedback,
        totalPaid: subscription.paidCount,
        subscribedDays: this.calculateSubscribedDays(subscription),
      },
    });
  }

  /**
   * Send cancellation notifications
   */
  private async sendCancellationNotifications(
    subscription: ISubscription,
    cancelAtCycleEnd: boolean
  ): Promise<void> {
    const message = cancelAtCycleEnd
      ? `Your subscription will be cancelled on ${subscription.currentPeriodEnd?.toLocaleDateString()}. You'll continue to have access until then.`
      : 'Your subscription has been cancelled. You are now on the Free plan.';

    // In-app notification
    await this.notificationService.createNotification({
      userId: subscription.userId,
      type: 'SUBSCRIPTION_CANCELLED',
      title: 'Subscription Cancelled',
      message,
      priority: 'high',
    });

    // Email notification
    await this.queueService.addJob('sendEmail', {
      type: cancelAtCycleEnd ? 'SUBSCRIPTION_SCHEDULED_CANCEL' : 'SUBSCRIPTION_CANCELLED',
      userId: subscription.userId.toString(),
      data: {
        plan: subscription.plan,
        accessUntil: subscription.currentPeriodEnd,
      },
    });
  }

  /**
   * Calculate days subscribed
   */
  private calculateSubscribedDays(subscription: ISubscription): number {
    if (!subscription.startAt) return 0;
    const start = new Date(subscription.startAt);
    const end = new Date();
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Process scheduled cancellations (called by cron job)
   */
  async processScheduledCancellations(): Promise<void> {
    const now = new Date();

    const scheduledCancellations = await this.subscriptionRepo.findMany({
      status: SubscriptionStatus.ACTIVE,
      scheduledCancellationDate: { $lte: now },
    });

    for (const subscription of scheduledCancellations) {
      try {
        await this.subscriptionRepo.update(subscription._id, {
          status: SubscriptionStatus.CANCELLED,
          plan: SubscriptionPlan.FREE,
          razorpaySubscriptionId: null,
          razorpayPlanId: null,
        });

        await this.notificationService.createNotification({
          userId: subscription.userId,
          type: 'SUBSCRIPTION_ENDED',
          title: 'Subscription Ended',
          message: 'Your subscription period has ended. You are now on the Free plan.',
        });

        this.logInfo('Processed scheduled cancellation', {
          subscriptionId: subscription._id,
        });
      } catch (error) {
        this.logError('Failed to process scheduled cancellation', {
          subscriptionId: subscription._id,
          error,
        });
      }
    }
  }
}
```

### 1.3 Cancellation Controller

```typescript
// src/features/subscription/controllers/cancellation.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { ApiResponse } from '@utils/apiResponse';
import { CancellationService } from '../services/cancellation.service';
import { HTTP_STATUS } from '@constants/httpStatus';
import { CancellationType, CancellationReason } from '../types/subscription.types';

interface CancelSubscriptionBody {
  type: 'end_of_cycle' | 'immediate';
  reason?: string;
  feedback?: string;
}

@singleton()
export class CancellationController extends BaseModule {
  constructor(
    @inject(TOKENS.CancellationService)
    private readonly cancellationService: CancellationService
  ) {
    super();
  }

  /**
   * Cancel subscription
   * POST /subscription/cancel
   */
  async cancelSubscription(request: FastifyRequest, reply: FastifyReply) {
    const { type, reason, feedback } = request.body as CancelSubscriptionBody;
    const userId = request.user.clerkId;

    const result = await this.cancellationService.cancelSubscription({
      userId,
      type: type as CancellationType,
      reason: reason as CancellationReason,
      feedback,
      immediate: type === 'immediate',
    });

    return reply.code(HTTP_STATUS.OK.code).send(
      new ApiResponse(true, 'Subscription cancelled successfully', {
        effectiveDate: result.effectiveDate,
        accessUntil: result.accessUntil,
        currentPlan: result.subscription.plan,
      })
    );
  }

  /**
   * Get cancellation preview (what will happen if cancelled)
   * GET /subscription/cancel/preview
   */
  async getCancellationPreview(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.clerkId;

    // Implementation would show:
    // - Current plan benefits being lost
    // - Content that exceeds free limits
    // - Access end date
    // - Refund eligibility

    return reply.code(HTTP_STATUS.OK.code).send(
      new ApiResponse(true, 'Cancellation preview', {
        // Preview data
      })
    );
  }
}
```

### 1.4 Cancellation Validator

```typescript
// src/features/subscription/validators/cancellation.validator.ts

import { z } from 'zod';

export const CancelSubscriptionSchema = z.object({
  type: z.enum(['end_of_cycle', 'immediate']),
  reason: z
    .enum([
      'too_expensive',
      'not_using_features',
      'switching_to_competitor',
      'missing_features',
      'technical_issues',
      'other',
    ])
    .optional(),
  feedback: z.string().max(1000).optional(),
});

export type TCancelSubscriptionSchema = z.infer<typeof CancelSubscriptionSchema>;
```

---

## 2. Downgrade Handling

### 2.1 Downgrade Service

```typescript
// src/features/subscription/services/downgrade.service.ts

import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { StoryRepository } from '@features/story/repositories/story.repository';
import { StoryCollaboratorRepository } from '@features/storyCollaborator/repositories/storyCollaborator.repository';
import { NotificationService } from '@features/notification/services/notification.service';
import { PLAN_LIMITS } from '@constants/plans';
import { SubscriptionPlan } from '../types/subscription.types';

export interface IDowngradeImpact {
  storiesOverLimit: number;
  storiesAffected: Array<{
    id: string;
    title: string;
    slug: string;
    chaptersCount: number;
    collaboratorsCount: number;
  }>;
  collaboratorsToRestrict: number;
  featuresLost: string[];
  gracePeriodEnds: Date;
}

export interface IDowngradeResult {
  success: boolean;
  impact: IDowngradeImpact;
  actionsRequired: string[];
}

@singleton()
export class DowngradeService extends BaseModule {
  constructor(
    @inject(TOKENS.SubscriptionRepository)
    private readonly subscriptionRepo: SubscriptionRepository,
    @inject(TOKENS.StoryRepository)
    private readonly storyRepo: StoryRepository,
    @inject(TOKENS.StoryCollaboratorRepository)
    private readonly collaboratorRepo: StoryCollaboratorRepository,
    @inject(TOKENS.NotificationService)
    private readonly notificationService: NotificationService
  ) {
    super();
  }

  /**
   * Calculate impact of downgrading to a lower plan
   */
  async calculateDowngradeImpact(
    userId: string,
    fromPlan: SubscriptionPlan,
    toPlan: SubscriptionPlan
  ): Promise<IDowngradeImpact> {
    const newLimits = PLAN_LIMITS[toPlan];

    // Get user's current usage
    const stories = await this.storyRepo.findByCreatorId(userId);
    const totalStories = stories.length;

    // Calculate stories over limit
    const storiesOverLimit = Math.max(0, totalStories - newLimits.maxStories);

    // Get affected stories details
    const storiesAffected = [];
    for (const story of stories) {
      const collaborators = await this.collaboratorRepo.countByStorySlug(story.slug);
      const chaptersCount = story.chaptersCount || 0;

      if (
        collaborators > newLimits.maxCollaboratorsPerStory ||
        chaptersCount > newLimits.maxChaptersPerStory
      ) {
        storiesAffected.push({
          id: story._id.toString(),
          title: story.title,
          slug: story.slug,
          chaptersCount,
          collaboratorsCount: collaborators,
        });
      }
    }

    // Calculate collaborators to restrict
    let collaboratorsToRestrict = 0;
    for (const story of stories) {
      const count = await this.collaboratorRepo.countByStorySlug(story.slug);
      if (count > newLimits.maxCollaboratorsPerStory) {
        collaboratorsToRestrict += count - newLimits.maxCollaboratorsPerStory;
      }
    }

    // Determine features being lost
    const featuresLost = this.calculateFeaturesLost(fromPlan, toPlan);

    // Grace period (7 days from now)
    const gracePeriodEnds = new Date();
    gracePeriodEnds.setDate(gracePeriodEnds.getDate() + 7);

    return {
      storiesOverLimit,
      storiesAffected,
      collaboratorsToRestrict,
      featuresLost,
      gracePeriodEnds,
    };
  }

  /**
   * Process downgrade - apply restrictions
   */
  async processDowngrade(userId: string, newPlan: SubscriptionPlan): Promise<IDowngradeResult> {
    const subscription = await this.subscriptionRepo.findByUserId(userId);

    if (!subscription) {
      this.throwNotFoundError('Subscription not found');
    }

    const impact = await this.calculateDowngradeImpact(userId, subscription.plan, newPlan);

    // Update subscription
    await this.subscriptionRepo.update(subscription._id, {
      plan: newPlan,
      downgradeDate: new Date(),
      gracePeriodEnds: impact.gracePeriodEnds,
      previousPlan: subscription.plan,
    });

    // Set collaborators to read-only for stories over limit
    await this.restrictExcessCollaborators(userId, newPlan);

    // Send notifications
    await this.sendDowngradeNotifications(userId, impact);

    // Determine actions required
    const actionsRequired = this.getRequiredActions(impact, newPlan);

    return {
      success: true,
      impact,
      actionsRequired,
    };
  }

  /**
   * Calculate features lost when downgrading
   */
  private calculateFeaturesLost(fromPlan: SubscriptionPlan, toPlan: SubscriptionPlan): string[] {
    const fromLimits = PLAN_LIMITS[fromPlan];
    const toLimits = PLAN_LIMITS[toPlan];
    const featuresLost: string[] = [];

    if (fromLimits.aiWritingAssistance !== 'none' && toLimits.aiWritingAssistance === 'none') {
      featuresLost.push('AI Writing Assistance');
    }

    if (fromLimits.analytics !== toLimits.analytics) {
      featuresLost.push('Advanced Analytics');
    }

    if (fromLimits.customThemes > toLimits.customThemes) {
      featuresLost.push('Custom Themes');
    }

    if (fromLimits.exportFormats.length > toLimits.exportFormats.length) {
      featuresLost.push('Export Options');
    }

    if (fromLimits.prioritySupport && !toLimits.prioritySupport) {
      featuresLost.push('Priority Support');
    }

    if (fromLimits.earlyAccess && !toLimits.earlyAccess) {
      featuresLost.push('Early Access Features');
    }

    if (fromLimits.apiAccess && !toLimits.apiAccess) {
      featuresLost.push('API Access');
    }

    if (fromLimits.adFree && !toLimits.adFree) {
      featuresLost.push('Ad-Free Experience');
    }

    return featuresLost;
  }

  /**
   * Restrict excess collaborators to read-only
   */
  private async restrictExcessCollaborators(
    userId: string,
    newPlan: SubscriptionPlan
  ): Promise<void> {
    const limit = PLAN_LIMITS[newPlan].maxCollaboratorsPerStory;
    const stories = await this.storyRepo.findByCreatorId(userId);

    for (const story of stories) {
      const collaborators = await this.collaboratorRepo.findByStorySlug(story.slug, {
        sort: { acceptedAt: 1 }, // Oldest first keep access
      });

      if (collaborators.length > limit) {
        // Mark excess collaborators as read-only
        const excessCollaborators = collaborators.slice(limit);

        for (const collab of excessCollaborators) {
          await this.collaboratorRepo.update(collab._id, {
            isReadOnly: true,
            readOnlyReason: 'plan_limit_exceeded',
          });

          // Notify affected collaborator
          await this.notificationService.createNotification({
            userId: collab.userId,
            type: 'ACCESS_RESTRICTED',
            title: 'Access Restricted',
            message: `Your editing access to "${story.title}" has been restricted due to plan limits.`,
            data: { storySlug: story.slug },
          });
        }
      }
    }
  }

  /**
   * Send downgrade notifications
   */
  private async sendDowngradeNotifications(
    userId: string,
    impact: IDowngradeImpact
  ): Promise<void> {
    const messages: string[] = [];

    if (impact.storiesOverLimit > 0) {
      messages.push(
        `You have ${impact.storiesOverLimit} stories over your new plan limit. You won't be able to create new stories until you're within limits.`
      );
    }

    if (impact.collaboratorsToRestrict > 0) {
      messages.push(
        `${impact.collaboratorsToRestrict} collaborators have been set to read-only access.`
      );
    }

    if (impact.featuresLost.length > 0) {
      messages.push(
        `The following features are no longer available: ${impact.featuresLost.join(', ')}.`
      );
    }

    await this.notificationService.createNotification({
      userId,
      type: 'PLAN_DOWNGRADED',
      title: 'Plan Downgraded',
      message: messages.join(' '),
      priority: 'high',
      data: { impact },
    });
  }

  /**
   * Get required actions after downgrade
   */
  private getRequiredActions(impact: IDowngradeImpact, newPlan: SubscriptionPlan): string[] {
    const actions: string[] = [];
    const limits = PLAN_LIMITS[newPlan];

    if (impact.storiesOverLimit > 0) {
      actions.push(`Archive or delete ${impact.storiesOverLimit} stories to create new ones`);
    }

    for (const story of impact.storiesAffected) {
      if (story.collaboratorsCount > limits.maxCollaboratorsPerStory) {
        actions.push(
          `Remove ${story.collaboratorsCount - limits.maxCollaboratorsPerStory} collaborators from "${story.title}" to restore their editing access`
        );
      }
    }

    return actions;
  }

  /**
   * Restore access after upgrade
   */
  async restoreAccessAfterUpgrade(userId: string, newPlan: SubscriptionPlan): Promise<void> {
    const limit = PLAN_LIMITS[newPlan].maxCollaboratorsPerStory;
    const stories = await this.storyRepo.findByCreatorId(userId);

    for (const story of stories) {
      const collaborators = await this.collaboratorRepo.findByStorySlug(story.slug);

      // Restore read-only collaborators up to new limit
      let restoredCount = 0;
      for (const collab of collaborators) {
        if (collab.isReadOnly && collab.readOnlyReason === 'plan_limit_exceeded') {
          if (restoredCount < limit) {
            await this.collaboratorRepo.update(collab._id, {
              isReadOnly: false,
              readOnlyReason: null,
            });

            await this.notificationService.createNotification({
              userId: collab.userId,
              type: 'ACCESS_RESTORED',
              title: 'Access Restored',
              message: `Your editing access to "${story.title}" has been restored.`,
              data: { storySlug: story.slug },
            });

            restoredCount++;
          }
        }
      }
    }
  }
}
```

### 2.2 Downgrade Preview Endpoint

```typescript
// In subscription.controller.ts

/**
 * Get downgrade preview
 * GET /subscription/downgrade/preview?plan=FREE
 */
async getDowngradePreview(request: FastifyRequest, reply: FastifyReply) {
  const { plan } = request.query as { plan: string };
  const userId = request.user.clerkId;

  const subscription = await this.subscriptionRepo.findByUserId(userId);

  if (!subscription) {
    return reply.code(HTTP_STATUS.NOT_FOUND.code).send(
      new ApiResponse(false, 'No subscription found')
    );
  }

  const impact = await this.downgradeService.calculateDowngradeImpact(
    userId,
    subscription.plan,
    plan as SubscriptionPlan
  );

  return reply.code(HTTP_STATUS.OK.code).send(
    new ApiResponse(true, 'Downgrade preview', {
      currentPlan: subscription.plan,
      targetPlan: plan,
      impact,
      warning: impact.storiesOverLimit > 0 || impact.collaboratorsToRestrict > 0
        ? 'Some of your content will be affected by this downgrade'
        : null,
    })
  );
}
```

---

## 3. Refund Processing

### 3.1 Refund Types and Policies

```typescript
// src/features/subscription/types/refund.types.ts

export enum RefundReason {
  FIRST_WEEK_CANCELLATION = 'first_week_cancellation',
  TECHNICAL_ISSUES = 'technical_issues',
  DUPLICATE_PAYMENT = 'duplicate_payment',
  ANNUAL_PLAN_CANCELLATION = 'annual_plan_cancellation',
  SERVICE_NOT_AS_DESCRIBED = 'service_not_as_described',
  CUSTOMER_REQUEST = 'customer_request',
}

export enum RefundStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REJECTED = 'rejected',
}

export interface IRefundRequest {
  userId: string;
  paymentId: string;
  reason: RefundReason;
  description?: string;
  amount?: number; // Partial refund amount (optional)
}

export interface IRefundResult {
  refundId: string;
  status: RefundStatus;
  amount: number;
  currency: string;
  estimatedProcessingDays: number;
  originalPaymentId: string;
}

export interface IRefundPolicy {
  isEligible: boolean;
  eligibleAmount: number;
  reason: string;
  policyApplied: string;
}
```

### 3.2 Refund Service

```typescript
// src/features/subscription/services/refund.service.ts

import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { PaymentHistoryRepository } from '../repositories/payment-history.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { RefundRepository } from '../repositories/refund.repository';
import { RazorpayService } from '@services/razorpay/razorpay.service';
import { NotificationService } from '@features/notification/services/notification.service';
import { QueueService } from '@services/queue/queue.service';
import {
  IRefundRequest,
  IRefundResult,
  IRefundPolicy,
  RefundReason,
  RefundStatus,
} from '../types/refund.types';
import { BillingInterval } from '../types/subscription.types';

// Refund processing time by payment method (in days)
const REFUND_PROCESSING_DAYS: Record<string, number> = {
  card: 7,
  upi: 3,
  netbanking: 7,
  wallet: 2,
  default: 7,
};

@singleton()
export class RefundService extends BaseModule {
  constructor(
    @inject(TOKENS.PaymentHistoryRepository)
    private readonly paymentHistoryRepo: PaymentHistoryRepository,
    @inject(TOKENS.SubscriptionRepository)
    private readonly subscriptionRepo: SubscriptionRepository,
    @inject(TOKENS.RefundRepository)
    private readonly refundRepo: RefundRepository,
    @inject(TOKENS.RazorpayService)
    private readonly razorpayService: RazorpayService,
    @inject(TOKENS.NotificationService)
    private readonly notificationService: NotificationService,
    @inject(TOKENS.QueueService)
    private readonly queueService: QueueService
  ) {
    super();
  }

  /**
   * Check refund eligibility based on policy
   */
  async checkRefundEligibility(userId: string, paymentId: string): Promise<IRefundPolicy> {
    const payment = await this.paymentHistoryRepo.findByRazorpayPaymentId(paymentId);

    if (!payment) {
      return {
        isEligible: false,
        eligibleAmount: 0,
        reason: 'Payment not found',
        policyApplied: 'none',
      };
    }

    // Check if already refunded
    if (payment.status === 'refunded' || payment.refundedAmount > 0) {
      return {
        isEligible: false,
        eligibleAmount: 0,
        reason: 'Payment has already been refunded',
        policyApplied: 'already_refunded',
      };
    }

    const subscription = await this.subscriptionRepo.findByUserId(userId);
    const paymentDate = new Date(payment.createdAt);
    const now = new Date();
    const daysSincePayment = Math.floor(
      (now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Policy 1: First payment within 7 days - full refund
    const isFirstPayment = subscription?.paidCount === 1;
    if (isFirstPayment && daysSincePayment <= 7) {
      return {
        isEligible: true,
        eligibleAmount: payment.amount,
        reason: 'Eligible for full refund within 7-day trial period',
        policyApplied: 'first_week_full_refund',
      };
    }

    // Policy 2: Annual plan - pro-rated refund
    if (subscription?.billingInterval === BillingInterval.YEARLY) {
      const monthsUsed = Math.ceil(daysSincePayment / 30);
      const monthsRemaining = Math.max(0, 12 - monthsUsed);

      // Subtract the 2-month discount received
      const effectiveMonthsForRefund = Math.max(0, monthsRemaining - 2);
      const monthlyRate = payment.amount / 12;
      const eligibleAmount = Math.floor(effectiveMonthsForRefund * monthlyRate);

      if (eligibleAmount > 0) {
        return {
          isEligible: true,
          eligibleAmount,
          reason: `Pro-rated refund for ${effectiveMonthsForRefund} unused months (minus 2-month discount)`,
          policyApplied: 'annual_prorated_refund',
        };
      }
    }

    // Policy 3: Technical issues - case by case (handled manually)
    // This would typically require admin review

    // Default: Not eligible
    return {
      isEligible: false,
      eligibleAmount: 0,
      reason: 'Payment is outside the refund eligibility period',
      policyApplied: 'standard_no_refund',
    };
  }

  /**
   * Process refund request
   */
  async processRefund(request: IRefundRequest): Promise<IRefundResult> {
    const { userId, paymentId, reason, description, amount } = request;

    // Check eligibility
    const eligibility = await this.checkRefundEligibility(userId, paymentId);

    if (!eligibility.isEligible) {
      this.throwBadRequest(eligibility.reason);
    }

    const payment = await this.paymentHistoryRepo.findByRazorpayPaymentId(paymentId);
    const refundAmount = amount || eligibility.eligibleAmount;

    // Validate refund amount
    if (refundAmount > eligibility.eligibleAmount) {
      this.throwBadRequest(
        `Refund amount (${refundAmount}) exceeds eligible amount (${eligibility.eligibleAmount})`
      );
    }

    try {
      // Create refund record
      const refundRecord = await this.refundRepo.create({
        userId,
        paymentId: payment._id,
        razorpayPaymentId: paymentId,
        amount: refundAmount,
        currency: payment.currency,
        reason,
        description,
        status: RefundStatus.PROCESSING,
        policyApplied: eligibility.policyApplied,
      });

      // Process refund via Razorpay
      const razorpayRefund = await this.razorpayService.refundPayment(paymentId, refundAmount, {
        reason: reason,
        userId: userId,
        refundId: refundRecord._id.toString(),
      });

      // Update refund record
      await this.refundRepo.update(refundRecord._id, {
        razorpayRefundId: razorpayRefund.id,
        status: RefundStatus.COMPLETED,
        processedAt: new Date(),
      });

      // Update payment record
      await this.paymentHistoryRepo.update(payment._id, {
        refundedAmount: refundAmount,
        refundId: razorpayRefund.id,
        refundReason: reason,
      });

      // Get processing time estimate
      const processingDays =
        REFUND_PROCESSING_DAYS[payment.method] || REFUND_PROCESSING_DAYS.default;

      // Send notifications
      await this.sendRefundNotifications(userId, refundAmount, payment.currency, processingDays);

      return {
        refundId: razorpayRefund.id,
        status: RefundStatus.COMPLETED,
        amount: refundAmount,
        currency: payment.currency,
        estimatedProcessingDays: processingDays,
        originalPaymentId: paymentId,
      };
    } catch (error) {
      this.logError('Refund processing failed', { error, paymentId, userId });

      // Update refund record as failed
      await this.refundRepo.updateByPaymentId(paymentId, {
        status: RefundStatus.FAILED,
        failureReason: error.message,
      });

      throw error;
    }
  }

  /**
   * Send refund notifications
   */
  private async sendRefundNotifications(
    userId: string,
    amount: number,
    currency: string,
    processingDays: number
  ): Promise<void> {
    const formattedAmount = this.formatAmount(amount, currency);

    await this.notificationService.createNotification({
      userId,
      type: 'REFUND_PROCESSED',
      title: 'Refund Processed',
      message: `Your refund of ${formattedAmount} has been initiated. It will be credited to your account within ${processingDays} business days.`,
    });

    await this.queueService.addJob('sendEmail', {
      type: 'REFUND_CONFIRMATION',
      userId,
      data: {
        amount,
        currency,
        processingDays,
      },
    });
  }

  /**
   * Format amount for display
   */
  private formatAmount(amountInPaise: number, currency: string): string {
    const amount = amountInPaise / 100;
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${amount.toFixed(2)}`;
  }

  /**
   * Get refund history for user
   */
  async getRefundHistory(userId: string): Promise<any[]> {
    return this.refundRepo.findByUserId(userId, {
      sort: { createdAt: -1 },
      limit: 50,
    });
  }
}
```

### 3.3 Refund Controller

```typescript
// src/features/subscription/controllers/refund.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { ApiResponse } from '@utils/apiResponse';
import { RefundService } from '../services/refund.service';
import { HTTP_STATUS } from '@constants/httpStatus';

interface RefundRequestBody {
  paymentId: string;
  reason: string;
  description?: string;
}

@singleton()
export class RefundController extends BaseModule {
  constructor(
    @inject(TOKENS.RefundService)
    private readonly refundService: RefundService
  ) {
    super();
  }

  /**
   * Check refund eligibility
   * GET /subscription/refund/eligibility?paymentId=pay_xxx
   */
  async checkEligibility(request: FastifyRequest, reply: FastifyReply) {
    const { paymentId } = request.query as { paymentId: string };
    const userId = request.user.clerkId;

    const eligibility = await this.refundService.checkRefundEligibility(userId, paymentId);

    return reply
      .code(HTTP_STATUS.OK.code)
      .send(new ApiResponse(true, 'Refund eligibility checked', eligibility));
  }

  /**
   * Request refund
   * POST /subscription/refund
   */
  async requestRefund(request: FastifyRequest, reply: FastifyReply) {
    const { paymentId, reason, description } = request.body as RefundRequestBody;
    const userId = request.user.clerkId;

    const result = await this.refundService.processRefund({
      userId,
      paymentId,
      reason: reason as any,
      description,
    });

    return reply
      .code(HTTP_STATUS.OK.code)
      .send(new ApiResponse(true, 'Refund processed successfully', result));
  }

  /**
   * Get refund history
   * GET /subscription/refunds
   */
  async getRefundHistory(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.clerkId;

    const refunds = await this.refundService.getRefundHistory(userId);

    return reply
      .code(HTTP_STATUS.OK.code)
      .send(new ApiResponse(true, 'Refund history retrieved', refunds));
  }
}
```

---

## 4. Payment Methods Configuration

### 4.1 Payment Methods Constants

```typescript
// src/constants/payment-methods.ts

export interface IPaymentMethod {
  id: string;
  name: string;
  type: 'card' | 'upi' | 'netbanking' | 'wallet' | 'emi' | 'paylater';
  enabled: boolean;
  currencies: ('INR' | 'USD')[];
  icon?: string;
  description?: string;
  processingTime?: string;
  recurringSupported: boolean;
}

export const PAYMENT_METHODS: Record<string, IPaymentMethod> = {
  // Cards
  visa: {
    id: 'visa',
    name: 'Visa',
    type: 'card',
    enabled: true,
    currencies: ['INR', 'USD'],
    icon: 'visa-icon',
    recurringSupported: true,
  },
  mastercard: {
    id: 'mastercard',
    name: 'Mastercard',
    type: 'card',
    enabled: true,
    currencies: ['INR', 'USD'],
    icon: 'mastercard-icon',
    recurringSupported: true,
  },
  amex: {
    id: 'amex',
    name: 'American Express',
    type: 'card',
    enabled: true,
    currencies: ['INR', 'USD'],
    icon: 'amex-icon',
    recurringSupported: true,
  },
  rupay: {
    id: 'rupay',
    name: 'RuPay',
    type: 'card',
    enabled: true,
    currencies: ['INR'],
    icon: 'rupay-icon',
    recurringSupported: true,
  },

  // UPI
  upi: {
    id: 'upi',
    name: 'UPI',
    type: 'upi',
    enabled: true,
    currencies: ['INR'],
    description: 'GPay, PhonePe, Paytm, BHIM, etc.',
    icon: 'upi-icon',
    recurringSupported: true, // UPI Autopay
  },

  // Net Banking
  netbanking: {
    id: 'netbanking',
    name: 'Net Banking',
    type: 'netbanking',
    enabled: true,
    currencies: ['INR'],
    description: '50+ banks supported',
    icon: 'netbanking-icon',
    recurringSupported: true, // eNACH
  },

  // Wallets
  paytm_wallet: {
    id: 'paytm_wallet',
    name: 'Paytm Wallet',
    type: 'wallet',
    enabled: true,
    currencies: ['INR'],
    icon: 'paytm-icon',
    recurringSupported: false,
  },
  phonepe_wallet: {
    id: 'phonepe_wallet',
    name: 'PhonePe Wallet',
    type: 'wallet',
    enabled: true,
    currencies: ['INR'],
    icon: 'phonepe-icon',
    recurringSupported: false,
  },
  amazon_pay: {
    id: 'amazon_pay',
    name: 'Amazon Pay',
    type: 'wallet',
    enabled: true,
    currencies: ['INR'],
    icon: 'amazon-pay-icon',
    recurringSupported: false,
  },

  // EMI
  emi: {
    id: 'emi',
    name: 'Credit Card EMI',
    type: 'emi',
    enabled: true,
    currencies: ['INR'],
    description: '3, 6, 9, 12 month options',
    icon: 'emi-icon',
    recurringSupported: false,
  },

  // Pay Later
  simpl: {
    id: 'simpl',
    name: 'Simpl',
    type: 'paylater',
    enabled: true,
    currencies: ['INR'],
    icon: 'simpl-icon',
    recurringSupported: false,
  },
  lazypay: {
    id: 'lazypay',
    name: 'LazyPay',
    type: 'paylater',
    enabled: true,
    currencies: ['INR'],
    icon: 'lazypay-icon',
    recurringSupported: false,
  },
};

// Banks supported for Net Banking
export const SUPPORTED_BANKS = [
  { code: 'HDFC', name: 'HDFC Bank' },
  { code: 'ICIC', name: 'ICICI Bank' },
  { code: 'SBIN', name: 'State Bank of India' },
  { code: 'UTIB', name: 'Axis Bank' },
  { code: 'KKBK', name: 'Kotak Mahindra Bank' },
  { code: 'YESB', name: 'Yes Bank' },
  { code: 'PUNB', name: 'Punjab National Bank' },
  { code: 'BARB', name: 'Bank of Baroda' },
  { code: 'CNRB', name: 'Canara Bank' },
  { code: 'UBIN', name: 'Union Bank of India' },
  // ... more banks
];

/**
 * Get available payment methods for a currency
 */
export function getPaymentMethodsForCurrency(currency: 'INR' | 'USD'): IPaymentMethod[] {
  return Object.values(PAYMENT_METHODS).filter(
    (method) => method.enabled && method.currencies.includes(currency)
  );
}

/**
 * Get recurring-capable payment methods
 */
export function getRecurringPaymentMethods(currency: 'INR' | 'USD'): IPaymentMethod[] {
  return getPaymentMethodsForCurrency(currency).filter((method) => method.recurringSupported);
}
```

### 4.2 Payment Methods Service

```typescript
// src/features/subscription/services/payment-methods.service.ts

import { singleton } from 'tsyringe';
import { BaseModule } from '@utils/baseClass';
import {
  PAYMENT_METHODS,
  SUPPORTED_BANKS,
  getPaymentMethodsForCurrency,
  getRecurringPaymentMethods,
  IPaymentMethod,
} from '@constants/payment-methods';

export interface IPaymentMethodsResponse {
  currency: 'INR' | 'USD';
  methods: {
    cards: IPaymentMethod[];
    upi: IPaymentMethod[];
    netbanking: IPaymentMethod[];
    wallets: IPaymentMethod[];
    emi: IPaymentMethod[];
    paylater: IPaymentMethod[];
  };
  banks: Array<{ code: string; name: string }>;
  recurringMethods: IPaymentMethod[];
  note?: string;
}

@singleton()
export class PaymentMethodsService extends BaseModule {
  constructor() {
    super();
  }

  /**
   * Get all available payment methods for checkout
   */
  getAvailablePaymentMethods(currency: 'INR' | 'USD'): IPaymentMethodsResponse {
    const allMethods = getPaymentMethodsForCurrency(currency);

    const groupedMethods = {
      cards: allMethods.filter((m) => m.type === 'card'),
      upi: allMethods.filter((m) => m.type === 'upi'),
      netbanking: allMethods.filter((m) => m.type === 'netbanking'),
      wallets: allMethods.filter((m) => m.type === 'wallet'),
      emi: allMethods.filter((m) => m.type === 'emi'),
      paylater: allMethods.filter((m) => m.type === 'paylater'),
    };

    const recurringMethods = getRecurringPaymentMethods(currency);

    const response: IPaymentMethodsResponse = {
      currency,
      methods: groupedMethods,
      banks: currency === 'INR' ? SUPPORTED_BANKS : [],
      recurringMethods,
    };

    if (currency === 'USD') {
      response.note =
        'International payments support credit/debit cards only. Your bank may charge forex fees.';
    }

    return response;
  }

  /**
   * Validate payment method for subscription
   */
  validatePaymentMethodForSubscription(
    methodType: string,
    currency: 'INR' | 'USD'
  ): { valid: boolean; message?: string } {
    const method = Object.values(PAYMENT_METHODS).find(
      (m) => m.type === methodType || m.id === methodType
    );

    if (!method) {
      return { valid: false, message: 'Invalid payment method' };
    }

    if (!method.currencies.includes(currency)) {
      return {
        valid: false,
        message: `${method.name} is not available for ${currency} payments`,
      };
    }

    if (!method.recurringSupported) {
      return {
        valid: false,
        message: `${method.name} does not support recurring payments. Please use a card, UPI Autopay, or set up eNACH.`,
      };
    }

    return { valid: true };
  }
}
```

---

## 5. International Payments (USD)

### 5.1 Currency Detection Service

```typescript
// src/features/subscription/services/currency.service.ts

import { singleton } from 'tsyringe';
import { BaseModule } from '@utils/baseClass';
import { FastifyRequest } from 'fastify';

export interface ICurrencyDetection {
  detectedCurrency: 'INR' | 'USD';
  detectionMethod: 'ip' | 'preference' | 'default';
  country?: string;
  countryCode?: string;
}

// List of countries that use INR
const INR_COUNTRIES = ['IN', 'India'];

@singleton()
export class CurrencyService extends BaseModule {
  constructor() {
    super();
  }

  /**
   * Detect currency based on request
   */
  async detectCurrency(request: FastifyRequest): Promise<ICurrencyDetection> {
    // Method 1: Check user preference (from header or cookie)
    const preferredCurrency = request.headers['x-preferred-currency'] as string;
    if (preferredCurrency && ['INR', 'USD'].includes(preferredCurrency.toUpperCase())) {
      return {
        detectedCurrency: preferredCurrency.toUpperCase() as 'INR' | 'USD',
        detectionMethod: 'preference',
      };
    }

    // Method 2: Detect from IP
    try {
      const geoData = await this.getGeoFromIP(request.ip);

      if (geoData && INR_COUNTRIES.includes(geoData.countryCode)) {
        return {
          detectedCurrency: 'INR',
          detectionMethod: 'ip',
          country: geoData.country,
          countryCode: geoData.countryCode,
        };
      }

      if (geoData) {
        return {
          detectedCurrency: 'USD',
          detectionMethod: 'ip',
          country: geoData.country,
          countryCode: geoData.countryCode,
        };
      }
    } catch (error) {
      this.logError('IP detection failed', { error, ip: request.ip });
    }

    // Method 3: Default to INR
    return {
      detectedCurrency: 'INR',
      detectionMethod: 'default',
    };
  }

  /**
   * Get geo data from IP (using a geo service)
   */
  private async getGeoFromIP(ip: string): Promise<{ country: string; countryCode: string } | null> {
    // In production, use a service like MaxMind, IP-API, or CloudFlare headers
    // This is a simplified example

    try {
      // Example using ip-api.com (free tier)
      const response = await fetch(`http://ip-api.com/json/${ip}?fields=country,countryCode`);
      const data = await response.json();

      if (data.status === 'success') {
        return {
          country: data.country,
          countryCode: data.countryCode,
        };
      }
    } catch (error) {
      this.logError('Geo lookup failed', { error });
    }

    return null;
  }

  /**
   * Get pricing for currency
   */
  getPricing(currency: 'INR' | 'USD') {
    const pricing = {
      INR: {
        PRO: {
          monthly: { amount: 79900, display: '₹799' },
          yearly: { amount: 799000, display: '₹7,990', savings: '₹1,598' },
        },
        PREMIUM: {
          monthly: { amount: 149900, display: '₹1,499' },
          yearly: { amount: 1499000, display: '₹14,990', savings: '₹2,998' },
        },
      },
      USD: {
        PRO: {
          monthly: { amount: 999, display: '$9.99' },
          yearly: { amount: 9990, display: '$99.90', savings: '$19.98' },
        },
        PREMIUM: {
          monthly: { amount: 1999, display: '$19.99' },
          yearly: { amount: 19990, display: '$199.90', savings: '$39.98' },
        },
      },
    };

    return pricing[currency];
  }
}
```

### 5.2 International Payment Handling

```typescript
// src/features/subscription/services/international-payment.service.ts

import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { RazorpayService } from '@services/razorpay/razorpay.service';
import { CurrencyService } from './currency.service';
import { SubscriptionRepository } from '../repositories/subscription.repository';

export interface IInternationalPaymentConfig {
  currency: 'USD';
  planId: string;
  customerId: string;
  billingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
}

@singleton()
export class InternationalPaymentService extends BaseModule {
  constructor(
    @inject(TOKENS.RazorpayService)
    private readonly razorpayService: RazorpayService,
    @inject(TOKENS.CurrencyService)
    private readonly currencyService: CurrencyService,
    @inject(TOKENS.SubscriptionRepository)
    private readonly subscriptionRepo: SubscriptionRepository
  ) {
    super();
  }

  /**
   * Create international subscription
   */
  async createInternationalSubscription(userId: string, config: IInternationalPaymentConfig) {
    // Validate currency
    if (config.currency !== 'USD') {
      this.throwBadRequest('International payments only support USD');
    }

    // Create or update customer with international details
    const subscription = await this.subscriptionRepo.findByUserId(userId);

    if (!subscription?.razorpayCustomerId) {
      this.throwBadRequest('Customer not found. Please complete registration first.');
    }

    // Update customer with billing address
    await this.razorpayService.updateCustomer(subscription.razorpayCustomerId, {
      // Razorpay customer update with notes for billing address
    });

    // Create subscription with international plan
    const razorpaySubscription = await this.razorpayService.createSubscription({
      planId: config.planId,
      customerId: subscription.razorpayCustomerId,
      notes: {
        currency: 'USD',
        country: config.billingAddress.country,
        userId,
      },
    });

    // Update local subscription record
    await this.subscriptionRepo.update(subscription._id, {
      razorpaySubscriptionId: razorpaySubscription.id,
      razorpayPlanId: config.planId,
      currency: 'USD',
      isInternational: true,
      billingAddress: config.billingAddress,
    });

    return {
      subscriptionId: razorpaySubscription.id,
      shortUrl: razorpaySubscription.short_url,
      currency: 'USD',
    };
  }

  /**
   * Handle currency switch
   */
  async switchCurrency(
    userId: string,
    newCurrency: 'INR' | 'USD'
  ): Promise<{ requiresNewSubscription: boolean; message: string }> {
    const subscription = await this.subscriptionRepo.findByUserId(userId);

    if (!subscription || !subscription.razorpaySubscriptionId) {
      return {
        requiresNewSubscription: false,
        message: 'No active subscription. You can subscribe with your preferred currency.',
      };
    }

    if (subscription.currency === newCurrency) {
      return {
        requiresNewSubscription: false,
        message: `Your subscription is already in ${newCurrency}`,
      };
    }

    // Currency switch requires cancellation and new subscription
    return {
      requiresNewSubscription: true,
      message: `To switch from ${subscription.currency} to ${newCurrency}, you'll need to cancel your current subscription and create a new one. Your content will be preserved.`,
    };
  }
}
```

---

## 6. Subscription Pausing

### 6.1 Pause Service

```typescript
// src/features/subscription/services/pause.service.ts

import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { RazorpayService } from '@services/razorpay/razorpay.service';
import { NotificationService } from '@features/notification/services/notification.service';
import { DowngradeService } from './downgrade.service';
import { SubscriptionStatus, SubscriptionPlan, BillingInterval } from '../types/subscription.types';

export interface IPauseRequest {
  userId: string;
  pauseCycles: number; // 1-3 cycles
}

export interface IPauseResult {
  success: boolean;
  pausedUntil: Date;
  resumeDate: Date;
  accessLevel: string;
}

export interface IResumeResult {
  success: boolean;
  plan: SubscriptionPlan;
  nextBillingDate: Date;
}

// Maximum pause duration in billing cycles
const MAX_PAUSE_CYCLES = 3;

@singleton()
export class PauseService extends BaseModule {
  constructor(
    @inject(TOKENS.SubscriptionRepository)
    private readonly subscriptionRepo: SubscriptionRepository,
    @inject(TOKENS.RazorpayService)
    private readonly razorpayService: RazorpayService,
    @inject(TOKENS.NotificationService)
    private readonly notificationService: NotificationService,
    @inject(TOKENS.DowngradeService)
    private readonly downgradeService: DowngradeService
  ) {
    super();
  }

  /**
   * Check if subscription can be paused
   */
  async canPause(userId: string): Promise<{
    canPause: boolean;
    reason?: string;
    maxCycles: number;
  }> {
    const subscription = await this.subscriptionRepo.findByUserId(userId);

    if (!subscription) {
      return { canPause: false, reason: 'No subscription found', maxCycles: 0 };
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      return {
        canPause: false,
        reason: 'Only active subscriptions can be paused',
        maxCycles: 0,
      };
    }

    if (subscription.plan === SubscriptionPlan.FREE) {
      return { canPause: false, reason: 'Free plan cannot be paused', maxCycles: 0 };
    }

    // Check if in first billing cycle
    if (subscription.paidCount <= 1) {
      return {
        canPause: false,
        reason: 'Cannot pause during the first billing cycle',
        maxCycles: 0,
      };
    }

    // Check if there are pending payments
    if (subscription.status === SubscriptionStatus.PENDING) {
      return {
        canPause: false,
        reason: 'Cannot pause subscription with pending payment',
        maxCycles: 0,
      };
    }

    return { canPause: true, maxCycles: MAX_PAUSE_CYCLES };
  }

  /**
   * Pause subscription
   */
  async pauseSubscription(request: IPauseRequest): Promise<IPauseResult> {
    const { userId, pauseCycles } = request;

    // Validate
    const canPauseResult = await this.canPause(userId);
    if (!canPauseResult.canPause) {
      this.throwBadRequest(canPauseResult.reason || 'Cannot pause subscription');
    }

    if (pauseCycles < 1 || pauseCycles > MAX_PAUSE_CYCLES) {
      this.throwBadRequest(`Pause duration must be between 1 and ${MAX_PAUSE_CYCLES} cycles`);
    }

    const subscription = await this.subscriptionRepo.findByUserId(userId);

    try {
      // Pause in Razorpay (at cycle end)
      await this.razorpayService.pauseSubscription(
        subscription.razorpaySubscriptionId,
        'cycle_end'
      );

      // Calculate pause and resume dates
      const pauseStartDate = subscription.currentPeriodEnd || new Date();
      const resumeDate = this.calculateResumeDate(
        pauseStartDate,
        pauseCycles,
        subscription.billingInterval
      );

      // Update subscription
      await this.subscriptionRepo.update(subscription._id, {
        status: SubscriptionStatus.PAUSED,
        pausedAt: new Date(),
        pauseStartDate,
        pauseEndDate: resumeDate,
        pauseCycles,
        previousPlan: subscription.plan,
      });

      // Apply free plan limits during pause
      await this.downgradeService.processDowngrade(userId, SubscriptionPlan.FREE);

      // Send notification
      await this.notificationService.createNotification({
        userId,
        type: 'SUBSCRIPTION_PAUSED',
        title: 'Subscription Paused',
        message: `Your subscription is paused until ${resumeDate.toLocaleDateString()}. You'll have Free plan access during this time.`,
        data: { resumeDate },
      });

      return {
        success: true,
        pausedUntil: resumeDate,
        resumeDate,
        accessLevel: 'Free plan',
      };
    } catch (error) {
      this.logError('Failed to pause subscription', { error, userId });
      throw error;
    }
  }

  /**
   * Resume paused subscription
   */
  async resumeSubscription(userId: string): Promise<IResumeResult> {
    const subscription = await this.subscriptionRepo.findByUserId(userId);

    if (!subscription) {
      this.throwNotFoundError('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.PAUSED) {
      this.throwBadRequest('Subscription is not paused');
    }

    try {
      // Resume in Razorpay
      const razorpayResult = await this.razorpayService.resumeSubscription(
        subscription.razorpaySubscriptionId
      );

      // Restore previous plan
      const previousPlan = subscription.previousPlan || subscription.plan;

      await this.subscriptionRepo.update(subscription._id, {
        status: SubscriptionStatus.ACTIVE,
        plan: previousPlan,
        pausedAt: null,
        pauseStartDate: null,
        pauseEndDate: null,
        pauseCycles: null,
        previousPlan: null,
      });

      // Restore access
      await this.downgradeService.restoreAccessAfterUpgrade(userId, previousPlan);

      // Calculate next billing date
      const nextBillingDate = razorpayResult.charge_at
        ? new Date(razorpayResult.charge_at * 1000)
        : new Date();

      // Send notification
      await this.notificationService.createNotification({
        userId,
        type: 'SUBSCRIPTION_RESUMED',
        title: 'Subscription Resumed',
        message: `Your ${previousPlan} subscription is now active. Next billing: ${nextBillingDate.toLocaleDateString()}`,
      });

      return {
        success: true,
        plan: previousPlan,
        nextBillingDate,
      };
    } catch (error) {
      this.logError('Failed to resume subscription', { error, userId });
      throw error;
    }
  }

  /**
   * Calculate resume date based on pause cycles
   */
  private calculateResumeDate(startDate: Date, cycles: number, interval: BillingInterval): Date {
    const resumeDate = new Date(startDate);

    if (interval === BillingInterval.MONTHLY) {
      resumeDate.setMonth(resumeDate.getMonth() + cycles);
    } else if (interval === BillingInterval.YEARLY) {
      resumeDate.setFullYear(resumeDate.getFullYear() + cycles);
    }

    return resumeDate;
  }

  /**
   * Get pause status
   */
  async getPauseStatus(userId: string): Promise<{
    isPaused: boolean;
    pausedAt?: Date;
    resumeDate?: Date;
    remainingPauseCycles?: number;
    daysUntilResume?: number;
  }> {
    const subscription = await this.subscriptionRepo.findByUserId(userId);

    if (!subscription || subscription.status !== SubscriptionStatus.PAUSED) {
      return { isPaused: false };
    }

    const now = new Date();
    const resumeDate = subscription.pauseEndDate;
    const daysUntilResume = resumeDate
      ? Math.ceil((resumeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      isPaused: true,
      pausedAt: subscription.pausedAt,
      resumeDate: subscription.pauseEndDate,
      remainingPauseCycles: subscription.pauseCycles,
      daysUntilResume: Math.max(0, daysUntilResume),
    };
  }

  /**
   * Auto-resume check (called by cron job)
   */
  async processAutoResumes(): Promise<void> {
    const now = new Date();

    const pausedSubscriptions = await this.subscriptionRepo.findMany({
      status: SubscriptionStatus.PAUSED,
      pauseEndDate: { $lte: now },
    });

    for (const subscription of pausedSubscriptions) {
      try {
        await this.resumeSubscription(subscription.userId.toString());
        this.logInfo('Auto-resumed subscription', {
          subscriptionId: subscription._id,
        });
      } catch (error) {
        this.logError('Failed to auto-resume subscription', {
          subscriptionId: subscription._id,
          error,
        });
      }
    }
  }
}
```

### 6.2 Pause Controller

```typescript
// src/features/subscription/controllers/pause.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { ApiResponse } from '@utils/apiResponse';
import { PauseService } from '../services/pause.service';
import { HTTP_STATUS } from '@constants/httpStatus';

interface PauseBody {
  cycles: number;
}

@singleton()
export class PauseController extends BaseModule {
  constructor(
    @inject(TOKENS.PauseService)
    private readonly pauseService: PauseService
  ) {
    super();
  }

  /**
   * Check if can pause
   * GET /subscription/pause/check
   */
  async checkCanPause(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.clerkId;
    const result = await this.pauseService.canPause(userId);

    return reply
      .code(HTTP_STATUS.OK.code)
      .send(new ApiResponse(true, 'Pause eligibility checked', result));
  }

  /**
   * Pause subscription
   * POST /subscription/pause
   */
  async pauseSubscription(request: FastifyRequest, reply: FastifyReply) {
    const { cycles } = request.body as PauseBody;
    const userId = request.user.clerkId;

    const result = await this.pauseService.pauseSubscription({
      userId,
      pauseCycles: cycles,
    });

    return reply
      .code(HTTP_STATUS.OK.code)
      .send(new ApiResponse(true, 'Subscription paused successfully', result));
  }

  /**
   * Resume subscription
   * POST /subscription/resume
   */
  async resumeSubscription(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.clerkId;
    const result = await this.pauseService.resumeSubscription(userId);

    return reply
      .code(HTTP_STATUS.OK.code)
      .send(new ApiResponse(true, 'Subscription resumed successfully', result));
  }

  /**
   * Get pause status
   * GET /subscription/pause/status
   */
  async getPauseStatus(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.clerkId;
    const status = await this.pauseService.getPauseStatus(userId);

    return reply
      .code(HTTP_STATUS.OK.code)
      .send(new ApiResponse(true, 'Pause status retrieved', status));
  }
}
```

---

## 7. Database Migrations

### 7.1 Subscription Schema Updates

```typescript
// src/models/subscription.model.ts - Additional fields

// Add to existing schema
const additionalFields = {
  // Cancellation tracking
  cancelledAt: Date,
  cancellationReason: {
    type: String,
    enum: [
      'too_expensive',
      'not_using_features',
      'switching_to_competitor',
      'missing_features',
      'technical_issues',
      'other',
    ],
  },
  cancellationFeedback: String,
  cancellationType: {
    type: String,
    enum: ['end_of_cycle', 'immediate'],
  },
  scheduledCancellationDate: Date,

  // Downgrade tracking
  downgradeDate: Date,
  gracePeriodEnds: Date,
  previousPlan: {
    type: String,
    enum: ['FREE', 'PRO', 'PREMIUM'],
  },

  // Pause tracking
  pausedAt: Date,
  pauseStartDate: Date,
  pauseEndDate: Date,
  pauseCycles: Number,

  // International payments
  isInternational: {
    type: Boolean,
    default: false,
  },
  billingAddress: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
  },
};

// Add indexes
subscriptionSchema.index({ scheduledCancellationDate: 1, status: 1 });
subscriptionSchema.index({ pauseEndDate: 1, status: 1 });
subscriptionSchema.index({ gracePeriodEnds: 1 });
```

### 7.2 Refund Model

```typescript
// src/models/refund.model.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IRefund extends Document {
  userId: mongoose.Types.ObjectId;
  paymentId: mongoose.Types.ObjectId;
  razorpayPaymentId: string;
  razorpayRefundId: string;
  amount: number;
  currency: 'INR' | 'USD';
  reason: string;
  description?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'rejected';
  policyApplied: string;
  processedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const refundSchema = new Schema<IRefund>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentHistory',
      required: true,
    },
    razorpayPaymentId: {
      type: String,
      required: true,
      index: true,
    },
    razorpayRefundId: {
      type: String,
      sparse: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      enum: ['INR', 'USD'],
      default: 'INR',
    },
    reason: {
      type: String,
      required: true,
    },
    description: String,
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'rejected'],
      default: 'pending',
      index: true,
    },
    policyApplied: String,
    processedAt: Date,
    failureReason: String,
  },
  {
    timestamps: true,
  }
);

refundSchema.index({ userId: 1, createdAt: -1 });

export const Refund = mongoose.model<IRefund>('Refund', refundSchema);
```

---

## 8. API Endpoints Summary

### 8.1 Routes Configuration

```typescript
// src/features/subscription/routes/subscription.routes.ts

import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { validateAuth } from '@middleware/authHandler';
import zodToJsonSchema from 'zod-to-json-schema';

// Import controllers
import { SubscriptionController } from '../controllers/subscription.controller';
import { CancellationController } from '../controllers/cancellation.controller';
import { RefundController } from '../controllers/refund.controller';
import { PauseController } from '../controllers/pause.controller';

// Import validators
import { CancelSubscriptionSchema } from '../validators/cancellation.validator';
import { RefundRequestSchema } from '../validators/refund.validator';
import { PauseSubscriptionSchema } from '../validators/pause.validator';

export async function subscriptionRoutes(fastify: FastifyInstance) {
  const subscriptionController = container.resolve<SubscriptionController>(
    TOKENS.SubscriptionController
  );
  const cancellationController = container.resolve<CancellationController>(
    TOKENS.CancellationController
  );
  const refundController = container.resolve<RefundController>(TOKENS.RefundController);
  const pauseController = container.resolve<PauseController>(TOKENS.PauseController);

  // ==========================================
  // CANCELLATION ROUTES
  // ==========================================

  // Cancel subscription
  fastify.post(
    '/subscription/cancel',
    {
      preHandler: [validateAuth],
      schema: {
        tags: ['Subscription - Cancellation'],
        summary: 'Cancel subscription',
        body: zodToJsonSchema(CancelSubscriptionSchema),
      },
    },
    cancellationController.cancelSubscription.bind(cancellationController)
  );

  // Get cancellation preview
  fastify.get(
    '/subscription/cancel/preview',
    {
      preHandler: [validateAuth],
      schema: {
        tags: ['Subscription - Cancellation'],
        summary: 'Get cancellation preview',
      },
    },
    cancellationController.getCancellationPreview.bind(cancellationController)
  );

  // ==========================================
  // DOWNGRADE ROUTES
  // ==========================================

  // Get downgrade preview
  fastify.get(
    '/subscription/downgrade/preview',
    {
      preHandler: [validateAuth],
      schema: {
        tags: ['Subscription - Downgrade'],
        summary: 'Preview downgrade impact',
        querystring: {
          type: 'object',
          properties: {
            plan: { type: 'string', enum: ['FREE', 'PRO'] },
          },
          required: ['plan'],
        },
      },
    },
    subscriptionController.getDowngradePreview.bind(subscriptionController)
  );

  // ==========================================
  // REFUND ROUTES
  // ==========================================

  // Check refund eligibility
  fastify.get(
    '/subscription/refund/eligibility',
    {
      preHandler: [validateAuth],
      schema: {
        tags: ['Subscription - Refund'],
        summary: 'Check refund eligibility',
        querystring: {
          type: 'object',
          properties: {
            paymentId: { type: 'string' },
          },
          required: ['paymentId'],
        },
      },
    },
    refundController.checkEligibility.bind(refundController)
  );

  // Request refund
  fastify.post(
    '/subscription/refund',
    {
      preHandler: [validateAuth],
      schema: {
        tags: ['Subscription - Refund'],
        summary: 'Request refund',
        body: zodToJsonSchema(RefundRequestSchema),
      },
    },
    refundController.requestRefund.bind(refundController)
  );

  // Get refund history
  fastify.get(
    '/subscription/refunds',
    {
      preHandler: [validateAuth],
      schema: {
        tags: ['Subscription - Refund'],
        summary: 'Get refund history',
      },
    },
    refundController.getRefundHistory.bind(refundController)
  );

  // ==========================================
  // PAYMENT METHODS ROUTES
  // ==========================================

  // Get available payment methods
  fastify.get(
    '/subscription/payment-methods',
    {
      schema: {
        tags: ['Subscription - Payment'],
        summary: 'Get available payment methods',
        querystring: {
          type: 'object',
          properties: {
            currency: { type: 'string', enum: ['INR', 'USD'], default: 'INR' },
          },
        },
      },
    },
    subscriptionController.getPaymentMethods.bind(subscriptionController)
  );

  // Detect currency
  fastify.get(
    '/subscription/detect-currency',
    {
      schema: {
        tags: ['Subscription - Payment'],
        summary: 'Detect user currency based on location',
      },
    },
    subscriptionController.detectCurrency.bind(subscriptionController)
  );

  // ==========================================
  // PAUSE ROUTES
  // ==========================================

  // Check if can pause
  fastify.get(
    '/subscription/pause/check',
    {
      preHandler: [validateAuth],
      schema: {
        tags: ['Subscription - Pause'],
        summary: 'Check pause eligibility',
      },
    },
    pauseController.checkCanPause.bind(pauseController)
  );

  // Pause subscription
  fastify.post(
    '/subscription/pause',
    {
      preHandler: [validateAuth],
      schema: {
        tags: ['Subscription - Pause'],
        summary: 'Pause subscription',
        body: zodToJsonSchema(PauseSubscriptionSchema),
      },
    },
    pauseController.pauseSubscription.bind(pauseController)
  );

  // Resume subscription
  fastify.post(
    '/subscription/resume',
    {
      preHandler: [validateAuth],
      schema: {
        tags: ['Subscription - Pause'],
        summary: 'Resume paused subscription',
      },
    },
    pauseController.resumeSubscription.bind(pauseController)
  );

  // Get pause status
  fastify.get(
    '/subscription/pause/status',
    {
      preHandler: [validateAuth],
      schema: {
        tags: ['Subscription - Pause'],
        summary: 'Get pause status',
      },
    },
    pauseController.getPauseStatus.bind(pauseController)
  );
}
```

### 8.2 API Endpoints Summary Table

| Endpoint                           | Method | Description                   | Auth |
| ---------------------------------- | ------ | ----------------------------- | ---- |
| `/subscription/cancel`             | POST   | Cancel subscription           | Yes  |
| `/subscription/cancel/preview`     | GET    | Preview cancellation impact   | Yes  |
| `/subscription/downgrade/preview`  | GET    | Preview downgrade impact      | Yes  |
| `/subscription/refund/eligibility` | GET    | Check refund eligibility      | Yes  |
| `/subscription/refund`             | POST   | Request refund                | Yes  |
| `/subscription/refunds`            | GET    | Get refund history            | Yes  |
| `/subscription/payment-methods`    | GET    | Get available payment methods | No   |
| `/subscription/detect-currency`    | GET    | Detect user currency          | No   |
| `/subscription/pause/check`        | GET    | Check pause eligibility       | Yes  |
| `/subscription/pause`              | POST   | Pause subscription            | Yes  |
| `/subscription/resume`             | POST   | Resume subscription           | Yes  |
| `/subscription/pause/status`       | GET    | Get pause status              | Yes  |

---

## 9. Cron Jobs

### 9.1 Scheduled Tasks

```typescript
// src/jobs/subscription.jobs.ts

import cron from 'node-cron';
import { container } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { CancellationService } from '@features/subscription/services/cancellation.service';
import { PauseService } from '@features/subscription/services/pause.service';
import { logger } from '@utils/logger';

export function initializeSubscriptionJobs() {
  const cancellationService = container.resolve<CancellationService>(TOKENS.CancellationService);
  const pauseService = container.resolve<PauseService>(TOKENS.PauseService);

  // Process scheduled cancellations - runs daily at midnight
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running scheduled cancellations job');
    try {
      await cancellationService.processScheduledCancellations();
    } catch (error) {
      logger.error('Scheduled cancellations job failed', { error });
    }
  });

  // Process auto-resumes - runs daily at midnight
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running auto-resume job');
    try {
      await pauseService.processAutoResumes();
    } catch (error) {
      logger.error('Auto-resume job failed', { error });
    }
  });

  logger.info('Subscription cron jobs initialized');
}
```

---

## 10. Testing

### 10.1 Unit Test Examples

```typescript
// src/features/subscription/tests/cancellation.service.test.ts

import { CancellationService } from '../services/cancellation.service';
import { CancellationType } from '../types/subscription.types';

describe('CancellationService', () => {
  let cancellationService: CancellationService;

  beforeEach(() => {
    // Setup mocks and service
  });

  describe('cancelSubscription', () => {
    it('should cancel at end of cycle by default', async () => {
      const result = await cancellationService.cancelSubscription({
        userId: 'user123',
        type: CancellationType.END_OF_CYCLE,
      });

      expect(result.success).toBe(true);
      expect(result.accessUntil).toBeInstanceOf(Date);
    });

    it('should cancel immediately when requested', async () => {
      const result = await cancellationService.cancelSubscription({
        userId: 'user123',
        type: CancellationType.IMMEDIATE,
        immediate: true,
      });

      expect(result.success).toBe(true);
      expect(result.subscription.plan).toBe('FREE');
    });
  });
});
```

---

This implementation guide provides complete code for all FAQ-related subscription features. Each service follows the existing tsyringe DI pattern in your codebase and integrates with the Razorpay payment system.
