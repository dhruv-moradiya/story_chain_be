import { IOperationOptions } from '@/types';
import { IChapter } from '../../types/chapter.types';
import { ICreateChildChapterSimpleDTO, TChapterAddRootDTO } from '../../dto/chapter.dto';

export interface IChapterCreationService {
  createRoot(input: TChapterAddRootDTO, options?: IOperationOptions): Promise<IChapter>;
  createChild(input: ICreateChildChapterSimpleDTO, options?: IOperationOptions): Promise<IChapter>;
}
