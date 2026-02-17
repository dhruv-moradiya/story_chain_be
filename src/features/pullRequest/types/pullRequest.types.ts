import { Document, Types } from 'mongoose';
import { ID } from '@/types';

import { PR_TYPES, PR_STATUSES, PR_LABELS } from './pullRequest-enum';

export type TPRType = (typeof PR_TYPES)[number];
export type TPRStatus = (typeof PR_STATUSES)[number];
export type TPRLabel = (typeof PR_LABELS)[number];

// ===========================
// INTERFACES
// ===========================
export interface PRChanges {
  original?: string;
  proposed: string;
  diff?: string;
}

export interface PRVotes {
  upvotes: number;
  downvotes: number;
  score: number;
}

export interface PRAutoApprove {
  enabled: boolean;
  threshold: number;
  timeWindow: number;
}

export interface PRStats {
  views: number;
  discussions: number;
}

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

  // Changes
  changes: {
    original?: string;
    proposed: string;
    diff?: string;
    lineCount?: number;
    additionsCount?: number;
    deletionsCount?: number;
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

  requiresModeration: boolean;
  flaggedForReview: boolean;
  moderationNotes: string;
  reportIds: [ID];

  // hasConflicts: boolean;

  // conflictDescription: string;
  // conflictResolvedAt: boolean;

  // Timeline (high-level tracking)
  timeline: Array<{
    action: string;
    performedBy?: string;
    performedAt: Date;
    // eslint-disable-next-line
    metadata?: any;
  }>;

  // Stats
  stats: {
    views: number;
    discussions: number;
    reviewsReceived?: number;
    timeToMerge?: number; // in minutes
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface IPullRequestDoc extends IPullRequest, Document {
  _id: Types.ObjectId;
}
