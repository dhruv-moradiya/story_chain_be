import { Document, Types } from 'mongoose';

export interface IReport {
  _id: Types.ObjectId;
  reporterId: string;
  reportType: 'CHAPTER' | 'COMMENT' | 'USER' | 'STORY';
  relatedChapterId?: Types.ObjectId;
  relatedCommentId?: Types.ObjectId;
  relatedUserId?: string;
  relatedStoryId?: Types.ObjectId;
  reason: 'SPAM' | 'HARASSMENT' | 'INAPPROPRIATE_CONTENT' | 'COPYRIGHT' | 'OFF_TOPIC' | 'OTHER';
  description: string;
  status: 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';
  reviewedBy?: string;
  reviewedAt?: Date;
  resolution?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IReportDoc extends IReport, Document<Types.ObjectId> {}
