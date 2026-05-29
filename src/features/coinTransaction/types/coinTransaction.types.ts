import { Document, Types } from 'mongoose';
import { ID } from '@/types';
import {
  COIN_TX_TYPES,
  COIN_TX_DIRECTIONS,
  CoinTxType,
  CoinTxDirection,
} from './coinTransaction-enum';

// ========================================
// DERIVED TYPES
// ========================================

export type TCoinTxType = (typeof COIN_TX_TYPES)[number];
export type TCoinTxDirection = (typeof COIN_TX_DIRECTIONS)[number];

// ========================================
// ROOT MODEL INTERFACE
// ========================================

export interface ICoinTransaction {
  _id: ID;
  userId: string;
  type: TCoinTxType;
  /** Always positive — direction indicates credit or debit */
  amount: number;
  direction: TCoinTxDirection;

  /** wallet.balance snapshot before this transaction */
  balanceBefore: number;
  /** wallet.balance snapshot after this transaction */
  balanceAfter: number;

  // Context refs — only the relevant fields are set per transaction type
  coinOrderId?: ID;
  withdrawalRequestId?: ID;
  /** Set for CHAPTER_UNLOCK and CHAPTER_EARN */
  chapterSlug?: string;
  /** Set for story-related transactions */
  storySlug?: string;
  /** Set for REFERRAL_REWARD */
  referredUserId?: string;
  couponId?: ID;

  /** Human-readable reason */
  note?: string;
  /** Extra context, e.g. roleShare breakdown for CHAPTER_EARN */
  metadata?: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}

export interface ICoinTransactionDoc extends Omit<ICoinTransaction, '_id'>, Document {
  _id: Types.ObjectId;
  coinOrderId?: Types.ObjectId;
  withdrawalRequestId?: Types.ObjectId;
  couponId?: Types.ObjectId;
}

export { CoinTxType, CoinTxDirection };
