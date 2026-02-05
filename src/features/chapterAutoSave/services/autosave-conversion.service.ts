import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { TConvertAutoSaveDTO } from '@dto/chapterAutoSave.dto';
import { BaseModule } from '@utils/baseClass';
import { WRITE_CHAPTER_ROLES } from '@/middlewares/rbac/storyRole.middleware';

import { IChapter } from '@features/chapter/types/chapter.types';
import { IChapterAutoSave } from '../types/chapterAutoSave.types';
import { ChapterAutoSaveRepository } from '../repositories/chapterAutoSave.repository';
import { IAutoSaveConversionService } from './interfaces/autosave-conversion.interface';
import { ChapterStatus } from '@/features/chapter/types/chapter-enum';
import { IChapterCrudService } from '@features/chapter/services/interfaces/chapter-crud.interface';
import { StoryQueryService } from '@features/story/services/story-query.service';
import { CollaboratorQueryService } from '@features/storyCollaborator/services/collaborator-query.service';
import { ClientSession } from 'mongoose';
import { withTransaction } from '@utils/withTransaction';

@singleton()
export class AutoSaveConversionService extends BaseModule implements IAutoSaveConversionService {
  constructor(
    @inject(TOKENS.ChapterAutoSaveRepository)
    private readonly chapterAutoSaveRepo: ChapterAutoSaveRepository,
    @inject(TOKENS.ChapterCrudService)
    private readonly chapterCrudService: IChapterCrudService,
    @inject(TOKENS.StoryQueryService)
    private readonly storyQueryService: StoryQueryService,
    @inject(TOKENS.CollaboratorQueryService)
    private readonly collaboratorQueryService: CollaboratorQueryService
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

  private validateParentChapter(parentChapterSlug: unknown): void {
    if (!parentChapterSlug) {
      this.throwBadRequest('Parent chapter Slug is required for new chapter.');
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
    userId: string,
    session?: ClientSession
  ): Promise<IChapter> {
    const story = await this.storyQueryService.getBySlug(autoSave.storySlug, { session });
    return this.chapterCrudService.createRoot(
      {
        storySlug: story.slug,
        userId,
        title: autoSave.title || 'Untitled Chapter',
        content: autoSave.content,
      },
      { session }
    );
  }

  private async createChildChapterFromAutoSave(
    autoSave: IChapterAutoSave,
    userId: string,
    status: ChapterStatus,
    session?: ClientSession
  ): Promise<IChapter> {
    this.validateParentChapter(autoSave.parentChapterSlug);

    const story = await this.storyQueryService.getBySlug(autoSave.storySlug, { session });

    return this.chapterCrudService.createChild(
      {
        storySlug: story.slug,
        userId,
        title: autoSave.title || 'Untitled Chapter',
        content: autoSave.content,
        parentChapterSlug: autoSave.parentChapterSlug!.toString(),
        status,
      },
      { session }
    );
  }

  /**
   * Create chapter from autosave based on type
   * @param autoSave - The autosave record
   * @param userId - The user creating the chapter
   * @param status - Chapter status (defaults to DRAFT)
   */
  private async createChapterFromAutoSave(input: {
    autoSave: IChapterAutoSave;
    userId: string;
    status?: ChapterStatus;
    session?: ClientSession;
  }): Promise<IChapter> {
    const { autoSave, userId, status = ChapterStatus.DRAFT, session } = input;
    this.validateContent(autoSave.content);

    switch (autoSave.autoSaveType) {
      case 'root_chapter':
        return this.createRootChapterFromAutoSave(autoSave, userId, session);

      case 'new_chapter':
        return this.createChildChapterFromAutoSave(autoSave, userId, status, session);

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
    autoSave: IChapterAutoSave,
    userId: string,
    status: ChapterStatus
  ): Promise<IChapter> {
    const autoSaveId = autoSave._id.toString();
    return withTransaction(`Convert AutoSave ${autoSaveId}`, async (session) => {
      this.verifyOwnership(autoSave, userId);

      const chapter = await this.createChapterFromAutoSave({
        autoSave,
        userId,
        status,
        session,
      });

      await this.chapterAutoSaveRepo.deleteById(autoSaveId, { session });

      return chapter;
    });
  }

  async convert(input: TConvertAutoSaveDTO): Promise<IChapter> {
    const { autoSaveId, userId, type } = input;

    const autoSave = await this.findAutoSaveOrThrow(autoSaveId);

    if (type === 'publish') {
      const userStoryRole = await this.collaboratorQueryService.getCollaboratorRole(
        userId,
        autoSave.storySlug
      );

      if (!userStoryRole || !WRITE_CHAPTER_ROLES.includes(userStoryRole)) {
        this.throwForbiddenError('You do not have permission to publish chapters in this story.');
      }
    }

    const status = type === 'publish' ? ChapterStatus.PUBLISHED : ChapterStatus.DRAFT;

    return this.performConversion(autoSave, userId, status);
  }
}
