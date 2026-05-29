import { Document, Types } from 'mongoose';
import { ID } from '@/types';

// ========================================
// ROOT MODEL INTERFACE
// ========================================

export interface IChapterUnlock {
  _id: ID;

  userId: string;
  chapterSlug: string;
  storySlug: string;

  /** Coins paid at the time of unlock — snapshot in case coinPrice changes later */
  coinsPaid: number;

  /** Back-reference to the CoinTransaction that debited the coins */
  transactionId: ID;

  unlockedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChapterUnlockDoc extends Omit<IChapterUnlock, '_id' | 'transactionId'>, Document {
  _id: Types.ObjectId;
  transactionId: Types.ObjectId;
}
