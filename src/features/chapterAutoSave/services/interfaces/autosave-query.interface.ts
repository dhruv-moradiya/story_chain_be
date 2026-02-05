import { ID } from '@/types';
import { IChapterAutoSave } from '../../types/chapterAutoSave.types';
import { IGetAutoSaveDraftDTO } from '@/dto/chapterAutoSave.dto';
import { IChapterAutoSavePaginatedResponse } from '@/types/response/chapterAutoSave.response.types';

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
  getByUser(input: IGetAutoSaveDraftDTO): Promise<IChapterAutoSavePaginatedResponse>;

  /**
   * Get autosave for a specific chapter and user
   */
  getByChapterAndUser(chapterId: string, userId: string): Promise<IChapterAutoSave | null>;
}
