import { Document, Types } from 'mongoose';

export interface IVote {
  _id: Types.ObjectId;
  chapterId: Types.ObjectId;
  userId: string;
  vote: 1 | -1;
  createdAt: Date;
  updatedAt?: Date;
}

export interface IVoteDoc extends IVote, Document<Types.ObjectId> {}
