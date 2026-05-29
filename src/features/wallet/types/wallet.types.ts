import { Document, Types } from 'mongoose';

// ========================================
// ROOT MODEL INTERFACE
// ========================================

export interface IWallet {
  _id: string; // userId doubles as the document identifier concept
  userId: string;

  /** Spendable coins right now */
  balance: number;

  // Lifetime stats — never decremented
  totalEarned: number;
  totalSpent: number;
  totalWithdrawn: number;

  /** Coins locked in pending WithdrawalRequests */
  pendingWithdrawal: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface IWalletDoc extends Omit<IWallet, '_id'>, Document {
  _id: Types.ObjectId;
}
