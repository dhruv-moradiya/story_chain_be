import { Document, Types } from 'mongoose';
import { ID } from '../../types';
import { TStoryCollaboratorRole } from '../storyCollaborator/storyCollaborator.types';

export enum StoryGenre {
  FANTASY = 'FANTASY',
  SCI_FI = 'SCI_FI',
  MYSTERY = 'MYSTERY',
  ROMANCE = 'ROMANCE',
  HORROR = 'HORROR',
  THRILLER = 'THRILLER',
  ADVENTURE = 'ADVENTURE',
  DRAMA = 'DRAMA',
  COMEDY = 'COMEDY',
  OTHER = 'OTHER',
}

export enum StoryContentRating {
  GENERAL = 'GENERAL',
  TEEN = 'TEEN',
  MATURE = 'MATURE',
}

export type TStoryGenre = keyof typeof StoryGenre;
export type TStoryContentRating = keyof typeof StoryContentRating;

export interface IStorySettings {
  isPublic: boolean;
  allowBranching: boolean;
  requireApproval: boolean;
  allowComments: boolean;
  allowVoting: boolean;
  genre: TStoryGenre;
  contentRating: TStoryContentRating;
}

export interface IStoryStats {
  totalChapters: number;
  totalBranches: number;
  totalReads: number;
  totalVotes: number;
  uniqueContributors: number;
  averageRating: number;
}

export enum StoryStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

export type TStoryStatus = keyof typeof StoryStatus;

export interface IStoryContext {
  storyId: string;
  creatorId: string;
  status: string;
  collaborators?: Array<{
    userId: string;
    role: TStoryCollaboratorRole;
  }>;
}

export interface IStory {
  _id: ID;
  title: string;
  slug: string;
  description: string;

  coverImage?: {
    url?: string;
    publicId?: string;
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

export interface IStoryDoc extends Document, IStory {
  _id: Types.ObjectId;
}
