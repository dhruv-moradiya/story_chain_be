import { ICoinTransaction } from '@/features/coinTransaction/types/coinTransaction.types';
import { IPublicUserResponseWithEmail } from './user.response.types';

export interface ICoinOrderSummaryResponse {
  _id: string;
  bundleslug?: string;
  totalCoins?: number;
  baseCoins?: number;
  bonusCoins?: number;
  currency?: string;
  finalAmount?: number;
  razorpayOrderId?: string;
  status?: string;
}

export interface ICoinTransactionResponse extends Omit<
  ICoinTransaction,
  '_id' | 'coinOrderId' | 'withdrawalRequestId' | 'couponId' | 'createdAt' | 'updatedAt'
> {
  _id: string;
  coinOrderId?: string;
  withdrawalRequestId?: string;
  couponId?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  order?: ICoinOrderSummaryResponse | null;
  user?: IPublicUserResponseWithEmail | null;
}

export interface ICoinTransactionPaginatedResponse {
  docs: ICoinTransactionResponse[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

export interface IUserWalletFinancialSummary {
  currentCoinBalance: number;
  totalCoinsPurchased: number;
  totalCoinsSpent: number;
  totalAmountSpent: number;
  totalWithdrawn: number;
  pendingWithdrawals: number;
}

export interface IUserTransactionsWithSummaryResponse {
  summary: IUserWalletFinancialSummary;
  transactions: ICoinTransactionResponse[];
}
