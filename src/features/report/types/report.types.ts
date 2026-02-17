import { Document, Types } from 'mongoose';
import { ID } from '@/types';

export interface IReport {
  _id: ID;
  reporterId: string;
  reportType: 'CHAPTER' | 'COMMENT' | 'USER' | 'STORY';
  relatedChapterSlug?: string;
  relatedCommentId?: ID;
  relatedUserId?: string;
  relatedStorySlug?: string;
  reason: 'SPAM' | 'HARASSMENT' | 'INAPPROPRIATE_CONTENT' | 'COPYRIGHT' | 'OFF_TOPIC' | 'OTHER';
  description: string;
  status: 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';
  reviewedBy?: string;
  reviewedAt?: Date;
  resolution?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IReportDoc extends IReport, Document {
  _id: Types.ObjectId;
}
