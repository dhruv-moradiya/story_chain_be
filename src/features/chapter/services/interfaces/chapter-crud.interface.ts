import { IOperationOptions } from '@/types';
import { IChapter } from '../../types/chapter.types';
import { ICreateChildChapterSimpleDTO, TChapterAddRootDTO } from '../../dto/chapter.dto';

interface IChapterCrudService {
  createRoot(input: TChapterAddRootDTO, options?: IOperationOptions): Promise<IChapter>;
  createChild(input: ICreateChildChapterSimpleDTO, options?: IOperationOptions): Promise<IChapter>;
  update(
    chapterId: string,
    updates: Partial<IChapter>,
    options?: IOperationOptions
  ): Promise<IChapter | null>;
  delete(chapterId: string, options?: IOperationOptions): Promise<void>;
}

export type { IChapterCrudService };
