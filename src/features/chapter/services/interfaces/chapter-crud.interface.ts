import { IOperationOptions } from '@/types';
import { IChapter } from '../../types/chapter.types';

interface IChapterCrudService {
  update(
    chapterId: string,
    updates: Partial<IChapter>,
    options?: IOperationOptions
  ): Promise<IChapter | null>;
  delete(chapterId: string, options?: IOperationOptions): Promise<void>;
}

export type { IChapterCrudService };
