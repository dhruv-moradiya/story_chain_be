import mongoose, { Schema } from 'mongoose';
import { XP_SOURCE_TYPES } from '@/constants/gamification.js';
import { IXpTransactionDoc } from '@features/xpTransaction/types/xpTransaction.types.js';

/**
 * Audit ledger for XP transactions.
 * Tracks all XP awarded, deducted, or pending cap checks.
 */
const xpTransactionSchema = new Schema<IXpTransactionDoc>(
  {
    userId: { type: String, required: true, ref: 'User', index: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true, index: true },
    sourceId: { type: String },
    sourceType: {
      type: String,
      enum: XP_SOURCE_TYPES,
    },
    status: {
      type: String,
      enum: ['pending', 'credited', 'rejected'],
      default: 'credited',
      index: true,
    },
    creditedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    strict: true,
  }
);

// Compound indexes for optimal performance on cap queries and history lookups
xpTransactionSchema.index({ userId: 1, createdAt: -1 });
xpTransactionSchema.index({ userId: 1, status: 1, createdAt: -1 });
xpTransactionSchema.index({ userId: 1, reason: 1, status: 1, createdAt: -1 });

const XpTransaction = mongoose.model<IXpTransactionDoc>('XpTransaction', xpTransactionSchema);

export { XpTransaction };
