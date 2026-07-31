import { Document, Types } from 'mongoose';
import { ID } from '@/types';
import { STORY_BAN_ISSUER_ROLES } from './storyBan-enum';

type TStoryBanIssuerRole = (typeof STORY_BAN_ISSUER_ROLES)[number];

interface IStoryBan {
  _id: ID;

  storySlug: string;

  userId: string; // Clerk ID of the banned user

  bannedBy: string; // Clerk ID of the issuer
  bannedByRole: TStoryBanIssuerRole; // Role of issuer at the time of ban
  reason: string;
  reportId?: ID; // The report that triggered this ban (optional)

  isActive: boolean;
  expiresAt?: Date | null; // null = permanent story ban

  liftedAt?: Date;
  liftedBy?: string; // Clerk ID of user who lifted the ban
  liftedReason?: string;

  appealId?: ID; // Set when an appeal for this ban has been filed

  createdAt: Date;
  updatedAt: Date;
}

interface IStoryBanDoc extends Document, IStoryBan {
  _id: Types.ObjectId;
}

export type { IStoryBan, IStoryBanDoc, TStoryBanIssuerRole };
