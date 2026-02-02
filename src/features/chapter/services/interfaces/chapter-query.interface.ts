import { IOperationOptions } from '@/types';
import { IChapter } from '../../types/chapter.types';
import { IChapterDetails, IChapterWithStory } from '../../repositories/chapter.repository';

interface IChapterQueryService {
  getById(chapterId: string, options?: IOperationOptions): Promise<IChapter | null>;
  getByStory(storySlug: string): Promise<IChapter[]>;
  getByAuthor(userId: string): Promise<IChapterWithStory[]>;
  getDetails(chapterId: string): Promise<IChapterDetails | null>;
}

export type { IChapterQueryService };
