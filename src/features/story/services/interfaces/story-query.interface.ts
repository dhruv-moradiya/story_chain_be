import { IChapter } from '@/features/chapter/types/chapter.types';
import { IOperationOptions } from '@/types';
import {
  IPaginatedAdminStoryTable,
  IPublicStoryListItem,
  IPublicStoryMeta,
  IStoryOverviewResponse,
  IUserStories,
} from '@/types/response/story.response.types';

import { TAdminStoryTableQuerySchema } from '@/schema/request/story.schema';
import { IStory, IStorySettingsWithImages } from '../../types/story.types';

interface IStoryTreeResult {
  slug: string;
  chapters: IChapter[];
}

interface IStoryQueryService {
  // Basic getters (throws if not found)
  getBySlug(slug: string, options?: { fields?: string[] } & IOperationOptions): Promise<IStory>;

  // User-specific queries
  getAllByUserId(userId: string, options?: IOperationOptions): Promise<IUserStories[]>;
  getDraftsByUserId(userId: string, options?: IOperationOptions): Promise<IStory[]>;

  // Public queries
  getPublishedStories(options?: IOperationOptions): Promise<IStory[]>;
  getNewStories(options?: IOperationOptions): Promise<IStory[]>;
  listStories(options?: IOperationOptions): Promise<IStory[]>;
  getPublicStoryMeta(slug: string, options?: IOperationOptions): Promise<IPublicStoryMeta>;
  getPublishedStorySlugs(options?: IOperationOptions): Promise<IPublicStoryListItem[]>;

  // Story tree queries (throws if story not found)
  getStoryTreeBySlug(slug: string, userId: string): Promise<IStoryTreeResult>;

  // Overview and settings (throws if not found)
  getStoryOverviewBySlug(slug: string): Promise<IStoryOverviewResponse>;
  getStorySettingsBySlug(slug: string): Promise<IStorySettingsWithImages>;

  // Search
  searchStoriesByTitle(
    query?: string,
    creator?: string,
    fields?: string[],
    limit?: number,
    options?: IOperationOptions
  ): Promise<IStory[]>;
  searchStoriesByUserSlug(
    creator: string,
    fields?: string[],
    options?: IOperationOptions
  ): Promise<IStory[]>;
  // Super Admin queries
  getAdminStoriesTable(
    query?: Partial<TAdminStoryTableQuerySchema>,
    options?: IOperationOptions
  ): Promise<IPaginatedAdminStoryTable>;
}

export type { IStoryQueryService, IStoryTreeResult };
