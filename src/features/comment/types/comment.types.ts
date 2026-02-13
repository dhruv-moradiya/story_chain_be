import { Document, Types } from 'mongoose';
import { ID } from '@/types';

export interface IComment {
  _id: ID;
  chapterSlug: string;
  userId: string;
  parentCommentId?: ID | null;
  content: string;
  votes: {
    upvotes: number;
    downvotes: number;
  };
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  reportCount: number;
  createdAt: Date;
}

export interface ICommentDoc extends Document, IComment {
  _id: Types.ObjectId;
}
