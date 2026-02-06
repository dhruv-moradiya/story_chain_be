import { ID } from '..';
import {
  TStoryCollaboratorRole,
  TStoryCollaboratorStatus,
} from '@/features/storyCollaborator/types/storyCollaborator.types';
import {
  IStory,
  IStoryStats,
  TStoryContentRating,
  TStoryGenre,
} from '@features/story/types/story.types';

interface IStoryCreator {
  clerkId: string;
  email: string;
  username: string;
  avatar: string;
}

interface IGetStoryOverviewBySlugResponse {
  _id: ID;
  title: string;
  slug: string;
  description: string;
  coverImage?: {
    url: string;
    publicId: string;
  };
  tags: string[];
  creatorId: string;
  stats: IStoryStats;
  createdAt: Date;
  updatedAt: Date;
}

interface IStoryWithCreator extends Omit<
  IStory,
  | 'creatorId'
  | 'collaboratorIds'
  | 'settings'
  | 'cardImage'
  | 'trendingScore'
  | 'createdAt'
  | 'updatedAt'
> {
  creator: IStoryCreator;
  genres: TStoryGenre[];
  contentRating: TStoryContentRating;
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

export type {
  IGetStoryOverviewBySlugResponse,
  IStoryCollaboratorDetailsResponse,
  IStoryCreator,
  IStoryWithCreator,
};

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
