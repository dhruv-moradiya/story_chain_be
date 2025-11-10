import { Document, Types } from 'mongoose';
import { z } from 'zod';
import { IPullRequest, PRType } from '../pullRequest/pullRequest.types';
import { IStory } from '../story/story.types';
import { Badge } from '../user/user.types';
import {
  createChapterSchema,
  updateChapterContentSchema,
  updateChapterTitleSchema,
} from './chapter.validation';

// ========================================
// MODEL TYPES
// ========================================

/**
 * Represents a single chapter within a story.
 */
export interface IChapter {
  _id: Types.ObjectId;
  storyId: Types.ObjectId;

  parentChapterId?: Types.ObjectId | null;
  ancestorIds: Types.ObjectId[];
  depth: number;
  authorId: string;
  content: string;
  title?: string;
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
    prId?: Types.ObjectId;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MERGED';
    submittedAt?: Date;
    reviewedBy?: Types.ObjectId;
    reviewedAt?: Date;
    rejectionReason?: string;
  };

  version: number;
  previousVersionId?: Types.ObjectId;

  stats: {
    reads: number;
    comments: number;
    childBranches: number; // Number of child chapters (forks)
  };

  reportCount: number;
  isFlagged: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChapterDoc extends IChapter, Document<Types.ObjectId> {}

// ========================================
// SERVICE TYPES
// ========================================

/**
 * Input data for creating a new chapter.
 */
export type IChapterCreateInput = z.infer<typeof createChapterSchema> & { userId: string };

export type IChapterTitleUpdateInput = z.infer<typeof updateChapterTitleSchema> & {
  userId: string;
  chapterId: string;
};

export type IChapterContentUpdateInput = z.infer<typeof updateChapterContentSchema> & {
  userId: string;
  chapterId: string;
};

/**
 * Tree data used to define a chapter’s position in the story.
 */
export interface IChapterTreeMetadata {
  ancestorIds: Types.ObjectId[];
  depth: number;
  isRootChapter: boolean;
  parentChapter: IChapter | null;
}

/**
 * Internal helper structure used when building a chapter tree.
 */
export interface IChapterTreeBuilderParams {
  storyId: string;
  parentChapterId?: string;
  userId: string;
  storyCreatorId: string;
}

/**
 * Defines how a chapter should be published (direct or via PR).
 */
export interface IChapterPublishMode {
  chapterStatus: IChapter['status'];
  isPR: boolean;
}

/**
 * Combined data object for building a new chapter with all dependencies resolved.
 */
export type ChapterBuildContext = IChapterCreateInput &
  IChapterTreeMetadata &
  IChapterPublishMode & {
    chapterStatus: IChapter['status'];
  };

/**
 * Input for direct publishing (bypassing pull requests).
 * 💡 Suggested name: `ChapterIChapterDirectPublishInput`
 */
export interface IChapterDirectPublishInput {
  chapter: IChapter;
  story: IStory;
  treeData: IChapterTreeMetadata;
  userId: string;
  parentChapterId?: string;
}

export interface IPRTitleInput {
  prType: PRType;
  chapterTitle?: string;
  chapterNumber?: number;
  summary?: string;
}

/**
 * Response object returned after successful direct publish.
 */
export interface IChapterDirectPublishResult {
  success: boolean;
  isPR: boolean;
  message: string;
  chapter: Record<string, unknown>;
  xpAwarded: number;
  badgesEarned: Badge[];
  stats: {
    totalChapters: number;
    depth: number;
    isRoot: boolean;
  };
}

/**
 * PR Publish mode to create new PR
 */
export interface IChapterPRPublishHandler {
  chapter: IChapter;
  story: IStory;
  parentChapter: IChapter;
  userId: string;
  content: string;
  title: string;
}

export interface INotifyModeratorsParams {
  story: IStory;
  pullRequestId: Types.ObjectId;
  userId: string;
}

// ========================================
// RESPONSE TYPES
// ========================================

/**
 * Response sent when a chapter is submitted as a Pull Request.
 */
export interface IChapterPullRequestResponse {
  success: true;
  isPR: true;
  message: string;
  pullRequest: IPullRequest;
  chapter: {
    _id: Types.ObjectId;
    status: 'PENDING_APPROVAL';
  };
}

/**
 * Union type for both publish modes — PR and direct publish.
 */
export type CreateChapterResponse = IChapterDirectPublishResult | IChapterPullRequestResponse;
