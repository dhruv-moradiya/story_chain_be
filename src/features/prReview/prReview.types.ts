import { Document, Types } from 'mongoose';

export type PRDecisionType = 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';

export interface IPRFeedback {
  section?: string;
  rating?: number;
  comment?: string;
}

export interface IPRReview {
  _id: Types.ObjectId;
  pullRequestId: Types.ObjectId;
  reviewerId: string;
  decision: PRDecisionType;
  summary?: string;
  feedback?: IPRFeedback[];
  overallRating?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPRReviewDoc extends Document<Types.ObjectId>, IPRReview {}
