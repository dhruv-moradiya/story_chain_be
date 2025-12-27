import { ID } from '..';
import {
  IStory,
  IStoryStats,
  TStoryContentRating,
  TStoryGenre,
} from '../../features/story/story.types';

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

export type { IGetStoryOverviewBySlugResponse, IStoryCreator, IStoryWithCreator };
