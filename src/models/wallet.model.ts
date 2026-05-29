import mongoose, { Schema } from 'mongoose';
import { IWalletDoc } from '@features/wallet/types/wallet.types';

const walletSchema = new Schema<IWalletDoc>(
  {
    userId: { type: String, required: true, unique: true, ref: 'User', index: true },

    /** Spendable coins right now — must never go below 0 */
    balance: { type: Number, required: true, default: 0, min: 0 },

    // Lifetime stats — only ever incremented, never decremented
    totalEarned: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },

    /** Coins locked in pending WithdrawalRequests */
    pendingWithdrawal: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Wallet = mongoose.model<IWalletDoc>('Wallet', walletSchema);

export { Wallet };
