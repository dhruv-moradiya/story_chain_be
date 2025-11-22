import { Document, Types } from 'mongoose';
import { ID } from '../../types';

export interface IStorySettings {
  isPublic: boolean;
  allowBranching: boolean;
  requireApproval: boolean;
  allowComments: boolean;
  allowVoting: boolean;
  genre:
    | 'FANTASY'
    | 'SCI_FI'
    | 'MYSTERY'
    | 'ROMANCE'
    | 'HORROR'
    | 'THRILLER'
    | 'ADVENTURE'
    | 'DRAMA'
    | 'COMEDY'
    | 'OTHER';
  contentRating: 'GENERAL' | 'TEEN' | 'MATURE';
}

export interface IStoryStats {
  totalChapters: number;
  totalBranches: number;
  totalReads: number;
  totalVotes: number;
  uniqueContributors: number;
  averageRating: number;
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

  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'DELETED';

  trendingScore: number;
  lastActivityAt: Date;
  publishedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface IStoryDoc extends Document, IStory {
  _id: Types.ObjectId;
}

// ---------------------------------
// Service
// ---------------------------------
