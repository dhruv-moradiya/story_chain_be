import { ID } from '@/types';
import { TStoryCollaboratorRole } from '@features/storyCollaborator/types/storyCollaborator.types';
import { Document, Types } from 'mongoose';
import {
  STORY_CONTENT_RATINGS,
  STORY_GENRES,
  STORY_STATUSES,
  STORY_TIMELINE_ACTIONS,
} from './story-enum';

type TStoryGenre = (typeof STORY_GENRES)[number];
type TStoryContentRating = (typeof STORY_CONTENT_RATINGS)[number];
type TStoryStatus = (typeof STORY_STATUSES)[number];
type TStoryTimelineAction = (typeof STORY_TIMELINE_ACTIONS)[number];

interface IStorySettings {
  isPublic: boolean;
  allowBranching: boolean;
  requireApproval: boolean;
  allowComments: boolean;
  allowVoting: boolean;
  genres: TStoryGenre[];
  contentRating: TStoryContentRating;
}

interface IStoryStats extends Record<string, number> {
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

  // World & Gallery links
  worldId?: ID;
  moodboardImageIds: ID[];

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

// ─── Story Timeline ──────────────────────────────────────────────────────────

interface IStoryTimeline {
  _id: ID;
  storySlug: string;
  /**
   * The type of event that occurred.
   * Use `StoryTimelineAction` enum values.
   */
  action: TStoryTimelineAction;
  /**
   * The Clerk user ID of who triggered the event.
   * `null` for system-generated events.
   */
  performedBy: string | null;
  /**
   * Authoritative timestamp of the event.
   * Do NOT use `createdAt` — use this field for sorting.
   */
  performedAt: Date;
  /**
   * Action-specific context data.
   * Examples:
   *   - chapter_added: { chapterSlug, chapterTitle }
   *   - pr_merged:     { prId, chapterSlug }
   *   - collaborator_added: { targetUserId, role }
   */
  metadata: Record<string, unknown>;
}

interface IStoryTimelineDoc extends Document, IStoryTimeline {
  _id: Types.ObjectId;
}

export type {
  IStory,
  IStoryContext,
  IStoryDoc,
  IStorySettings,
  IStorySettingsWithImages,
  IStoryStats,
  IStoryTimeline,
  IStoryTimelineDoc,
  TStoryContentRating,
  TStoryGenre,
  TStoryStatus,
  TStoryTimelineAction,
};
