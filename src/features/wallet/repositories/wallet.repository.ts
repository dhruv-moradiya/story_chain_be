import { BaseRepository } from '@/utils/baseClass';
import { singleton } from 'tsyringe';
import { Wallet } from '@models/wallet.model';
import { IWallet, IWalletDoc } from '../types/wallet.types';
import { IOperationOptions } from '@/types';

@singleton()
export class WalletRepository extends BaseRepository<IWallet, IWalletDoc> {
  constructor() {
    super(Wallet);
  }

  /**
   * Atomically credits coins to a user's wallet.
   * Creates the wallet document if it doesn't exist yet ($setOnInsert).
   * Returns the updated wallet (post-increment).
   */
  async creditCoins(
    userId: string,
    amount: number,
    options: IOperationOptions = {}
  ): Promise<IWallet | null> {
    return this.model
      .findOneAndUpdate(
        { userId },
        {
          $inc: { balance: amount, totalEarned: amount },
          $setOnInsert: { userId, totalSpent: 0, totalWithdrawn: 0, pendingWithdrawal: 0 },
        },
        { new: true, upsert: true, session: options.session ?? null }
      )
      .lean<IWallet>()
      .exec();
  }
  /**
   * Atomically deducts coins from a user's wallet, creating the wallet first if missing.
   * Fails silently if balance would drop below zero, returning null.
   */
  async debitCoins(
    userId: string,
    amount: number,
    options: IOperationOptions = {}
  ): Promise<IWallet | null> {
    const session = options.session ?? null;

    const wallet = await this.model
      .findOneAndUpdate(
        { userId },
        [
          {
            $set: {
              balance: { $max: [0, { $subtract: ['$balance', amount] }] },
              totalSpent: { $add: ['$totalSpent', amount] },
            },
          },
        ],
        { new: true, upsert: true, session }
      )
      .lean<IWallet>()
      .exec();

    // If the effective deduction was zero, the balance didn't change (because it was already 0).
    // We return null to indicate that the operation couldn't be completed.
    if (wallet.balance === 0 && amount > 0) {
      return null;
    }

    return wallet;
  }

  /**
   * Gets the current user's wallet.
   */
  async getCurrentUserWallet(
    userId: string,
    options: IOperationOptions = {}
  ): Promise<IWallet | null> {
    return this.model.findOne({ userId }, null, { session: options.session ?? undefined });
  }
}
