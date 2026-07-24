import { TOKENS } from '@/container';
import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { WalletRepository } from '../repositories/wallet.repository';
import { IOperationOptions } from '@/types';

@singleton()
export class WalletService extends BaseModule {
  constructor(
    @inject(TOKENS.WalletRepository) private readonly walletRepository: WalletRepository
  ) {
    super();
  }

  async getWalletByUserId(userId: string) {
    const wallet = await this.walletRepository.getCurrentUserWallet(userId);

    if (!wallet) {
      throw this.throwNotFoundError('Wallet not found.');
    }

    return wallet;
  }

  async createEmptyWallet(userId: string, options: IOperationOptions = {}) {
    try {
      const wallet = await this.walletRepository.createWallet(userId, options);
      return wallet;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: number }).code === 11000
      ) {
        return await this.walletRepository.getCurrentUserWallet(userId, options);
      }
      throw error;
    }
  }
}
