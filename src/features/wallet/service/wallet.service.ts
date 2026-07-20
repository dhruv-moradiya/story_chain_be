import { TOKENS } from '@/container';
import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { WalletRepository } from '../repositories/wallet.repository';

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
}
