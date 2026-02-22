import { IOperationOptions } from '@/types';
import { IStoryWithCreator } from '@/types/response/story.response.types';
import { IChapter } from '@/features/chapter/types/chapter.types';
import { IStory, IStorySettingsWithImages } from '../../types/story.types';

interface IStoryTreeResult {
  slug: string;
  chapters: IChapter[];
}

interface IStoryQueryService {
  // Basic getters (throws if not found)
  getBySlug(slug: string, options?: IOperationOptions): Promise<IStory>;

  // User-specific queries
  getAllByUserId(userId: string, options?: IOperationOptions): Promise<IStory[]>;
  getDraftsByUserId(userId: string, options?: IOperationOptions): Promise<IStory[]>;

  // Public queries
  getPublishedStories(options?: IOperationOptions): Promise<IStory[]>;
  getNewStories(options?: IOperationOptions): Promise<IStory[]>;
  listStories(options?: IOperationOptions): Promise<IStory[]>;

  // Story tree queries (throws if story not found)
  getStoryTreeBySlug(slug: string): Promise<IStoryTreeResult>;

  // Overview and settings (throws if not found)
  getStoryOverviewBySlug(slug: string): Promise<IStoryWithCreator>;
  getStorySettingsBySlug(slug: string): Promise<IStorySettingsWithImages>;

  // Search
  searchStoriesByTitle(query: string, limit?: number): Promise<Pick<IStory, '_id' | 'title'>[]>;
}

export type { IStoryQueryService, IStoryTreeResult };
