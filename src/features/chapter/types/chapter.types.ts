import { Document, Types } from 'mongoose';
import { ID } from '@/types';
import { CHAPTER_PR_STATUSES, CHAPTER_STATUSES } from './chapter-enum';

// ========================================
// MODEL TYPES
// ========================================

export type TChapterStatus = (typeof CHAPTER_STATUSES)[number];
export type TChapterPRStatus = (typeof CHAPTER_PR_STATUSES)[number];

export interface IChapterStats {
  reads: number;
  uniqueReaders: number;

  completions: number;
  dropOffs: number;

  totalReadTime: number; // sum of all users
  avgReadTime: number;

  completionRate: number; // percentage
  engagementScore: number; // 0-100 score

  comments: number;
  childBranches: number;
}

export interface IChapterPullRequest {
  isPR: boolean;
  prId?: ID;
  status: TChapterPRStatus;
  submittedAt?: Date;
  reviewedBy?: ID;
  reviewedAt?: Date;
  rejectionReason?: string;
}

export interface IChapterVotes {
  upvotes: number;
  downvotes: number;
  score: number;
}

/**
 * Represents a single chapter within a story.
 */
export interface IChapter {
  _id: ID;
  slug: string;
  storySlug: string;

  parentChapterSlug?: string | null;
  ancestorSlugs: string[];
  depth: number;
  content: string;
  title: string;
  chapterNumber?: number;
  branchIndex: number;
  displayNumber?: string;

  authorId: string;

  votes: IChapterVotes;

  status: TChapterStatus;
  isEnding: boolean;

  pullRequest: IChapterPullRequest;

  version: number;
  previousVersionId?: ID;

  stats: IChapterStats;

  reportCount: number;
  isFlagged: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChapterDoc extends Omit<IChapter, '_id'>, Document {
  ancestorSlugs: Types.Array<string>;
}

export type TChapterNode = IChapter & { children: TChapterNode[] };
export type TChapterMap = Record<string, TChapterNode>;
