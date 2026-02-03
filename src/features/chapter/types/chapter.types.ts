import { Document, Types } from 'mongoose';
import { ID } from '@/types';
import { CHAPTER_PR_STATUSES, CHAPTER_STATUSES } from './chapter-enum';

// ========================================
// MODEL TYPES
// ========================================

export type TChapterStatus = (typeof CHAPTER_STATUSES)[number];
export type TChapterPRStatus = (typeof CHAPTER_PR_STATUSES)[number];

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
  authorId: string;
  content: string;
  title: string;
  chapterNumber?: number;
  branchIndex: number;
  displayNumber?: string;

  votes: {
    upvotes: number;
    downvotes: number;
    score: number;
  };

  status: TChapterStatus;
  isEnding: boolean;

  pullRequest: {
    isPR: boolean;
    prId?: ID;
    status: TChapterPRStatus;
    submittedAt?: Date;
    reviewedBy?: ID;
    reviewedAt?: Date;
    rejectionReason?: string;
  };

  version: number;
  previousVersionId?: ID;

  stats: {
    reads: number;
    comments: number;
    childBranches: number;
  };

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
