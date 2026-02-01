import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { TConvertToDraftDTO, TConvertToPublishedDTO } from '@dto/chapterAutoSave.dto';
import { BaseModule } from '@utils/baseClass';
import { ChapterService } from '@features/chapter/services/chapter.service';
import { IChapter } from '@features/chapter/types/chapter.types';
import { IChapterAutoSave } from '../types/chapterAutoSave.types';
import { ChapterAutoSaveRepository } from '../repositories/chapterAutoSave.repository';
import { IAutoSaveConversionService } from './interfaces/autosave-conversion.interface';
import { ChapterStatus } from '@/features/chapter/types/chapter-enum';

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

  // ─────────────────────────────────────────────────────────────────────────────
  // Validation Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private validateContent(content: string | undefined): void {
    if (!content || content.trim().length < 50) {
      this.throwBadRequest('Chapter content must be at least 50 characters.');
    }
  }

  private validateParentChapter(parentChapterId: unknown): void {
    if (!parentChapterId) {
      this.throwBadRequest('Parent chapter ID is required for new chapter.');
    }
  }

  private async findAutoSaveOrThrow(autoSaveId: string): Promise<IChapterAutoSave> {
    const autoSave = await this.chapterAutoSaveRepo.findById(autoSaveId);
    if (!autoSave) {
      this.throwNotFoundError('Auto-save record not found.');
    }
    return autoSave;
  }

  private verifyOwnership(autoSave: IChapterAutoSave, userId: string): void {
    if (autoSave.userId !== userId) {
      this.throwForbiddenError('You do not have permission to convert this auto-save.');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Chapter Creation
  // ─────────────────────────────────────────────────────────────────────────────

  private async createRootChapterFromAutoSave(
    autoSave: IChapterAutoSave,
    userId: string
  ): Promise<IChapter> {
    return this.chapterService.createRootChapter({
      storyId: autoSave.storyId.toString(),
      userId,
      title: autoSave.title || 'Untitled Chapter',
      content: autoSave.content,
    });
  }

  private async createChildChapterFromAutoSave(
    autoSave: IChapterAutoSave,
    userId: string,
    status: ChapterStatus
  ): Promise<IChapter> {
    this.validateParentChapter(autoSave.parentChapterId);

    return this.chapterService.createChildChapterSimple({
      storyId: autoSave.storyId.toString(),
      userId,
      title: autoSave.title || 'Untitled Chapter',
      content: autoSave.content,
      parentChapterId: autoSave.parentChapterId!.toString(),
      status,
    });
  }

  /**
   * Create chapter from autosave based on type
   * @param autoSave - The autosave record
   * @param userId - The user creating the chapter
   * @param status - Chapter status (defaults to DRAFT)
   */
  private async createChapterFromAutoSave(
    autoSave: IChapterAutoSave,
    userId: string,
    status: ChapterStatus = ChapterStatus.DRAFT
  ): Promise<IChapter> {
    this.validateContent(autoSave.content);

    switch (autoSave.autoSaveType) {
      case 'root_chapter':
        return this.createRootChapterFromAutoSave(autoSave, userId);

      case 'new_chapter':
        return this.createChildChapterFromAutoSave(autoSave, userId, status);

      case 'update_chapter':
        throw this.throwBadRequest(
          'Cannot convert update_chapter autosave. Use the chapter update API instead.'
        );

      default:
        throw this.throwBadRequest('Invalid auto-save type.');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Public Conversion Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Common conversion flow: validate, create chapter, delete autosave
   */
  private async performConversion(
    autoSaveId: string,
    userId: string,
    status: ChapterStatus
  ): Promise<IChapter> {
    const autoSave = await this.findAutoSaveOrThrow(autoSaveId);
    this.verifyOwnership(autoSave, userId);

    const chapter = await this.createChapterFromAutoSave(autoSave, userId, status);

    await this.chapterAutoSaveRepo.deleteById(autoSaveId);

    return chapter;
  }

  async convertToDraft(input: TConvertToDraftDTO): Promise<IChapter> {
    return this.performConversion(input.autoSaveId, input.userId, ChapterStatus.DRAFT);
  }

  async convertToPublished(input: TConvertToPublishedDTO): Promise<IChapter> {
    return this.performConversion(input.autoSaveId, input.userId, ChapterStatus.PUBLISHED);
  }
}
