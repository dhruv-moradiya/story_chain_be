import { TEnableChapterAutoSaveDTO } from '@dto/chapterAutoSave.dto';
import { IChapterAutoSave } from '../../types/chapterAutoSave.types';

/**
 * Service for managing autosave lifecycle (enable/disable/delete)
 */
export interface IAutoSaveLifecycleService {
  /**
   * Enable autosave for a chapter
   */
  enableAutoSave(input: TEnableChapterAutoSaveDTO): Promise<IChapterAutoSave>;

  /**
   * Disable autosave for a chapter
   */
  disableAutoSave(chapterId: string, userId: string): Promise<IChapterAutoSave>;

  /**
   * Delete autosave record
   */
  deleteAutoSave(autoSaveId: string): Promise<void>;
}
