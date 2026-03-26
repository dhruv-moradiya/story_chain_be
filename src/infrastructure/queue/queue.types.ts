/**
 * Queue Infrastructure - Type Definitions
 *
 * Centralized type definitions for BullMQ queue, worker, and scheduler.
 * All job data must be defined here to ensure type safety across the system.
 */

import { TCommentVoteType } from '@/features/commentVote/types/commentVote.types';
import { TNotificationType } from '@features/notification/types/notification.types';
import { NotificationContext } from '@shared/services/notificationFactory.service';

// ═══════════════════════════════════════════
// JOB NAME REGISTRY
// ═══════════════════════════════════════════

/**
 * All queue names used in the application.
 * Add new queue names here as features grow.
 */
export const QUEUE_NAMES = {
  NOTIFICATION: 'notification',
  EMAIL: 'email',
  CHAPTER_COMMENT_VOTE: 'chapter-comment-vote',
} as const;

export type TQueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/**
 * Descriptive job names for the notification queue.
 * Use case: Dashboards and logs can identify what kind of notification fired.
 */
export const NOTIFICATION_JOB_NAMES = {
  STORY_PUBLISHED: 'notify:story-published',
  CHAPTER_ADDED: 'notify:chapter-added',
  COLLAB_INVITATION: 'notify:collab-invitation',
  COLLAB_ACCEPTED: 'notify:collab-accepted',
  COLLAB_REJECTED: 'notify:collab-rejected',
} as const;

export type TNotificationJobName =
  (typeof NOTIFICATION_JOB_NAMES)[keyof typeof NOTIFICATION_JOB_NAMES];

export const CHAPTER_COMMENT_VOTE_JOB_NAMES = {
  VOTE: 'vote',
  REMOVE_VOTE: 'remove-vote',
  SYNC_COUNTS: 'sync-counts',
} as const;

export type TChapterCommentVoteJobName =
  (typeof CHAPTER_COMMENT_VOTE_JOB_NAMES)[keyof typeof CHAPTER_COMMENT_VOTE_JOB_NAMES];

// ═══════════════════════════════════════════
// JOB DATA PAYLOADS
// ═══════════════════════════════════════════

/**
 * Payload for a notification job.
 * Use case: Enqueue a notification to be built via NotificationFactory
 * and persisted to the DB asynchronously.
 *
 * - `recipientUserId` — the clerk ID of the user who receives the notification
 * - `notificationType` — maps to a NotificationType enum value
 * - `context` — the same NotificationContext consumed by NotificationFactory.build()
 * - `relatedStorySlug` / `relatedChapterSlug` — stored on the notification document for filtering
 */
export interface INotificationJobData {
  /** Clerk ID of the user who should receive this notification */
  recipientUserId: string;
  /** Notification type — must match a key in NotificationFactory's config */
  notificationType: TNotificationType;
  /** Context fields consumed by NotificationFactory.build() to generate title/message/url */
  context: NotificationContext;
  /** Story slug to store on the notification document for querying */
  relatedStorySlug?: string;
  /** Chapter slug to store on the notification document for querying */
  relatedChapterSlug?: string;
}

/**
 * Payload for sending an email job.
 * Use case: Enqueue an email to be sent asynchronously (e.g. invitation, welcome).
 */
export interface IEmailJobData {
  to: string;
  subject: string;
  templateId: string;
  templateData: Record<string, string | number | boolean>;
}

export interface IChapterCommentVoteJobDataMap {
  [CHAPTER_COMMENT_VOTE_JOB_NAMES.VOTE]: {
    commentId: string;
    userId: string;
    voteType: TCommentVoteType;
  };
  [CHAPTER_COMMENT_VOTE_JOB_NAMES.REMOVE_VOTE]: {
    commentId: string;
    userId: string;
    voteType: 'remove';
    voteId?: string;
  };
  [CHAPTER_COMMENT_VOTE_JOB_NAMES.SYNC_COUNTS]: {
    commentId: string;
    userId: string;
    voteType: TCommentVoteType | 'remove';
  };
}

export type IChapterCommentVoteJobData =
  IChapterCommentVoteJobDataMap[keyof IChapterCommentVoteJobDataMap];

/**
 * Maps each queue name to its expected job data type.
 * This ensures type safety when adding/processing jobs.
 */
export interface IQueueJobDataMap {
  [QUEUE_NAMES.NOTIFICATION]: INotificationJobData;
  [QUEUE_NAMES.EMAIL]: IEmailJobData;
  [QUEUE_NAMES.CHAPTER_COMMENT_VOTE]: IChapterCommentVoteJobDataMap[keyof IChapterCommentVoteJobDataMap];
}

// ═══════════════════════════════════════════
// JOB RESULT TYPES
// ═══════════════════════════════════════════

/**
 * Generic result returned after a job is processed successfully.
 * Use case: Workers return this to indicate processing status.
 */
export interface IJobResult {
  success: boolean;
  processedAt: Date;
  message?: string;
}

// ═══════════════════════════════════════════
// JOB OPTIONS
// ═══════════════════════════════════════════

/**
 * Options when adding a job to a queue.
 * Use case: Configure delay, retries, priority, and deduplication for a job.
 */
export interface IAddJobOptions {
  /** Unique job ID — prevents duplicate jobs if the same ID is enqueued again */
  jobId?: string;
  /** Delay in milliseconds before the job becomes active */
  delay?: number;
  /** Number of retry attempts if the job fails */
  attempts?: number;
  /** Backoff strategy configuration for retries */
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  /** Higher priority jobs are processed first (lower number = higher priority) */
  priority?: number;
  /** If true, removes the job from Redis after it completes */
  removeOnComplete?: boolean | number;
  /** If true, removes the job from Redis after it fails all retries */
  removeOnFail?: boolean | number;
}

// ═══════════════════════════════════════════
// SCHEDULED / REPEATABLE JOB OPTIONS
// ═══════════════════════════════════════════

/**
 * Options for a repeatable/scheduled (cron-based) job.
 * Use case: Define cron patterns for recurring tasks (e.g. cleanup, digest emails).
 */
export interface IScheduledJobOptions {
  /** Cron expression (e.g. "0 * * * *" for every hour) */
  pattern: string;
  /** Optional timezone for the cron schedule (e.g. "Asia/Kolkata") */
  timezone?: string;
  /** Maximum number of times the job should repeat (undefined = infinite) */
  limit?: number;
  /** Start date for the repeatable job (ISO string or timestamp) */
  startDate?: Date | string | number;
  /** End date for the repeatable job (ISO string or timestamp) */
  endDate?: Date | string | number;
}
