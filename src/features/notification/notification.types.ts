import { Document, Types } from 'mongoose';
import { ID } from '../../types';

export type NotificationType =
  | 'NEW_BRANCH'
  | 'CHAPTER_UPVOTE'
  | 'STORY_MILESTONE'
  | 'STORY_CONTINUED'
  | 'PR_OPENED'
  | 'PR_APPROVED'
  | 'PR_REJECTED'
  | 'PR_MERGED'
  | 'PR_COMMENTED'
  | 'COMMENT_REPLY'
  | 'COMMENT_MENTION'
  | 'MENTION'
  | 'NEW_FOLLOWER'
  | 'BADGE_EARNED';

export interface INotification {
  _id: ID;
  userId: string; // Receiver of the notification
  type: NotificationType;

  relatedStoryId?: ID;
  relatedChapterId?: ID;
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
