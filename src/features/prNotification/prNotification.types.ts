import { Document, Types } from 'mongoose';

export type PRNotificationType =
  | 'PR_OPENED'
  | 'PR_APPROVED'
  | 'PR_REJECTED'
  | 'PR_MERGED'
  | 'PR_COMMENTED'
  | 'PR_REVIEW_REQUESTED'
  | 'PR_CHANGES_REQUESTED'
  | 'PR_MENTIONED';

export interface IPRNotification {
  _id: Types.ObjectId;
  userId: string;
  pullRequestId: Types.ObjectId;
  type: PRNotificationType;
  triggeredBy?: string;
  message: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPRNotificationDoc extends Document<Types.ObjectId>, IPRNotification {}
