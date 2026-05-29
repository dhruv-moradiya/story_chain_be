import mongoose, { Schema } from 'mongoose';
import { ICoinTransactionDoc } from '@features/coinTransaction/types/coinTransaction.types';
import {
  COIN_TX_TYPES,
  COIN_TX_DIRECTIONS,
} from '@features/coinTransaction/types/coinTransaction-enum';

/**
 * Append-only ledger. Never update or delete rows — only insert.
 * Direction is always implied by the type, but stored explicitly for fast filtering.
 */
const coinTransactionSchema = new Schema<ICoinTransactionDoc>(
  {
    userId: { type: String, required: true, ref: 'User', index: true },
    type: { type: String, enum: COIN_TX_TYPES, required: true },
    /** Always a positive number */
    amount: { type: Number, required: true },
    direction: { type: String, enum: COIN_TX_DIRECTIONS, required: true },

    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },

    // Context refs
    coinOrderId: { type: Schema.Types.ObjectId, ref: 'CoinOrder' },
    withdrawalRequestId: { type: Schema.Types.ObjectId, ref: 'WithdrawalRequest' },
    chapterSlug: { type: String },
    storySlug: { type: String },
    referredUserId: { type: String, ref: 'User' },
    couponId: { type: Schema.Types.ObjectId, ref: 'Coupon' },

    note: { type: String, maxlength: 300 },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    // Prevent accidental updates to this collection
    strict: true,
  }
);

// Indexes
coinTransactionSchema.index({ userId: 1, createdAt: -1 }); // user history
coinTransactionSchema.index({ type: 1, createdAt: -1 }); // admin analytics
coinTransactionSchema.index({ coinOrderId: 1 }); // lookup by order
coinTransactionSchema.index({ chapterSlug: 1 }); // earnings per chapter

const CoinTransaction = mongoose.model<ICoinTransactionDoc>(
  'CoinTransaction',
  coinTransactionSchema
);

export { CoinTransaction };
