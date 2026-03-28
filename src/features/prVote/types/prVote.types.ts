import { Document, Types } from 'mongoose';
import { ID } from '@/types';

export type TPRVoteValue = 1 | -1;

export interface IPRVote {
  _id: ID;
  pullRequestId: ID;
  storySlug: string; // denormalized
  userId: string; // clerkId

  vote: TPRVoteValue; // 1 = upvote, -1 = downvote

  previousVote: TPRVoteValue | null; // null = never changed, set = was flipped
  changedAt: Date | null; // when vote was last flipped (null if never)

  createdAt: Date;
  updatedAt: Date;
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
