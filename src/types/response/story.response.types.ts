import { ID } from '..';
import {
  IStory,
  IStoryStats,
  TStoryContentRating,
  TStoryGenre,
} from '../../features/story/story.types';
import {
  TStoryCollaboratorRole,
  TStoryCollaboratorStatus,
} from '../../features/storyCollaborator/storyCollaborator.types';

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

interface IStoryWithCreator
  extends Omit<
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
  generes: TStoryGenre;
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
