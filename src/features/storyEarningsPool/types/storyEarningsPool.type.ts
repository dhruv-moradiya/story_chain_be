import { Document, Types } from 'mongoose';

export interface IStoryEarningsPool {
  storySlug: string;
  storyOwnerId: string;

  /** Coins sitting in escrow - available to distribute */
  balance: number;

  /** Running lifetime stats - append-only */
  totalReceived: number; // all coins ever credited from unlocks
  totalDistributed: number; // all coins ever paid out to collaborators

  createdAt: Date;
  updatedAt: Date;
}

export interface IStoryEarningsPoolDoc extends IStoryEarningsPool, Document {
  _id: Types.ObjectId;
}
