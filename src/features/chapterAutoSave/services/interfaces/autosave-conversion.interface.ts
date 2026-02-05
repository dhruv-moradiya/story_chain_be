import { TConvertAutoSaveDTO } from '@dto/chapterAutoSave.dto';
import { IChapter } from '@features/chapter/types/chapter.types';

/**
 * Service for converting autosaves to chapters
 */
export interface IAutoSaveConversionService {
  /**
   * Convert autosave to chapter (draft or published)
   */
  convert(input: TConvertAutoSaveDTO): Promise<IChapter>;
}
