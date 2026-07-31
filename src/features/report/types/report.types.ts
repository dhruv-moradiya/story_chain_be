import { Document, Types } from 'mongoose';
import { ID } from '@/types';
import {
  REPORT_REASONS,
  REPORT_TYPES,
  REPORT_STATUSES,
  REPORT_ACTIONS_TAKEN,
  ReportGovernanceLevel,
} from './report-enum';

type TReportType = (typeof REPORT_TYPES)[number];
type TReportReason = (typeof REPORT_REASONS)[number];
type TReportStatus = (typeof REPORT_STATUSES)[number];
type TReportActionTaken = (typeof REPORT_ACTIONS_TAKEN)[number];

interface IReport {
  _id: ID;

  // Who filed it
  reporterId: string;

  // What is being reported
  reportType: TReportType;
  relatedChapterSlug?: string;
  relatedCommentId?: ID;
  relatedUserId?: string;
  relatedStorySlug?: string;

  // Routing
  // STORY → handled by story owner/co_author/moderator first
  // PLATFORM → handled by PLATFORM_MODERATOR / SUPER_ADMIN
  // Note: reportType STORY and USER always have governanceLevel PLATFORM
  governanceLevel: ReportGovernanceLevel;

  // Report content
  reason: TReportReason;
  description: string;

  // Status & Workflow
  status: TReportStatus;

  // Who first opened (PENDING → UNDER_REVIEW) — distinct from who resolved it
  openedBy?: string;
  openedAt?: Date;

  // Who resolved or dismissed the report
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: string;
  actionTaken?: TReportActionTaken;

  // Escalation
  escalatedTo?: string;
  escalatedAt?: Date;
  escalationReason?: string;

  // Resulting ban links (set when a ban is issued from this report)
  storyBanId?: ID; // set when actionTaken === BAN_FROM_STORY
  banHistoryId?: ID; // set when actionTaken === GLOBAL_BAN

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

interface IReportDoc extends IReport, Document {
  _id: Types.ObjectId;
}

interface IReportPaginatedResponse {
  docs: IReport[];
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

// Populated References
export interface IPopulatedUserRef {
  clerkId: string;
  username: string;
  avatarUrl: string;
  email?: string;
}

export interface IPopulatedStoryRef {
  slug: string;
  title: string;
  creatorId: string;
  coverImage?: { url: string; publicId: string };
  status: string;
}

export interface IPopulatedChapterRef {
  slug: string;
  title: string;
  storySlug: string;
  chapterNumber?: number;
  authorId: string;
  status: string;
}

export interface IPopulatedCommentRef {
  _id: ID;
  content: string;
  chapterSlug: string;
  isDeleted: boolean;
  createdAt: Date;
  author?: IPopulatedUserRef;
}

export interface IBasePopulatedReport {
  _id: ID;
  governanceLevel: ReportGovernanceLevel;
  reason: TReportReason;
  description: string;
  status: TReportStatus;
  reporter?: IPopulatedUserRef;
  openedByUser?: IPopulatedUserRef;
  openedAt?: Date;
  resolvedByUser?: IPopulatedUserRef;
  resolvedAt?: Date;
  resolution?: string;
  actionTaken?: TReportActionTaken;
  escalatedToUser?: IPopulatedUserRef;
  escalatedAt?: Date;
  escalationReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserReportDetails extends IBasePopulatedReport {
  reportType: 'USER';
  targetUser?: IPopulatedUserRef;
  targetEntity?: IPopulatedUserRef;
}

export interface IStoryReportDetails extends IBasePopulatedReport {
  reportType: 'STORY';
  story?: IPopulatedStoryRef;
  targetEntity?: IPopulatedStoryRef;
}

export interface IChapterReportDetails extends IBasePopulatedReport {
  reportType: 'CHAPTER';
  story?: IPopulatedStoryRef;
  chapter?: IPopulatedChapterRef;
  targetEntity?: IPopulatedChapterRef;
}

export interface ICommentReportDetails extends IBasePopulatedReport {
  reportType: 'COMMENT';
  story?: IPopulatedStoryRef;
  chapter?: IPopulatedChapterRef;
  comment?: IPopulatedCommentRef;
  targetEntity?: IPopulatedCommentRef;
}

export type IPopulatedReportDetails =
  | IUserReportDetails
  | IStoryReportDetails
  | IChapterReportDetails
  | ICommentReportDetails;

export type {
  IReport,
  IReportDoc,
  TReportType,
  TReportReason,
  TReportStatus,
  TReportActionTaken,
  IReportPaginatedResponse,
};
