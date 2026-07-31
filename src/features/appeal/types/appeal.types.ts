import { Document, Types } from 'mongoose';
import { ID } from '@/types';
import {
  APPEAL_PRIORITIES,
  APPEAL_REVIEW_DECISIONS,
  APPEAL_SCOPES,
  APPEAL_STATUSES,
} from './appeal-enum';

// Mirrors the pattern used in story.types.ts / chapter.types.ts

type TAppealScope = (typeof APPEAL_SCOPES)[number];
type TAppealStatus = (typeof APPEAL_STATUSES)[number];
type TAppealPriority = (typeof APPEAL_PRIORITIES)[number];
type TAppealReviewDecision = (typeof APPEAL_REVIEW_DECISIONS)[number];

interface IAppeal {
  _id: ID;

  appealScope: TAppealScope;

  userId: string; // Clerk ID

  banHistoryId?: ID; // set when appealScope === 'PLATFORM'
  storyBanId?: ID; // set when appealScope === 'STORY'
  storySlug?: string; // set when appealScope === 'STORY'

  appealReason: string;
  explanation: string;
  evidenceUrls: string[];

  status: TAppealStatus;
  priority: TAppealPriority;

  assignedTo?: string; // Clerk ID of assigned moderator
  assignedAt?: Date;

  reviewedBy?: string; // Clerk ID of reviewer
  reviewedAt?: Date;
  reviewDecision?: TAppealReviewDecision;
  reviewNotes?: string;
  internalNotes?: string;

  escalatedTo?: string; // Clerk ID of escalation target
  escalatedAt?: Date;
  escalationReason?: string;

  responseMessage?: string;

  responseTimeMs?: number;
  reviewCount: number;

  createdAt: Date;
  updatedAt: Date;
}

interface IAppealDoc extends Document, IAppeal {
  _id: Types.ObjectId;
}

export type {
  IAppeal,
  IAppealDoc,
  TAppealScope,
  TAppealStatus,
  TAppealPriority,
  TAppealReviewDecision,
};
