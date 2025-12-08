import { Document, Types } from 'mongoose';
import { ID } from '../../types';

// ========================================
// MODEL TYPES
// ========================================

/**
 * Represents a single chapter within a story.
 */
export interface IChapter {
  _id: ID;
  storyId: ID;

  parentChapterId?: ID | null;
  ancestorIds: ID[];
  depth: number;
  authorId: string;
  content: string;
  title: string;
  chapterNumber?: number;

  votes: {
    upvotes: number;
    downvotes: number;
    score: number; // Derived metric for ranking
  };

  status: 'PUBLISHED' | 'PENDING_APPROVAL' | 'REJECTED' | 'DELETED';
  isEnding: boolean;

  pullRequest: {
    isPR: boolean;
    prId?: ID;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MERGED';
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

export interface IChapterDoc extends IChapter, Document {
  _id: Types.ObjectId;
}

export type TChapterNode = IChapter & { children: TChapterNode[] };
export type TChapterMap = Record<string, TChapterNode>;
