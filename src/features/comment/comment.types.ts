import { Document, Types } from 'mongoose';

export interface IComment {
  _id: Types.ObjectId;
  chapterId: Types.ObjectId;
  userId: string;
  parentCommentId?: Types.ObjectId | null;
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
  updatedAt: Date;
}

export interface ICommentDoc extends Document<Types.ObjectId>, IComment {}
