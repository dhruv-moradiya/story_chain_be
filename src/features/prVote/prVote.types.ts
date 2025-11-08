import { Document, Types } from 'mongoose';

export interface IPRVote {
  _id: Types.ObjectId;
  pullRequestId: Types.ObjectId;
  userId: string;
  vote: 1 | -1;
  createdAt: Date;
}

export interface IPRVoteDoc extends Document<Types.ObjectId>, IPRVote {}
