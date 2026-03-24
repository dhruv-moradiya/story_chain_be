import {
  TStoryCollaboratorRole,
  TStoryCollaboratorStatus,
} from '@/features/storyCollaborator/types/storyCollaborator.types';
import {
  IStory,
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
