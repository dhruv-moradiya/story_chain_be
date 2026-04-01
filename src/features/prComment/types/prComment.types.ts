import { Document, Types } from 'mongoose';
import { ID } from '@/types';

export interface IPRComment {
  _id: ID;
  pullRequestId: ID;
  storySlug: string; // denormalized
  userId: string; // clerkId

  /** null = top-level comment, set = reply to another comment */
  parentCommentId: ID | null;

  content: string; // 1–2000 chars

  // Edit tracking
  isEdited: boolean;
  editedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface IPRCommentDoc extends Document, IPRComment {
  _id: Types.ObjectId;
}
