import { Document, Types } from 'mongoose';
import { ID } from '@/types';

export interface ICommentVote {
  _id: ID;
  commentId: ID;
  userId: string;
  voteType: 'upvote' | 'downvote';
  createdAt: Date;
  updatedAt: Date;
}

export interface ICommentVoteDoc extends Document, ICommentVote {
  _id: Types.ObjectId;
}
