import { Notification } from '../../../models/notification.model';
import { BaseRepository } from '../../../utils/baseClass';
import { INotification, INotificationDoc } from '../notification.types';

export class NotificationRepository extends BaseRepository<INotification, INotificationDoc> {
  constructor() {
    super(Notification);
  }

  // Save notification
  async createNotification(data: Partial<INotification>): Promise<INotification> {
    return this.model.create(data);
  }

  // Get notifications for a user with pagination
  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const notifications = await this.model
      .find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const count = await this.model.countDocuments({ userId });

    return {
      notifications,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }

  // Get unread notifications count
  async getUnreadCount(userId: string) {
    return this.model.countDocuments({ userId, isRead: false });
  }

  // Mark one notification as read
  async markAsRead(notificationId: string) {
    return this.model.findByIdAndUpdate(
      notificationId,
      { isRead: true, readAt: new Date() },
      { new: true }
    );
  }

  // Mark multiple notifications as read
  async markManyAsRead(notificationIds: string[]) {
    return this.model.updateMany(
      { _id: { $in: notificationIds } },
      { isRead: true, readAt: new Date() }
    );
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string) {
    return this.model.updateMany({ userId, isRead: false }, { isRead: true, readAt: new Date() });
  }

  // Delete a single notification
  async deleteNotification(notificationId: string) {
    return this.model.findByIdAndDelete(notificationId);
  }

  // Delete all notifications for a user
  async deleteAllForUser(userId: string) {
    return this.model.deleteMany({ userId });
  }
}
