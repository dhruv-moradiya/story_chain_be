import { Document, Types } from 'mongoose';
import { ID } from '@/types';

export interface IVote {
  _id: ID;
  chapterId: ID;
  userId: string;
  vote: 1 | -1;
  createdAt: Date;
  updatedAt?: Date;
}

export interface IVoteDoc extends IVote, Document {
  _id: Types.ObjectId;
}
