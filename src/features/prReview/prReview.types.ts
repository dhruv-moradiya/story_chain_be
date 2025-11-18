import { Document, Types } from 'mongoose';
import { ID } from '../../types';

export type PRDecisionType = 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';

export interface IPRFeedback {
  section?: string;
  rating?: number;
  comment?: string;
}

export interface IPRReview {
  _id: ID;
  pullRequestId: ID;
  reviewerId: string;
  decision: PRDecisionType;
  summary?: string;
  feedback?: IPRFeedback[];
  overallRating?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPRReviewDoc extends Document, IPRReview {
  _id: Types.ObjectId;
}
