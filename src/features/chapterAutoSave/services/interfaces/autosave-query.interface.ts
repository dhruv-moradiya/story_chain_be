import { ID } from '@/types';
import { IChapterAutoSave } from '../../types/chapterAutoSave.types';

/**
 * Query service for fetching autosave records
 */
export interface IAutoSaveQueryService {
  /**
   * Get autosave by ID
   */
  getById(autoSaveId: ID): Promise<IChapterAutoSave | null>;

  /**
   * Get all autosaves for a user
   */
  getByUser(userId: string): Promise<IChapterAutoSave[]>;

  /**
   * Get autosave for a specific chapter and user
   */
  getByChapterAndUser(chapterId: string, userId: string): Promise<IChapterAutoSave | null>;
}
