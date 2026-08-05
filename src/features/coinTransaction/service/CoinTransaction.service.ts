import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@/container/tokens';
import { CoinTransactionRepository } from '../repositories/coinTransaction.repository';
import { ICoinTransactionService } from '../interfaces/coinTransaction.service.interface';
import {
  TGetAllCoinTransactionsQuerySchema,
  TGetMyCoinPurchasesQuerySchema,
  TGetUserTransactionsQuerySchema,
} from '@/schema/request/coinTransaction.schema';
import {
  ICoinTransactionPaginatedResponse,
  IUserTransactionsWithSummaryResponse,
} from '@/types/response/coinTransaction.response.types';
import { CoinTransactionTransformer } from '@/transformer/coinTransaction.transformer';
import { formatPaginatedResponse } from '@/utils/helpter';

@singleton()
export class CoinTransactionService extends BaseModule implements ICoinTransactionService {
  constructor(
    @inject(TOKENS.CoinTransactionRepository)
    private readonly coinTxRepo: CoinTransactionRepository
  ) {
    super();
  }

  async getMyPurchases(
    userId: string,
    query: TGetMyCoinPurchasesQuerySchema
  ): Promise<ICoinTransactionPaginatedResponse> {
    const { page = 1, limit = 10 } = query;

    const { transactions, totalDocs } = await this.coinTxRepo.findUserPurchases(userId, {
      page,
      limit,
    });

    const docs = transactions.map((tx) => CoinTransactionTransformer.toResponseItem(tx));

    return formatPaginatedResponse(docs, totalDocs, page, limit);
  }

  async getAllTransactions(
    query: TGetAllCoinTransactionsQuerySchema
  ): Promise<ICoinTransactionPaginatedResponse> {
    const { page = 1, limit = 10, type, direction, userId, search } = query;

    const { transactions, totalDocs } = await this.coinTxRepo.findAllTransactions({
      page,
      limit,
      type,
      direction,
      userId,
      search,
    });

    const docs = transactions.map((tx) => CoinTransactionTransformer.toResponseItem(tx));

    return formatPaginatedResponse(docs, totalDocs, page, limit);
  }

  async getUserTransactions(
    userId: string,
    query: TGetUserTransactionsQuerySchema
  ): Promise<IUserTransactionsWithSummaryResponse> {
    const { type, direction, search } = query;

    const [summary, transactions] = await Promise.all([
      this.coinTxRepo.getUserFinancialSummary(userId),
      this.coinTxRepo.findUserTransactions(userId, {
        type,
        direction,
        search,
      }),
    ]);

    const docs = transactions.map((tx) => CoinTransactionTransformer.toResponseItem(tx));

    return {
      summary,
      transactions: docs,
    };
  }
}
