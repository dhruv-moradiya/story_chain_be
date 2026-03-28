import { Document, Types } from 'mongoose';
import { ID } from '@/types';

import { PR_COMMENT_TYPES } from './prComment-enum';
export type TPRCommentType = (typeof PR_COMMENT_TYPES)[number];

export interface IPRComment {
  _id: ID;
  pullRequestId: ID;
  storySlug: string; // denormalized
  userId: string; // clerkId
  parentCommentId: ID | null; // null = top-level, set = reply

  content: string; // 1–2000 chars

  commentType: TPRCommentType;

  // For suggestion type only
  suggestion?: {
    originalPassage: string; // exact text being flagged
    suggestedPassage: string; // proposed replacement
    context: string; // surrounding text to disambiguate
  };

  // Edit tracking
  isEdited: boolean;
  editedAt?: Date;

  // Resolution
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface IPRCommentDoc extends Document, IPRComment {
  _id: Types.ObjectId;
}
