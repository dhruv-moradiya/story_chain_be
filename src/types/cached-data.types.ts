import {
  TStoryCollaboratorRole,
  TStoryCollaboratorStatus,
} from '@/features/storyCollaborator/types/storyCollaborator.types';
import { TStoryStatus } from '../features/story/types/story.types';

export interface IStoryAggregateCache {
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
  tags: string[];
  status: TStoryStatus;
  trendingScore: number;
  lastActivityAt: Date;
  publishedAt: Date;
}

export interface IStoryCollaboratorCache {
  userId: string;
  role: TStoryCollaboratorRole;
  status: TStoryCollaboratorStatus;
}
