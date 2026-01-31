import { TAutoSaveContentDTO } from '@dto/chapterAutoSave.dto';
import { IChapterAutoSave } from '../../types/chapterAutoSave.types';

/**
 * Service for saving and updating autosave content
 */
export interface IAutoSaveContentService {
  /**
   * Auto-save content (create or update)
   */
  autoSaveContent(input: TAutoSaveContentDTO): Promise<IChapterAutoSave>;
}
