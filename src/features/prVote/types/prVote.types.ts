import { Document, Types } from 'mongoose';
import { ID } from '@/types';

export interface IPRVote {
  _id: ID;
  pullRequestId: ID;
  userId: string;
  vote: 1 | -1;
  createdAt: Date;
}

export interface IPRVoteDoc extends Document, IPRVote {
  _id: Types.ObjectId;
}
