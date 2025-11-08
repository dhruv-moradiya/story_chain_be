import { Document, Types } from 'mongoose';

export type NotificationType =
  | 'NEW_BRANCH'
  | 'COMMENT_REPLY'
  | 'CHAPTER_UPVOTE'
  | 'BADGE_EARNED'
  | 'STORY_MILESTONE'
  | 'STORY_CONTINUED'
  | 'MENTION'
  | 'NEW_FOLLOWER';

export interface INotification {
  _id: Types.ObjectId;
  userId: string;
  type: NotificationType;
  relatedStoryId?: Types.ObjectId;
  relatedChapterId?: Types.ObjectId;
  relatedUserId?: string;
  relatedCommentId?: Types.ObjectId;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationDoc extends Document<Types.ObjectId>, INotification {}
