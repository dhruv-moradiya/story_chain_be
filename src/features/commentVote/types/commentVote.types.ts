import { Document, Types } from 'mongoose';
import { ID } from '@/types';

export type TCommentVoteType = 'upvote' | 'downvote';

export interface ICommentVote {
  _id: ID;
  commentId: ID;
  userId: string;
  voteType: TCommentVoteType;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICommentVoteDoc extends Document, ICommentVote {
  _id: Types.ObjectId;
}

// Shape stored inside Redis hash  comment:{commentId}:votes
export interface ICommentVoteCounts {
  up: number;
  down: number;
}
