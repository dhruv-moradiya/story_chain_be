import { inject, singleton } from 'tsyringe';
import { Job } from 'bullmq';
import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { WorkerService } from '@infrastructure/queue/worker.service';
import {
  QUEUE_NAMES,
  type INotificationJobData,
  type IJobResult,
} from '@infrastructure/queue/queue.types';
import { NotificationFactory } from '@shared/services/notificationFactory.service';
import { NotificationRepository } from '@features/notification/repositories/notification.repository';
import { INotification } from '@features/notification/types/notification.types';

/**
 * NotificationWorker - Processes notification jobs from the queue
 *
 * @description
 * Listens to the "notification" queue, uses NotificationFactory to build
 * the notification content (title, message, actionUrl), then persists it
 * to MongoDB via NotificationRepository.
 *
 * Use case: All notification-producing features (story publish, chapter add,
 * collab invite/accept/reject) enqueue a job instead of writing to DB inline.
 * This worker picks it up asynchronously, keeping the HTTP response fast.
 *
 * @example
 * // In app startup:
 * container.resolve(NotificationWorker); // auto-registers once resolved
 */
@singleton()
export class NotificationWorker extends BaseModule {
  private readonly notificationRepo = new NotificationRepository();

  constructor(
    @inject(TOKENS.WorkerService)
    private readonly workerService: WorkerService
  ) {
    super();
    this.register();
  }

  /**
   * Register the notification processor on the "notification" queue.
   * Use case: Called once at construction time; BullMQ handles concurrency.
   */
  private register(): void {
    this.workerService.registerWorker(
      QUEUE_NAMES.NOTIFICATION,
      (job) => this.process(job),
      1 // concurrency = 1; increase if throughput becomes a bottleneck
    );
    this.logInfo('NotificationWorker registered');
  }

  /**
   * Process a single notification job.
   * Use case: Builds notification content via NotificationFactory, then
   * persists the notification document in MongoDB.
   *
   * @param job - BullMQ job with INotificationJobData payload
   * @returns IJobResult indicating success/failure
   */
  private async process(job: Job<INotificationJobData>): Promise<IJobResult> {
    const { recipientUserId, notificationType, context, relatedStorySlug, relatedChapterSlug } =
      job.data;

    this.logInfo(
      `Processing notification job=${job.id} type=${notificationType} for user=${recipientUserId}`
    );

    // Build notification content using the factory (validates + generates title/message/url)
    const { title, message, type, actionUrl } = NotificationFactory.build(
      notificationType,
      context
    );

    // Assemble the notification document
    const payload: Partial<INotification> = {
      userId: recipientUserId,
      type,
      title,
      message,
      actionUrl: actionUrl ?? '',
      relatedStorySlug: relatedStorySlug ?? context.storySlug,
      relatedChapterSlug: relatedChapterSlug ?? context.chapterSlug,
      isRead: false,
    };

    const notification = await this.notificationRepo.createNotification(payload);

    if (!notification) {
      this.logError(`Failed to persist notification for job=${job.id}`);
      return { success: false, processedAt: new Date(), message: 'DB write failed' };
    }

    this.logInfo(`Notification created id=${notification._id} for user=${recipientUserId}`);
    return { success: true, processedAt: new Date() };
  }
}
