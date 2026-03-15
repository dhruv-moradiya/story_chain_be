import { IOperationOptions } from '@/types';
import {
  IChapterWithStoryResponse,
  IChapterDetailsResponse,
} from '@/types/response/chapter.response.types';
import { IChapter } from '../../types/chapter.types';

interface IChapterQueryService {
  getBySlug(
    chapterSlug: string,
    options?: { fields?: string[] } & IOperationOptions
  ): Promise<IChapter | null>;
  getById(chapterId: string, options?: IOperationOptions): Promise<IChapter | null>;
  getByStory(storySlug: string): Promise<IChapter[]>;
  getByAuthor(userId: string): Promise<IChapterWithStoryResponse[]>;
  getChapterDetails(chapterSlug: string): Promise<IChapterDetailsResponse | null>;

  searchChapters(
    filters: { q?: string; slug?: string; storySlug?: string; userId?: string },
    fields?: string[],
    limit?: number,
    options?: IOperationOptions
  ): Promise<IChapter[]>;
}

export type { IChapterQueryService };
