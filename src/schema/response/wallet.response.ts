import { apiResponse, errorResponse } from './helpers';

export const WalletResponseSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    userId: { type: 'string' },
    balance: { type: 'number' },
    totalEarned: { type: 'number' },
    totalSpent: { type: 'number' },
    totalWithdrawn: { type: 'number' },
    pendingWithdrawal: { type: 'number' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const WalletSchema = {
  balance: {
    200: apiResponse(WalletResponseSchema, 'User wallet balance fetched successfully'),
    404: errorResponse('Wallet not found'),
    422: errorResponse('Invalid request parameters'),
  },
};
