import { ID } from '@/types';
import { TStoryCollaboratorRole } from '@features/storyCollaborator/types/storyCollaborator.types';
import { Document, Types } from 'mongoose';
import { STORY_CONTENT_RATINGS, STORY_GENRES, STORY_STATUSES } from './story-enum';

type TStoryGenre = (typeof STORY_GENRES)[number];
type TStoryContentRating = (typeof STORY_CONTENT_RATINGS)[number];
type TStoryStatus = (typeof STORY_STATUSES)[number];

interface IStorySettings {
  isPublic: boolean;
  allowBranching: boolean;
  requireApproval: boolean;
  allowComments: boolean;
  allowVoting: boolean;
  genres: TStoryGenre[];
  contentRating: TStoryContentRating;
}

interface IStoryStats {
  totalChapters: number;
  totalBranches: number;
  totalReads: number;
  totalVotes: number; // Keep for backward compatibility or alias
  upvotes: number;
  downvotes: number;
  score: number;
  uniqueContributors: number;
  averageRating: number;
}

interface IStoryContext {
  storySlug: string;
  creatorId: string;
  status: string;
  collaborators?: Array<{
    userId: string;
    role: TStoryCollaboratorRole;
  }>;
}

interface IStory {
  _id: ID;
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

  settings: IStorySettings;
  stats: IStoryStats;

  tags: string[];

  status: TStoryStatus;

  trendingScore: number;
  lastActivityAt: Date;
  publishedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

interface IStoryDoc extends Document, IStory {
  _id: Types.ObjectId;
}

interface IStorySettingsWithImages {
  settings: IStorySettings;
  coverImage?: IStory['coverImage'];
  cardImage?: IStory['cardImage'];
}

export type {
  IStory,
  IStoryContext,
  IStoryDoc,
  IStorySettings,
  IStorySettingsWithImages,
  IStoryStats,
  TStoryContentRating,
  TStoryGenre,
  TStoryStatus,
};
