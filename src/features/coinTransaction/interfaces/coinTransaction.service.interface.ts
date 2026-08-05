import {
  TGetAllCoinTransactionsQuerySchema,
  TGetMyCoinPurchasesQuerySchema,
  TGetUserTransactionsQuerySchema,
} from '@/schema/request/coinTransaction.schema';
import {
  ICoinTransactionPaginatedResponse,
  IUserTransactionsWithSummaryResponse,
} from '@/types/response/coinTransaction.response.types';

export interface ICoinTransactionService {
  getMyPurchases(
    userId: string,
    query: TGetMyCoinPurchasesQuerySchema
  ): Promise<ICoinTransactionPaginatedResponse>;
  getAllTransactions(
    query: TGetAllCoinTransactionsQuerySchema
  ): Promise<ICoinTransactionPaginatedResponse>;
  getUserTransactions(
    userId: string,
    query: TGetUserTransactionsQuerySchema
  ): Promise<IUserTransactionsWithSummaryResponse>;
}
