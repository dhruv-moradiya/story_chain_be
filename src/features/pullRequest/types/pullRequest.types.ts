import { Document, Types } from 'mongoose';
import { ID } from '@/types';

// ===========================
// ENUMS
// ===========================
export const PR_TYPE = ['NEW_CHAPTER', 'EDIT_CHAPTER', 'DELETE_CHAPTER'] as const;
export type PRType = (typeof PR_TYPE)[number];

export const PR_STATUS = ['OPEN', 'APPROVED', 'REJECTED', 'CLOSED', 'MERGED'] as const;
export type PRStatus = (typeof PR_STATUS)[number];

export const PR_LABELS = [
  'NEEDS_REVIEW',
  'QUALITY_ISSUE',
  'GRAMMAR',
  'PLOT_HOLE',
  'GOOD_FIRST_PR',
] as const;
export type PRLabel = (typeof PR_LABELS)[number];

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
  storyId: Types.ObjectId;
  chapterId: Types.ObjectId;
  parentChapterId: Types.ObjectId;
  authorId: string;

  // PR Type
  prType: 'NEW_CHAPTER' | 'EDIT_CHAPTER' | 'DELETE_CHAPTER';

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
  status: 'OPEN' | 'APPROVED' | 'REJECTED' | 'CLOSED' | 'MERGED';

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
  labels: string[];

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
