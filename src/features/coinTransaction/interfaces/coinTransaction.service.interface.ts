import {
  TGetAllCoinTransactionsQuerySchema,
  TGetMyCoinPurchasesQuerySchema,
} from '@/schema/request/coinTransaction.schema';
import { ICoinTransactionPaginatedResponse } from '@/types/response/coinTransaction.response.types';

export interface ICoinTransactionService {
  getMyPurchases(
    userId: string,
    query: TGetMyCoinPurchasesQuerySchema
  ): Promise<ICoinTransactionPaginatedResponse>;
  getAllTransactions(
    query: TGetAllCoinTransactionsQuerySchema
  ): Promise<ICoinTransactionPaginatedResponse>;
}
