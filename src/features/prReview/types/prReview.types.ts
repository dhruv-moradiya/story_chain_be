import { Document, Types } from 'mongoose';
import { ID } from '@/types';

export enum PRReviewStatusEnum {
  PENDING_REVIEW = 'PENDING_REVIEW',
  IN_REVIEW = 'IN_REVIEW',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  APPROVED = 'APPROVED',
  NEEDS_WORK = 'NEEDS_WORK',
  DRAFT = 'DRAFT',
}

export type TPRReviewStatus = keyof typeof PRReviewStatusEnum;

export interface IPRFeedback {
  section?: string;
  rating?: number;
  comment?: string;
}

export interface IPRReview {
  _id: ID;
  pullRequestId: ID;
  reviewerId: string;
  reviewStatus: TPRReviewStatus;
  summary?: string;
  feedback?: IPRFeedback[];
  overallRating?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPRReviewDoc extends Document, IPRReview {
  _id: Types.ObjectId;
}
