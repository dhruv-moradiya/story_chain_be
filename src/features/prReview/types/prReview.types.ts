import { Document, Types } from 'mongoose';
import { ID } from '@/types';

import { PR_REVIEW_STATUSES } from './prReview-enum';

export type TPRReviewStatus = (typeof PR_REVIEW_STATUSES)[number];

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
