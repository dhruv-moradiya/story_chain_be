import { Document, Types } from 'mongoose';
import { ID } from '@/types';

import { PR_REVIEW_DECISIONS } from './prReview-enum';

export type TPRReviewDecision = (typeof PR_REVIEW_DECISIONS)[number];

export interface IPRReview {
  _id: ID;
  pullRequestId: ID;
  storySlug: string; // denormalized
  reviewerId: string; // clerkId

  // The verdict
  decision: TPRReviewDecision;

  // Written feedback
  summary: string; // overall note to author (max 3000 chars)
  overallRating?: number; // 1–5 stars (optional)

  // Revision tracking
  isUpdated: boolean;
  previousDecision?: string;
  updatedAt_review: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface IPRReviewDoc extends Document, IPRReview {
  _id: Types.ObjectId;
}

export interface IPRReviewWithReviewer extends IPRReview {
  reviewer?: {
    clerkId: string;
    username?: string;
    email?: string;
    avatarUrl?: string;
  } | null;
}
