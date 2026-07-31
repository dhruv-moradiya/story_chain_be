import { Document, Types } from 'mongoose';
import { ID } from '@/types';
import { BAN_TYPES } from './banHistory-enum';

type TBanType = (typeof BAN_TYPES)[number];

interface IBanHistory {
  _id: ID;

  userId: string; // Clerk ID of the banned user
  bannedBy: string; // Clerk ID of the moderator who issued the ban

  reason: string;
  reportId?: ID; // The report that led to this ban (optional)

  banType: TBanType;
  durationDays?: number; // undefined when banType === 'PERMANENT'
  expiresAt?: Date; // undefined when banType === 'PERMANENT'

  isActive: boolean;

  liftedAt?: Date;
  liftedBy?: string; // Clerk ID of user who lifted the ban
  liftedReason?: string;

  evidenceUrls: string[];
  internalNotes?: string;

  createdAt: Date;
  updatedAt: Date;
}

interface IBanHistoryDoc extends Document, IBanHistory {
  _id: Types.ObjectId;
}

export type { IBanHistory, IBanHistoryDoc, TBanType };
