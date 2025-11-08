import mongoose, { Document, Model, Schema, Types } from 'mongoose';

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
  _id: Types.ObjectId;
  title: string;
  description?: string;

  storyId: Types.ObjectId;
  chapterId: Types.ObjectId;
  parentChapterId: Types.ObjectId;
  authorId: string;

  prType: PRType;
  changes: PRChanges;

  status: PRStatus;

  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  rejectionReason?: string;

  votes: PRVotes;

  commentCount: number;

  autoApprove: PRAutoApprove;

  labels: PRLabel[];

  mergedAt?: Date;
  mergedBy?: string;

  stats: PRStats;

  createdAt: Date;
  updatedAt: Date;
}

export interface IPullRequestDoc extends IPullRequest, Document<Types.ObjectId> {}
