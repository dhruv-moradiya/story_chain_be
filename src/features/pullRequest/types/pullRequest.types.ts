import { Document, Types } from 'mongoose';
import { ID } from '@/types';

import { PR_TYPES, PR_STATUSES, PR_LABELS, PR_TIMELINE_ACTIONS } from './pullRequest-enum';

export type TPRType = (typeof PR_TYPES)[number];
export type TPRStatus = (typeof PR_STATUSES)[number];
export type TPRLabel = (typeof PR_LABELS)[number];
export type TPRTimelineAction = (typeof PR_TIMELINE_ACTIONS)[number];

// ===========================
// MAIN DOCUMENT INTERFACE
// ===========================
export interface IPullRequest {
  _id: ID;
  title: string;
  description: string;

  // Story/Chapter References
  storySlug: string;
  chapterSlug: string;
  parentChapterSlug: string;
  authorId: string;

  // PR Type
  prType: TPRType;

  // Content
  content: {
    proposed: string;
    wordCount: number;
    readingMinutes: number;
  };

  // Status
  status: TPRStatus;

  // Voting Aggregate (counts only, actual votes in PRVote schema)
  votes: {
    upvotes: number;
    downvotes: number;
    score: number;
  };

  // Comment Count (actual comments in PRComment schema)
  commentCount: number;

  // Auto-approve Config
  autoApprove: {
    enabled: boolean;
    threshold: number; // votes needed
    timeWindow: number; // days
    qualifiedAt?: Date; // when score first passed threshold
    autoApprovedAt?: Date; // when auto-approval actually fired
  };

  // Labels
  labels: TPRLabel[];

  // Merge Info
  mergedAt?: Date;
  mergedBy?: string;

  closedAt?: Date;
  closedBy?: string;
  closeReason?: string;

  isDraft: boolean;
  draftReason: string;
  draftedAt: Date;

  approvalsStatus: {
    required: number;
    received: number;
    pending: number;
    approvers: string[];
    blockers: string[];
    canMerge: boolean;
  };

  // Stats
  stats: {
    views: number;
    discussions: number;
    reviewsReceived: number;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface IPullRequestDoc extends IPullRequest, Document {
  _id: Types.ObjectId;
}
