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
  /** Required for purchase transactions; omit for non-order flows */
  coinOrderId?: ID;
  /** Set for CHAPTER_UNLOCK and related transaction types */
  chapterSlug?: string;
  /** Set for story-related transactions (chapter_unlock, story_pool_credit, platform_fee) */
  storySlug?: string;
  note: string;
}

export type { IAppendLedgerEntryDTO };
