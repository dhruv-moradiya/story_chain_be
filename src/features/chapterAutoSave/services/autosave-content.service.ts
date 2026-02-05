import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { TAutoSaveContentDTO } from '@dto/chapterAutoSave.dto';
import { TEnableAutoSaveInput } from '@/types/response/chapterAutoSave.response.types';
import { BaseModule } from '@utils/baseClass';
import { StoryQueryService } from '@/features/story/services/story-query.service';
import { ChapterQueryService } from '@/features/chapter/services/chapter-query.service';
import { CollaboratorQueryService } from '@/features/storyCollaborator/services/collaborator-query.service';
import { WRITE_CHAPTER_ROLES } from '@/middlewares/rbac/storyRole.middleware';
import { IChapterAutoSave } from '../types/chapterAutoSave.types';
import { ChapterAutoSaveRepository } from '../repositories/chapterAutoSave.repository';
import { IAutoSaveContentService } from './interfaces/autosave-content.interface';

@singleton()
export class AutoSaveContentService extends BaseModule implements IAutoSaveContentService {
  constructor(
    @inject(TOKENS.ChapterAutoSaveRepository)
    private readonly chapterAutoSaveRepo: ChapterAutoSaveRepository,
    @inject(TOKENS.StoryQueryService)
    private readonly storyQueryService: StoryQueryService,
    @inject(TOKENS.ChapterQueryService)
    private readonly chapterQueryService: ChapterQueryService,
    @inject(TOKENS.CollaboratorQueryService)
    private readonly collaboratorQueryService: CollaboratorQueryService
  ) {
    super();
  }

  // ===============================
  // PUBLIC API
  // ===============================
  async autoSaveContent(input: TAutoSaveContentDTO): Promise<IChapterAutoSave> {
    if (this.isUpdateRequest(input)) {
      return this.handleUpdateAutoSave(input);
    }

    return this.handleCreateAutoSave(input);
  }

  // ===============================
  // UPDATE FLOW
  // ===============================
  private async handleUpdateAutoSave(
    input: TAutoSaveContentDTO & { autoSaveId: string }
  ): Promise<IChapterAutoSave> {
    const autoSave = await this.getAutoSaveOrFail(input.autoSaveId);

    this.assertOwnership(autoSave, input.userId);

    return this.updateAutoSaveContent(autoSave, {
      title: input.title,
      content: input.content,
    });
  }

  private async updateAutoSaveContent(
    autoSave: IChapterAutoSave,
    update: { title: string; content: string }
  ): Promise<IChapterAutoSave> {
    const updated = await this.chapterAutoSaveRepo.updateAutoSave(autoSave._id, {
      title: update.title,
      content: update.content,
      lastSavedAt: new Date(),
      saveCount: autoSave.saveCount + 1,
    });

    if (!updated) {
      this.throwInternalError('Failed to update auto-save record. Please try again.');
    }

    return updated;
  }

  // ===============================
  // CREATE FLOW
  // ===============================
  private async handleCreateAutoSave(input: TAutoSaveContentDTO): Promise<IChapterAutoSave> {
    this.assertStorySlug(input);
    const { storySlug, userId, autoSaveType } = input;

    // 1. Verify story existence
    await this.storyQueryService.getBySlug(storySlug);

    // 2. Verify chapter existence based on type
    if (autoSaveType === 'new_chapter') {
      const parentChapter = await this.chapterQueryService.getBySlug(input.parentChapterSlug);
      if (!parentChapter) {
        this.throwNotFoundError(`Parent chapter with slug ${input.parentChapterSlug} not found.`);
      }
    } else if (autoSaveType === 'update_chapter') {
      const chapter = await this.chapterQueryService.getBySlug(input.chapterSlug);
      if (!chapter) {
        this.throwNotFoundError(`Chapter with slug ${input.chapterSlug} not found.`);
      }

      const parentChapter = await this.chapterQueryService.getBySlug(input.parentChapterSlug);
      if (!parentChapter) {
        this.throwNotFoundError(`Parent chapter with slug ${input.parentChapterSlug} not found.`);
      }
    }

    // 3. Verify user permissions
    const userRole = await this.collaboratorQueryService.getCollaboratorRole(userId, storySlug);

    if (!userRole || !WRITE_CHAPTER_ROLES.includes(userRole)) {
      this.throwForbiddenError('You do not have permission to create auto-save for this story.');
    }

    const repoInput = this.buildEnableAutoSaveInput(input);

    const autoSave = await this.chapterAutoSaveRepo.enableAutoSave(repoInput);

    if (!autoSave) {
      this.throwInternalError('Failed to create auto-save');
    }

    return autoSave;
  }

  private buildEnableAutoSaveInput(input: TAutoSaveContentDTO): TEnableAutoSaveInput {
    const { autoSaveType, userId, storySlug, title, content } = input;

    switch (autoSaveType) {
      case 'root_chapter':
        return {
          autoSaveType,
          userId,
          storySlug: storySlug ?? '',
          title,
          content,
        };

      case 'new_chapter':
        return {
          autoSaveType,
          userId,
          storySlug,
          title: title ?? '',
          content: content ?? '',
          parentChapterSlug: input.parentChapterSlug,
        };

      case 'update_chapter':
        return {
          autoSaveType,
          userId,
          storySlug,
          title,
          content,
          chapterSlug: input.chapterSlug,
          parentChapterSlug: input.parentChapterSlug,
        };

      default:
        this.throwBadRequest('Invalid autoSaveType');
    }
  }

  // ===============================
  // VALIDATION & HELPERS
  // ===============================
  private isUpdateRequest(
    input: TAutoSaveContentDTO
  ): input is TAutoSaveContentDTO & { autoSaveId: string } {
    return Boolean((input as any).autoSaveId);
  }

  private async getAutoSaveOrFail(autoSaveId: string): Promise<IChapterAutoSave> {
    const autoSave = await this.chapterAutoSaveRepo.findById(autoSaveId);

    if (!autoSave) {
      this.throwNotFoundError('Auto-save record not found');
    }

    return autoSave;
  }

  private assertOwnership(autoSave: IChapterAutoSave, userId: string): void {
    if (autoSave.userId !== userId) {
      this.throwForbiddenError('You do not have permission to update this auto-save');
    }
  }

  private assertStorySlug(
    input: TAutoSaveContentDTO
  ): asserts input is TAutoSaveContentDTO & { storySlug: string } {
    if (!input.storySlug) {
      this.throwBadRequest('storySlug is required when creating auto-save');
    }
  }
}
