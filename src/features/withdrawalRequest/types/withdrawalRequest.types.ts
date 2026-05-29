import { Document, Types } from 'mongoose';
import { ID } from '@/types';
import {
  PAYOUT_METHODS,
  WITHDRAWAL_STATUSES,
  PayoutMethod,
  WithdrawalStatus,
} from './withdrawalRequest-enum';

// ========================================
// DERIVED TYPES
// ========================================

export type TPayoutMethod = (typeof PAYOUT_METHODS)[number];
export type TWithdrawalStatus = (typeof WITHDRAWAL_STATUSES)[number];

// ========================================
// EMBEDDED INTERFACES
// ========================================

export interface IPayoutDetails {
  // UPI
  upiId?: string;
  // Bank Transfer
  accountNumber?: string;
  ifscCode?: string;
  accountName?: string;
  bankName?: string;
}

// ========================================
// ROOT MODEL INTERFACE
// ========================================

export interface IWithdrawalRequest {
  _id: ID;
  userId: string;
  /** Number of coins to convert */
  coins: number;
  /** coins × 1 INR — always 1:1 */
  amountInr: number;

  // Payout Destination
  payoutMethod: TPayoutMethod;
  payoutDetails: IPayoutDetails;

  // Status & Admin
  status: TWithdrawalStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  adminNote?: string;

  // Razorpay Payout
  /** pout_xxxxxxxx */
  razorpayPayoutId?: string;
  /** fa_xxxxxxxx */
  razorpayFundAccountId?: string;
  razorpayPayoutStatus?: string;
  payoutInitiatedAt?: Date;
  payoutCompletedAt?: Date;
  payoutFailureReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface IWithdrawalRequestDoc extends Omit<IWithdrawalRequest, '_id'>, Document {
  _id: Types.ObjectId;
}

export { PayoutMethod, WithdrawalStatus };
