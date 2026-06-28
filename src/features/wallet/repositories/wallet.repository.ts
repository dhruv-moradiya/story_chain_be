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
}
