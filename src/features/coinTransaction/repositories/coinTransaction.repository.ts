import { BaseRepository } from '@/utils/baseClass';
import { singleton } from 'tsyringe';
import { CoinTransaction } from '@models/coinTransaction.model';
import { ICoinTransaction, ICoinTransactionDoc } from '../types/coinTransaction.types';
import { IAppendLedgerEntryDTO } from '@/dto/coinTransaction.dto';
import { IOperationOptions } from '@/types';

@singleton()
export class CoinTransactionRepository extends BaseRepository<
  ICoinTransaction,
  ICoinTransactionDoc
> {
  constructor() {
    super(CoinTransaction);
  }

  /**
   * Appends an immutable ledger entry.
   * Never call update/delete on this collection — insert only.
   */
  async appendLedgerEntry(
    input: IAppendLedgerEntryDTO,
    options: IOperationOptions = {}
  ): Promise<ICoinTransaction> {
    return this.create({
      data: {
        userId: input.userId,
        type: input.type,
        direction: input.direction,
        amount: input.amount,
        coinOrderId: input.coinOrderId,
        note: input.note,
        balanceBefore: input.balanceBefore,
        balanceAfter: input.balanceAfter,
      },
      options: { session: options.session },
    });
  }
}
