import { apiPaginatedResponse, apiResponse } from './helpers';
import {
  COIN_TX_DIRECTIONS,
  COIN_TX_TYPES,
} from '@/features/coinTransaction/types/coinTransaction-enum';

export const CoinOrderSummarySchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    bundleslug: { type: 'string' },
    totalCoins: { type: 'number' },
    baseCoins: { type: 'number' },
    bonusCoins: { type: 'number' },
    currency: { type: 'string' },
    finalAmount: { type: 'number' },
    razorpayOrderId: { type: 'string' },
    status: { type: 'string' },
  },
};

export const CoinTransactionSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    userId: { type: 'string' },
    type: { type: 'string', enum: COIN_TX_TYPES },
    amount: { type: 'number' },
    direction: { type: 'string', enum: COIN_TX_DIRECTIONS },
    balanceBefore: { type: 'number' },
    balanceAfter: { type: 'number' },
    coinOrderId: { type: 'string' },
    withdrawalRequestId: { type: 'string' },
    chapterSlug: { type: 'string' },
    storySlug: { type: 'string' },
    referredUserId: { type: 'string' },
    couponId: { type: 'string' },
    note: { type: 'string' },
    metadata: { type: 'object', additionalProperties: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    order: {
      type: 'object',
      nullable: true,
      properties: CoinOrderSummarySchema.properties,
    },
    user: {
      type: 'object',
      nullable: true,
      properties: {
        clerkId: { type: 'string' },
        username: { type: 'string' },
        email: { type: 'string' },
        avatarUrl: { type: 'string' },
      },
    },
  },
};

export const WalletFinancialSummarySchema = {
  type: 'object',
  properties: {
    currentCoinBalance: { type: 'number' },
    totalCoinsPurchased: { type: 'number' },
    totalCoinsSpent: { type: 'number' },
    totalAmountSpent: { type: 'number' },
    totalWithdrawn: { type: 'number' },
    pendingWithdrawals: { type: 'number' },
  },
  required: [
    'currentCoinBalance',
    'totalCoinsPurchased',
    'totalCoinsSpent',
    'totalAmountSpent',
    'totalWithdrawn',
    'pendingWithdrawals',
  ],
};

export const UserTransactionsWithSummarySchema = {
  type: 'object',
  properties: {
    summary: WalletFinancialSummarySchema,
    transactions: {
      type: 'array',
      items: CoinTransactionSchema,
    },
  },
  required: ['summary', 'transactions'],
};

export const CoinTransactionResponses = {
  coinTransactionList: {
    200: apiPaginatedResponse(CoinTransactionSchema, 'Paginated list of coin transactions'),
  },
  userTransactionsWithSummary: {
    200: apiResponse(
      UserTransactionsWithSummarySchema,
      'User transaction list with wallet & financial summary'
    ),
  },
};
