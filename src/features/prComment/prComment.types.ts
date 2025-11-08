import { Document, Types } from 'mongoose';

export type PRCommentType = 'GENERAL' | 'SUGGESTION' | 'QUESTION' | 'APPROVAL' | 'REQUEST_CHANGES';

export interface IPRComment {
  _id: Types.ObjectId;
  pullRequestId: Types.ObjectId;
  userId: string;
  parentCommentId?: Types.ObjectId | null;
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

export interface IPRCommentDoc extends Document<Types.ObjectId>, IPRComment {}
