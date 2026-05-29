import mongoose, { Schema } from 'mongoose';
import { IWithdrawalRequestDoc } from '@features/withdrawalRequest/types/withdrawalRequest.types';
import {
  PAYOUT_METHODS,
  WITHDRAWAL_STATUSES,
} from '@features/withdrawalRequest/types/withdrawalRequest-enum';

// ── Payout Details sub-schema ─────────────────────────────────────────────────
const payoutDetailsSchema = new Schema(
  {
    // UPI
    upiId: { type: String, maxlength: 100 },
    // Bank Transfer
    accountNumber: { type: String, maxlength: 30 },
    ifscCode: { type: String, maxlength: 15 },
    accountName: { type: String, maxlength: 100 },
    bankName: { type: String, maxlength: 100 },
  },
  { _id: false }
);

// ── Root Schema ───────────────────────────────────────────────────────────────
const withdrawalRequestSchema = new Schema<IWithdrawalRequestDoc>(
  {
    userId: { type: String, required: true, ref: 'User', index: true },
    coins: { type: Number, required: true, min: 1 },
    amountInr: { type: Number, required: true },

    // Payout Destination
    payoutMethod: { type: String, enum: PAYOUT_METHODS, required: true },
    payoutDetails: { type: payoutDetailsSchema, required: true },

    // Status & Admin Review
    status: { type: String, enum: WITHDRAWAL_STATUSES, default: 'pending', index: true },
    reviewedBy: { type: String, ref: 'User' },
    reviewedAt: { type: Date },
    rejectionReason: { type: String, maxlength: 500 },
    adminNote: { type: String, maxlength: 500 },

    // Razorpay Payout
    razorpayPayoutId: { type: String },
    razorpayFundAccountId: { type: String },
    razorpayPayoutStatus: { type: String },
    payoutInitiatedAt: { type: Date },
    payoutCompletedAt: { type: Date },
    payoutFailureReason: { type: String, maxlength: 300 },
  },
  { timestamps: true }
);

// Indexes
withdrawalRequestSchema.index({ userId: 1, createdAt: -1 });
withdrawalRequestSchema.index({ status: 1, createdAt: 1 }); // admin queue — oldest first
withdrawalRequestSchema.index({ razorpayPayoutId: 1 }, { sparse: true });

const WithdrawalRequest = mongoose.model<IWithdrawalRequestDoc>(
  'WithdrawalRequest',
  withdrawalRequestSchema
);

export { WithdrawalRequest };
