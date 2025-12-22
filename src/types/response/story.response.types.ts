import { ID } from '..';
import { IStoryStats } from '../../features/story/story.types';

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

export type { IGetStoryOverviewBySlugResponse };
