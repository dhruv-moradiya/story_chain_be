import { IStory } from '@features/story/types/story.types';
import {
  TStoryCollaboratorRole,
  TStoryCollaboratorStatus,
} from '@/features/storyCollaborator/types/storyCollaborator.types';
import { ILatestChaptersResponse } from './chapter.response.types';

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
  'creatorId' | 'collaboratorIds' | 'createdAt' | 'updatedAt'
> {
  creator: IStoryCreator;
  collaborators: IStoryCollaboratorOverview[];
  latestChapters: ILatestChaptersResponse[];
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
