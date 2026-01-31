import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { TConvertToDraftDTO, TConvertToPublishedDTO } from '@dto/chapterAutoSave.dto';
import { BaseModule } from '@utils/baseClass';
import { ChapterService } from '@features/chapter/services/chapter.service';
import { IChapter } from '@features/chapter/types/chapter.types';
import { IChapterAutoSave } from '../types/chapterAutoSave.types';
import { ChapterAutoSaveRepository } from '../repositories/chapterAutoSave.repository';
import { IAutoSaveConversionService } from './interfaces/autosave-conversion.interface';

@singleton()
export class AutoSaveConversionService extends BaseModule implements IAutoSaveConversionService {
  constructor(
    @inject(TOKENS.ChapterAutoSaveRepository)
    private readonly chapterAutoSaveRepo: ChapterAutoSaveRepository,
    @inject(TOKENS.ChapterService)
    private readonly chapterService: ChapterService
  ) {
    super();
  }

  /**
   * Shared helper to create chapter from autosave
   */
  private async createChapterFromAutoSave(
    autoSave: IChapterAutoSave,
    userId: string
  ): Promise<IChapter> {
    // Validate content
    if (!autoSave.content || autoSave.content.trim().length < 50) {
      this.throwBadRequest('Chapter content must be at least 50 characters.');
    }

    let chapter: IChapter;

    switch (autoSave.autoSaveType) {
      case 'root_chapter':
        chapter = await this.chapterService.createRootChapter({
          storyId: autoSave.storyId.toString(),
          userId,
          title: autoSave.title || 'Untitled Chapter',
          content: autoSave.content,
        });
        break;

      case 'new_chapter':
        if (!autoSave.parentChapterId) {
          this.throwBadRequest('Parent chapter ID is required for new chapter.');
        }
        chapter = await this.chapterService.createChildChapterSimple({
          storyId: autoSave.storyId.toString(),
          userId,
          title: autoSave.title || 'Untitled Chapter',
          content: autoSave.content,
          parentChapterId: autoSave.parentChapterId.toString(),
        });
        break;

      case 'update_chapter':
        throw this.throwBadRequest(
          'Cannot convert update_chapter autosave. Use the chapter update API instead.'
        );

      default:
        throw this.throwBadRequest('Invalid auto-save type.');
    }

    return chapter;
  }

  async convertToDraft(input: TConvertToDraftDTO): Promise<IChapter> {
    const { autoSaveId, userId } = input;

    // Find the autosave record
    const autoSave = await this.chapterAutoSaveRepo.findById(autoSaveId);

    if (!autoSave) {
      this.throwNotFoundError('Auto-save record not found.');
    }

    // Verify ownership
    if (autoSave.userId !== userId) {
      this.throwForbiddenError('You do not have permission to convert this auto-save.');
    }

    // Create chapter
    const chapter = await this.createChapterFromAutoSave(autoSave, userId);

    // Delete autosave after successful conversion
    await this.chapterAutoSaveRepo.deleteById(autoSaveId);

    return chapter;
  }

  async convertToPublished(input: TConvertToPublishedDTO): Promise<IChapter> {
    const { autoSaveId, userId } = input;

    // Find the autosave record
    const autoSave = await this.chapterAutoSaveRepo.findById(autoSaveId);

    if (!autoSave) {
      this.throwNotFoundError('Auto-save record not found.');
    }

    // Verify ownership
    if (autoSave.userId !== userId) {
      this.throwForbiddenError('You do not have permission to convert this auto-save.');
    }

    // Create chapter (permission check done in route middleware)
    const chapter = await this.createChapterFromAutoSave(autoSave, userId);

    // Delete autosave after successful conversion
    await this.chapterAutoSaveRepo.deleteById(autoSaveId);

    return chapter;
  }
}
