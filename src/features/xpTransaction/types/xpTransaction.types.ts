import { Document } from 'mongoose';
import { XpRewardReason, XpSourceType } from './xpTransaction-enum.js';
import { XPRewardKey, XPSourceType } from '@/constants/gamification.js';

export type TXpTransactionStatus = 'pending' | 'credited' | 'rejected';

export interface IXpTransaction {
  userId: string;
  amount: number;
  reason: XpRewardReason | XPRewardKey | string;
  sourceId?: string;
  sourceType?: XpSourceType | XPSourceType | string;
  status: TXpTransactionStatus;
  creditedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IXpTransactionDoc extends IXpTransaction, Document {}

export interface ICreateXpTransactionDTO {
  userId: string;
  amount: number;
  reason: XpRewardReason | XPRewardKey | string;
  sourceId?: string;
  sourceType?: XpSourceType | XPSourceType | string;
  status?: TXpTransactionStatus;
  creditedAt?: Date;
}
