import { IOperationOptions } from '@/types';
import { IChapterWithStoryResponse } from '@/types/response/chapter.response.types';
import { IChapter } from '../../types/chapter.types';

interface IChapterQueryService {
  getById(chapterId: string, options?: IOperationOptions): Promise<IChapter | null>;
  getByStory(storySlug: string): Promise<IChapter[]>;
  getByAuthor(userId: string): Promise<IChapterWithStoryResponse[]>;
  // getDetails(chapterId: string): Promise<IChapterDetails | null>;
}

export type { IChapterQueryService };
