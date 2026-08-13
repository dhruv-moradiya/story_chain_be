import {
  TStoryCollaboratorRole,
  TStoryCollaboratorStatus,
} from '@/features/storyCollaborator/types/storyCollaborator.types';
import {
  IStory,
  IStorySettings,
  IStoryStats,
  TStoryContentRating,
  TStoryGenre,
  TStoryStatus,
} from '@features/story/types/story.types';

import { ILatestChaptersResponse } from './chapter.response.types';

// FOR STORY CARD DASHBORD
export interface IUserStories {
  title: string;
  slug: string;
  creatorId: string;
  status: TStoryStatus;
  tags: string[];
  trendingScore: number;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  contentRating: TStoryContentRating;
  genre: TStoryGenre[];
}

interface IStoryCreatorWithEmail {
  clerkId: string;
  email: string;
  username: string;
  avatar: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface IStoryCreator extends Omit<IStoryCreatorWithEmail, 'email'> {}

interface IStoryCollaboratorOverview {
  clerkId: string;
  username: string;
  avatar: string;
  email: string;
  role: TStoryCollaboratorRole;
  status: TStoryCollaboratorStatus;
}

export interface IStoryOverviewResponse extends Omit<
  IStory,
  '_id' | 'creatorId' | 'collaboratorIds' | 'createdAt' | 'updatedAt'
> {
  creator: IStoryCreator;
  collaborators: IStoryCollaboratorOverview[];
  latestChapters: ILatestChaptersResponse[];
}

interface IStoryWithCreator extends Omit<
  IStory,
  | '_id'
  | 'creatorId'
  | 'collaboratorIds'
  | 'settings'
  | 'cardImage'
  | 'trendingScore'
  | 'createdAt'
  | 'updatedAt'
> {
  collaborators: IStoryCollaboratorOverview[];
}

interface IStoryCollaboratorUser {
  clerkId: string;
  email: string;
  username: string;
  avatar: string;
}

interface IStoryCollaboratorDetailsResponse {
  role: TStoryCollaboratorRole;
  status: TStoryCollaboratorStatus;
  user: IStoryCollaboratorUser;
  invitedBy: IStoryCollaboratorUser | null;
  invitedAt: Date;
  updatedAt: Date;
}

export type { IStoryCollaboratorDetailsResponse, IStoryCreator, IStoryWithCreator };

// Domain validation types
export interface PublishValidationResult {
  canPublish: boolean;
  errors: string[];
}

export interface StatsUpdate {
  totalChapters?: number;
  totalBranches?: number;
  totalReads?: number;
  totalVotes?: number;
  uniqueContributors?: number;
  averageRating?: number;
}

export interface IUserStoryRole {
  role: TStoryCollaboratorRole | 'reader';
  roleStatus?: TStoryCollaboratorStatus | null;
}

// =====================
// EXPLORE STORIES
// =====================

export interface IExploreStory {
  _id: string;
  title: string;
  slug: string;
  creator: { username: string; clerkId: string };
  cardImage?: { url: string; publicId: string };
  genres: TStoryGenre[];
  createdAt: string;
}

// =====================
// ADMIN STORY TABLE
// =====================

export interface IAdminStoryCreator {
  clerkId: string;
  username: string;
  avatarUrl?: string;
  email: string;
}

export interface IAdminStoryCollaborator {
  _id?: string;
  role: TStoryCollaboratorRole;
  status: TStoryCollaboratorStatus;
  user?: {
    clerkId: string;
    username: string;
    avatarUrl?: string;
    email: string;
  };
}

export interface IAdminStoryPool {
  _id?: string;
  storySlug?: string;
  storyOwnerId?: string;
  balance: number;
  totalReceived: number;
  totalDistributed: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IAdminStoryChapterDetails {
  totalChapters: number;
  publishedChapters: number;
  draftChapters: number;
  rootChapters: number;
  totalReads: number;
  totalComments: number;
}

export interface IAdminStoryPullRequestDetails {
  totalPRs: number;
  pendingPRs: number;
  mergedPRs: number;
  rejectedPRs: number;
}

export interface IAdminStoryTableItem {
  _id: string;
  title: string;
  slug: string;
  description: string;
  coverImage?: {
    url: string;
    publicId: string;
  };
  cardImage?: {
    url: string;
    publicId: string;
  };
  creatorId: string;
  creator?: IAdminStoryCreator;
  status: TStoryStatus;
  settings: IStorySettings;
  stats: IStoryStats;
  tags: string[];
  trendingScore: number;
  lastActivityAt: Date | string;
  publishedAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  collaborators: IAdminStoryCollaborator[];
  storyPool: IAdminStoryPool;
  chapterDetails: IAdminStoryChapterDetails;
  pullRequestDetails: IAdminStoryPullRequestDetails;
}

export interface IPaginatedAdminStoryTable {
  docs: IAdminStoryTableItem[];
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

// =====================
// PUBLIC SEO & SITEMAP
// =====================

export interface IPublicStoryMeta {
  title: string;
  slug: string;
  description: string;
  status: string;
  cardImage?: { url: string; publicId: string };
  coverImage?: { url: string; publicId: string };
  creator: { username: string; clerkId: string };
  settings: { genres: string[] };
  stats: { totalChapters: number };
}

export interface IPublicStoryListItem {
  slug: string;
  updatedAt: string | Date;
}
