import {
  TCoinTxDirection,
  TCoinTxType,
} from '@/features/coinTransaction/types/coinTransaction.types';
import { ID } from '@/types';

interface IAppendLedgerEntryDTO {
  userId: string;
  type: TCoinTxType;
  amount: number;
  direction: TCoinTxDirection;
  balanceBefore: number;
  balanceAfter: number;
  coinOrderId: ID;
  note: string;
}

export type { IAppendLedgerEntryDTO };
