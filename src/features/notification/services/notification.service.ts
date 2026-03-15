import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { IGetUserNotificationDTO, INotificationForCollabInvitation } from '@dto/notification.dto';
import { NotificationFactory } from '@shared/services/notificationFactory.service';
import { NotificationType, INotification } from '../types/notification.types';
import { NotificationRepository } from '../repositories/notification.repository';
import { QueueService } from '@infrastructure/queue/queue.service';
import {
  QUEUE_NAMES,
  NOTIFICATION_JOB_NAMES,
  type INotificationJobData,
} from '@infrastructure/queue/queue.types';

/**
 * NotificationService - Orchestrates notification creation (sync + async)
 *
 * @description
 * Contains methods that enqueue notification jobs onto the BullMQ notification
 * queue. The actual building (via NotificationFactory) and persistence happen
 * in the NotificationWorker, keeping HTTP handlers fast.
 */
@singleton()
export class NotificationService extends BaseModule {
  private readonly notificationRepo = new NotificationRepository();

  constructor(
    @inject(TOKENS.QueueService)
    private readonly queueService: QueueService
  ) {
    super();
  }

  // ═══════════════════════════════════════════
  // SYNC FETCH (unchanged)
  // ═══════════════════════════════════════════

  /**
   * Fetch all notifications for the current user.
   * Use case: Called by the GET /api/notifications controller.
   */
  async getCurrentUserNotifications(input: IGetUserNotificationDTO) {
    const notifications = await this.notificationRepo.getUserNotifications(input.userId);

    if (!notifications) {
      this.throwInternalError('Unable to fetch notifications for the current user.');
    }

    return notifications;
  }

  // ═══════════════════════════════════════════
  // LEGACY SYNC CREATE (kept for backward compat)
  // ═══════════════════════════════════════════

  /**
   * Create a collab invitation notification synchronously (legacy).
   * Use case: Existing callers that haven't migrated to the queue yet.
   */
  async createNotificationForCollabInvitation(input: INotificationForCollabInvitation) {
    const { invitedUser, inviterUser, role, story } = input;

    const { title, message, type, actionUrl } = NotificationFactory.build(
      NotificationType.COLLAB_INVITATION,
      {
        role,
        storyId: story._id,
        storyName: story.title,
        actor: inviterUser.name,
      }
    );

    const payload: Partial<INotification> = {
      userId: invitedUser.id,
      relatedStorySlug: story.slug,
      type,
      title,
      message,
      actionUrl: actionUrl ?? '',
    };

    const notification = await this.notificationRepo.createNotification(payload);

    if (!notification) {
      this.throwInternalError('Failed to create collaboration invitation notification.');
    }

    return notification;
  }

  // ═══════════════════════════════════════════
  // QUEUE-BASED NOTIFICATION PRODUCERS
  // ═══════════════════════════════════════════

  /**
   * Enqueue a notification when a story is published.
   * Use case: Called from StoryPublishingService after a story is published.
   * Notifies all collaborators that the story is now live.
   *
   * @param recipientUserIds - Clerk IDs of all collaborators to notify
   * @param publisherName    - Display name of the user who published
   * @param storyName        - Title of the story
   * @param storySlug        - Slug of the story (for URL generation)
   */
  async enqueueStoryPublished(params: {
    recipientUserIds: string[];
    publisherName: string;
    storyName: string;
    storySlug: string;
  }): Promise<void> {
    const { recipientUserIds, publisherName, storyName, storySlug } = params;

    for (const userId of recipientUserIds) {
      const jobData: INotificationJobData = {
        recipientUserId: userId,
        notificationType: NotificationType.STORY_MILESTONE,
        context: {
          actor: publisherName,
          storyName,
          storySlug,
        },
        relatedStorySlug: storySlug,
      };

      await this.queueService.addJob(
        QUEUE_NAMES.NOTIFICATION,
        NOTIFICATION_JOB_NAMES.STORY_PUBLISHED,
        jobData
      );
    }

    this.logInfo(
      `Enqueued ${recipientUserIds.length} story-published notifications for "${storySlug}"`
    );
  }

  /**
   * Enqueue a notification when a chapter is added to a story.
   * Use case: Called from StoryController.addChapterToStoryBySlug after a
   * new chapter is created. Notifies the story creator and collaborators.
   *
   * @param recipientUserIds - Clerk IDs of collaborators/creator to notify
   * @param authorName       - Display name of the chapter author
   * @param storyName        - Title of the story
   * @param storySlug        - Slug of the story
   * @param chapterSlug      - Slug of the newly created chapter
   */
  async enqueueChapterAdded(params: {
    recipientUserIds: string[];
    authorName: string;
    storyName: string;
    storySlug: string;
    chapterSlug: string;
  }): Promise<void> {
    const { recipientUserIds, authorName, storyName, storySlug, chapterSlug } = params;

    for (const userId of recipientUserIds) {
      const jobData: INotificationJobData = {
        recipientUserId: userId,
        notificationType: NotificationType.STORY_CONTINUED,
        context: {
          actor: authorName,
          storyName,
          storySlug,
          chapterSlug,
        },
        relatedStorySlug: storySlug,
        relatedChapterSlug: chapterSlug,
      };

      await this.queueService.addJob(
        QUEUE_NAMES.NOTIFICATION,
        NOTIFICATION_JOB_NAMES.CHAPTER_ADDED,
        jobData
      );
    }

    this.logInfo(
      `Enqueued ${recipientUserIds.length} chapter-added notifications for "${storySlug}/${chapterSlug}"`
    );
  }

  /**
   * Enqueue a notification when a user is invited to collaborate.
   * Use case: Called from CollaboratorInvitationService.createInvite to
   * replace the existing synchronous notification creation.
   *
   * @param invitedUserId  - Clerk ID of the invited user
   * @param inviterName    - Display name of the person sending the invitation
   * @param storyName      - Title of the story
   * @param storySlug      - Slug of the story
   * @param role           - Role being offered (writer, editor, etc.)
   */
  async enqueueCollabInvitation(params: {
    invitedUserId: string;
    inviterName: string;
    storyName: string;
    storySlug: string;
    role: string;
  }): Promise<void> {
    const { invitedUserId, inviterName, storyName, storySlug, role } = params;

    const jobData: INotificationJobData = {
      recipientUserId: invitedUserId,
      notificationType: NotificationType.COLLAB_INVITATION,
      context: {
        actor: inviterName,
        storyName,
        storySlug,
        role,
      },
      relatedStorySlug: storySlug,
    };

    await this.queueService.addJob(
      QUEUE_NAMES.NOTIFICATION,
      NOTIFICATION_JOB_NAMES.COLLAB_INVITATION,
      jobData
    );

    this.logInfo(`Enqueued collab-invitation notification for user="${invitedUserId}"`);
  }

  /**
   * Enqueue a notification when a collaboration invite is accepted.
   * Use case: Called from the accept-invitation controller/service.
   * Notifies the inviter that their invitation was accepted.
   *
   * @param inviterUserId  - Clerk ID of the user who sent the original invitation
   * @param acceptedByName - Display name of the user who accepted
   * @param storyName      - Title of the story
   * @param storySlug      - Slug of the story
   */
  async enqueueCollabAccepted(params: {
    inviterUserId: string;
    acceptedByName: string;
    storyName: string;
    storySlug: string;
  }): Promise<void> {
    const { inviterUserId, acceptedByName, storyName, storySlug } = params;

    const jobData: INotificationJobData = {
      recipientUserId: inviterUserId,
      notificationType: NotificationType.COLLAB_INVITATION_APPROVED,
      context: {
        actor: acceptedByName,
        storyName,
        storySlug,
      },
      relatedStorySlug: storySlug,
    };

    await this.queueService.addJob(
      QUEUE_NAMES.NOTIFICATION,
      NOTIFICATION_JOB_NAMES.COLLAB_ACCEPTED,
      jobData
    );

    this.logInfo(`Enqueued collab-accepted notification for inviter="${inviterUserId}"`);
  }

  /**
   * Enqueue a notification when a collaboration invite is declined.
   * Use case: Called from the decline-invitation controller/service.
   * Notifies the inviter that their invitation was rejected.
   *
   * @param inviterUserId   - Clerk ID of the user who sent the original invitation
   * @param declinedByName  - Display name of the user who declined
   * @param storyName       - Title of the story
   * @param storySlug       - Slug of the story
   */
  async enqueueCollabRejected(params: {
    inviterUserId: string;
    declinedByName: string;
    storyName: string;
    storySlug: string;
  }): Promise<void> {
    const { inviterUserId, declinedByName, storyName, storySlug } = params;

    const jobData: INotificationJobData = {
      recipientUserId: inviterUserId,
      notificationType: NotificationType.COLLAB_INVITATION_REJECTED,
      context: {
        actor: declinedByName,
        storyName,
        storySlug,
      },
      relatedStorySlug: storySlug,
    };

    await this.queueService.addJob(
      QUEUE_NAMES.NOTIFICATION,
      NOTIFICATION_JOB_NAMES.COLLAB_REJECTED,
      jobData
    );

    this.logInfo(`Enqueued collab-rejected notification for inviter="${inviterUserId}"`);
  }
}

export const notificationService = new NotificationService(
  // This singleton export is kept for backward compat but prefer DI
  null as unknown as QueueService
);
