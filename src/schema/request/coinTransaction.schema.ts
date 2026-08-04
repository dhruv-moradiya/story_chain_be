import { z } from 'zod';
import {
  COIN_TX_DIRECTIONS,
  COIN_TX_TYPES,
} from '@/features/coinTransaction/types/coinTransaction-enum';

export const GetMyCoinPurchasesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const GetAllCoinTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  type: z.enum(COIN_TX_TYPES).optional(),
  direction: z.enum(COIN_TX_DIRECTIONS).optional(),
  userId: z.string().optional(),
  search: z.string().optional(),
});

export type TGetMyCoinPurchasesQuerySchema = z.infer<typeof GetMyCoinPurchasesQuerySchema>;
export type TGetAllCoinTransactionsQuerySchema = z.infer<typeof GetAllCoinTransactionsQuerySchema>;
