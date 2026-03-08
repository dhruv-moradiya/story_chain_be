import { Document, Types } from 'mongoose';
import { ID } from '@/types';

import { NotificationType, NOTIFICATION_TYPES } from './notification-enum';

export type TNotificationType = (typeof NOTIFICATION_TYPES)[number];
export { NotificationType };

export interface INotification {
  _id: ID;
  userId: string; // Receiver of the notification
  type: TNotificationType;

  relatedStorySlug?: string;
  relatedChapterSlug?: string;
  relatedPullRequestId?: ID;
  relatedCommentId?: ID;
  relatedUserId?: string; // Who triggered it

  title: string;
  message: string;

  isRead: boolean;
  readAt?: Date;

  actionUrl?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface INotificationDoc extends Document, INotification {
  _id: Types.ObjectId;
}
