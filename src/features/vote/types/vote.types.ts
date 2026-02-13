import { Document, Types } from 'mongoose';
import { ID } from '@/types';

export interface IVoteBase {
  _id: ID;
  userId: string;
  vote: 1 | -1;
  createdAt: Date;
  updatedAt?: Date;
}

export interface IChapterVote extends IVoteBase {
  chapterId: ID;
  storyId?: never;
}

export interface IStoryVote extends IVoteBase {
  storyId: ID;
  chapterId?: never;
}

export type IVote = IChapterVote | IStoryVote;

export interface IVoteDoc extends IVoteBase, Document {
  _id: Types.ObjectId;
  chapterId?: ID;
  storyId?: ID;
}
