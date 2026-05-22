import { Job } from 'bullmq';
import { container } from 'tsyringe';

import { TOKENS } from '@container/tokens';
import { IJobResult, INotificationJobData, NOTIFICATION_JOB_NAMES } from '..';

import { NotificationRepository } from '@/features/notification/repositories/notification.repository';
import { INotification } from '@/features/notification/types/notification.types';
import { NotificationFactory } from '@/shared/services/notificationFactory.service';

// ═══════════════════════════════════════════
// JOB-NAME → HANDLER REGISTRY
// ═══════════════════════════════════════════

/**
 * Extracts the set of optional reference fields from INotificationJobData
 * that should be persisted on the notification document.
 */
interface NotificationRefs {
  relatedStorySlug?: string;
  relatedChapterSlug?: string;
  relatedPullRequestId?: string;
}

/**
 * Resolves document-level reference fields from job data + context.
 * Falls back to context slugs if top-level fields are not provided.
 */
function resolveRefs(data: INotificationJobData): NotificationRefs {
  return {
    relatedStorySlug: data.relatedStorySlug ?? data.context.storySlug,
    relatedChapterSlug: data.relatedChapterSlug ?? data.context.chapterSlug,
    relatedPullRequestId: data.relatedPullRequestId ?? data.context.prId,
  };
}

/**
 * A handler for a single notification job-name.
 * Receives fully-typed job data, persists the notification, and returns a result.
 */
type NotificationJobHandler = (
  data: INotificationJobData,
  repo: NotificationRepository
) => Promise<IJobResult>;

/**
 * Builds a notification via NotificationFactory.build(), persists it, and
 * returns a standard IJobResult. This is the default handler shared by all
 * notification job names — the factory itself differentiates behavior based
 * on `notificationType`.
 */
async function handleNotificationJob(
  data: INotificationJobData,
  repo: NotificationRepository
): Promise<IJobResult> {
  const { recipientUserId, notificationType, context } = data;

  // 1. Build title / message / actionUrl via the factory (validates context)
  const { title, message, type, actionUrl } = NotificationFactory.build(notificationType, context);

  // 2. Resolve document-level reference fields
  const refs = resolveRefs(data);

  // 3. Assemble the notification payload
  const payload: Partial<INotification> = {
    userId: recipientUserId,
    type,
    title,
    message,
    actionUrl: actionUrl ?? '',
    relatedStorySlug: refs.relatedStorySlug,
    relatedChapterSlug: refs.relatedChapterSlug,
    isRead: false,
  };

  // 4. Persist
  const notification = await repo.createNotification(payload);

  if (!notification) {
    return {
      success: false,
      processedAt: new Date(),
      message: `DB write failed for type=${notificationType}, user=${recipientUserId}`,
    };
  }

  return { success: true, processedAt: new Date() };
}

/**
 * Registry mapping every NOTIFICATION_JOB_NAMES value to its handler.
 *
 * Why a map instead of a switch?
 *  - Adding a new job name forces a compile-time error if you forget the handler.
 *  - Each handler can be customized independently (e.g. extra side-effects for PR_OPENED).
 *  - Easier to unit-test individual handlers in isolation.
 *
 * The type `Record<…>` ensures that every entry in NOTIFICATION_JOB_NAMES
 * is covered — omitting one is a TypeScript error.
 */
type NotificationJobName = (typeof NOTIFICATION_JOB_NAMES)[keyof typeof NOTIFICATION_JOB_NAMES];

const JOB_HANDLERS: Record<NotificationJobName, NotificationJobHandler> = {
  [NOTIFICATION_JOB_NAMES.STORY_PUBLISHED]: handleNotificationJob,
  [NOTIFICATION_JOB_NAMES.CHAPTER_ADDED]: handleNotificationJob,
  [NOTIFICATION_JOB_NAMES.COLLAB_INVITATION]: handleNotificationJob,
  [NOTIFICATION_JOB_NAMES.COLLAB_ACCEPTED]: handleNotificationJob,
  [NOTIFICATION_JOB_NAMES.COLLAB_REJECTED]: handleNotificationJob,
  [NOTIFICATION_JOB_NAMES.PR_OPENED]: handleNotificationJob,
};

// ═══════════════════════════════════════════
// PROCESSOR ENTRY POINT
// ═══════════════════════════════════════════

/**
 * notificationProcessor — BullMQ processor for the "notification" queue.
 *
 * Resolves the correct handler from `JOB_HANDLERS` based on `job.name`,
 * delegates to `NotificationFactory` for content generation, and persists
 * the resulting notification document.
 *
 * Type-safety guarantees:
 *  - `job.data` is typed as `INotificationJobData` (no `any`/`unknown`).
 *  - `job.name` is narrowed via `isKnownJobName()` type-guard.
 *  - The `JOB_HANDLERS` record is exhaustive over `NOTIFICATION_JOB_NAMES`.
 *
 * @param job - BullMQ job with typed payload
 * @returns IJobResult indicating success or failure
 */
export async function notificationProcessor(
  job: Job<INotificationJobData, IJobResult>
): Promise<IJobResult> {
  const notificationRepository = container.resolve<NotificationRepository>(
    TOKENS.NotificationRepository
  );

  // Narrow job.name (string) to the union of known notification job names
  if (!isKnownJobName(job.name)) {
    return {
      success: false,
      processedAt: new Date(),
      message: `Unknown notification job name: "${job.name}"`,
    };
  }

  const handler = JOB_HANDLERS[job.name];
  return handler(job.data, notificationRepository);
}

// ═══════════════════════════════════════════
// TYPE GUARD
// ═══════════════════════════════════════════

/**
 * Type-guard that narrows a string to a known NotificationJobName.
 * Derived from the NOTIFICATION_JOB_NAMES const-object so it stays in
 * sync automatically — no manual maintenance required.
 */
const KNOWN_JOB_NAMES = new Set<string>(Object.values(NOTIFICATION_JOB_NAMES));

function isKnownJobName(name: string): name is NotificationJobName {
  return KNOWN_JOB_NAMES.has(name);
}
