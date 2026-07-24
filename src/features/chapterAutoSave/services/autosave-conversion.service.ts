import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { TConvertAutoSaveDTO } from '@dto/chapterAutoSave.dto';
import { BaseModule } from '@utils/baseClass';
import { WRITE_CHAPTER_ROLES } from '@/middlewares/rbac/storyRole.middleware';
import { CacheService } from '@/infrastructure/cache/cache.service';

import { IChapter } from '@features/chapter/types/chapter.types';
import { ChapterAutoSaveType, IChapterAutoSave } from '../types/chapterAutoSave.types';
import { ChapterAutoSaveRepository } from '../repositories/chapterAutoSave.repository';
import { ChapterStatus } from '@/features/chapter/types/chapter-enum';
import { StoryQueryService } from '@features/story/services/story-query.service';
import { CollaboratorQueryService } from '@features/storyCollaborator/services/collaborator-query.service';
import { ClientSession } from 'mongoose';
import { withTransaction } from '@utils/withTransaction';
import { ChapterCreationService } from '@/features/chapter/services/chapter-creation.service';

@singleton()
export class AutoSaveConversionService extends BaseModule {
  constructor(
    @inject(TOKENS.ChapterAutoSaveRepository)
    private readonly chapterAutoSaveRepo: ChapterAutoSaveRepository,
    @inject(TOKENS.StoryQueryService)
    private readonly storyQueryService: StoryQueryService,
    @inject(TOKENS.CollaboratorQueryService)
    private readonly collaboratorQueryService: CollaboratorQueryService,
    @inject(TOKENS.ChapterCreationService)
    private readonly chapterCreationService: ChapterCreationService,
    @inject(TOKENS.CacheService)
    private readonly cacheService: CacheService
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
    const autoSave = await this.chapterAutoSaveRepo.findById({ id: autoSaveId });
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
    return this.chapterCreationService.createRoot(
      {
        storySlug: story.slug,
        userId,
        title: autoSave.title || 'Untitled Chapter',
        content: autoSave.content,
        status: ChapterStatus.DRAFT,
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

    return this.chapterCreationService.createChild(
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
      case ChapterAutoSaveType.ROOT_CHAPTER:
        return this.createRootChapterFromAutoSave(autoSave, userId, session);

      case ChapterAutoSaveType.NEW_CHAPTER:
        return this.createChildChapterFromAutoSave(autoSave, userId, status, session);

      case ChapterAutoSaveType.UPDATE:
        throw this.throwBadRequest(
          'Cannot convert update chapter autosave. Use the chapter update API instead.'
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

      // Invalidate story-level caches since a new chapter was added/updated
      await this.cacheService.invalidateStory(autoSave.storySlug);
      // Invalidate chapter detail and story tree caches for the new chapter
      await this.cacheService.invalidateChapter(autoSave.storySlug, chapter.slug);

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
