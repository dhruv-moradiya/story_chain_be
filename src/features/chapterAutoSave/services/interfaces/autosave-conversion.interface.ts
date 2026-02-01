import { TConvertToDraftDTO, TConvertToPublishedDTO } from '@dto/chapterAutoSave.dto';
import { IChapter } from '@features/chapter/types/chapter.types';

/**
 * Service for converting autosaves to chapters
 */
export interface IAutoSaveConversionService {
  /**
   * Convert autosave to draft chapter
   */
  convertToDraft(input: TConvertToDraftDTO): Promise<IChapter>;

  /**
   * Convert autosave to published chapter
   */
  convertToPublished(input: TConvertToPublishedDTO): Promise<IChapter>;
}
