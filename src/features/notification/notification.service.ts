import { INotificationForCollabInvitation } from '../../dto/notification.dto';
import { NotificationFactory } from '../../services/notificationFactory.service';
import { BaseModule } from '../../utils/baseClass';
import { INotification, NotificationType } from './notification.types';
import { NotificationRepository } from './repository/notification.repository';

export class NotificationService extends BaseModule {
  private readonly notificationRepo = new NotificationRepository();

  async createNotificationForCollabInvitation(
    input: INotificationForCollabInvitation
    // options: IOperationOptions = {}
  ) {
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
      relatedStoryId: story._id,
      type: type,
      title,
      message,
      actionUrl: actionUrl ?? '',
    };

    const notification = await this.notificationRepo.createNotification({
      ...payload,
    });

    if (!notification) {
      this.throwInternalError('');
    }

    return notification;
  }
}
export const notificationService = new NotificationService();
