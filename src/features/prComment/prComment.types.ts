import { Document, Types } from 'mongoose';
import { ID } from '../../types';

export type PRCommentType = 'GENERAL' | 'SUGGESTION' | 'QUESTION' | 'APPROVAL' | 'REQUEST_CHANGES';

export interface IPRComment {
  _id: ID;
  pullRequestId: ID;
  userId: string;
  parentCommentId?: ID | null;
  content: string;
  commentType: PRCommentType;
  suggestion?: {
    line?: number;
    originalText?: string;
    suggestedText?: string;
  };
  isEdited: boolean;
  editedAt?: Date;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPRCommentDoc extends Document, IPRComment {
  _id: Types.ObjectId;
}
