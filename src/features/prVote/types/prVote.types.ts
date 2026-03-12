import { Document, Types } from 'mongoose';
import { ID } from '@/types';

export type TPRVoteValue = 1 | -1;

export interface IPRVote {
  _id: ID;
  pullRequestId: ID;
  userId: string;
  vote: TPRVoteValue;
  createdAt: Date;
}

export interface IPRVoteDoc extends Document, IPRVote {
  _id: Types.ObjectId;
}

export interface IPRVoteSummary {
  pullRequestId: ID;
  upvotes: number;
  downvotes: number;
  score: number;
  totalVotes: number;
  currentUserVote: TPRVoteValue | null;
}

export interface ICurrentUserPRVote {
  pullRequestId: ID;
  vote: TPRVoteValue | null;
}

export interface IPRVoteMutationResult {
  currentVote: TPRVoteValue | null;
  previousVote: TPRVoteValue | null;
  changed: boolean;
}
