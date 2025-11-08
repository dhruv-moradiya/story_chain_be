import { Notification } from '../../models/notification.model';
import { BaseModule } from '../../utils';

export class NotificationService extends BaseModule {
  async notifyBranchCreation(chapter, story, treeData, userId, badges) {
    const notifications = [];

    // Notify parent chapter author
    if (treeData.parentChapter && treeData.parentChapter.authorId.toString() !== userId) {
      notifications.push({
        userId: treeData.parentChapter.authorId,
        type: 'NEW_BRANCH',
        relatedStoryId: story._id,
        relatedChapterId: chapter._id,
        relatedUserId: userId,
        title: 'New Branch Created!',
        message: `Someone continued your chapter in "${story.title}"`,
      });
    }

    // Notify story owner
    if (story.creatorId.toString() !== userId && !treeData.isRootChapter) {
      notifications.push({
        userId: story.creatorId,
        type: 'STORY_CONTINUED',
        relatedStoryId: story._id,
        relatedChapterId: chapter._id,
        relatedUserId: userId,
        title: 'Story Continued!',
        message: `New chapter added to "${story.title}"`,
      });
    }

    // Badge notifications
    if (badges.length > 0) {
      notifications.push({
        userId,
        type: 'BADGE_EARNED',
        title: 'Achievement Unlocked!',
        message: `You earned the ${badges.join(', ')} badge${badges.length > 1 ? 's' : ''}!`,
      });
    }

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  }
}
export const notificationService = new NotificationService();
