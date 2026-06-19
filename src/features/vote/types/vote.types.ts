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
  chapterSlug: string;
  storySlug?: never;
}

export interface IStoryVote extends IVoteBase {
  storySlug: string;
  chapterSlug?: never;
}

export type IVote = IChapterVote | IStoryVote;

export interface IVoteDoc extends IVoteBase, Document {
  _id: Types.ObjectId;
  chapterSlug?: string;
  storySlug?: string;
}
