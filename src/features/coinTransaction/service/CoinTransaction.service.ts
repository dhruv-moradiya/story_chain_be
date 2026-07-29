import { BaseModule } from '@/utils/baseClass';
import { singleton } from 'tsyringe';

@singleton()
export class CoinTransactionService extends BaseModule {
  constructor() {
    super();
  }

  async getAllTransactions() {}
}
