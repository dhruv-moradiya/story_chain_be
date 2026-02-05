import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { TEnableChapterAutoSaveDTO } from '@dto/chapterAutoSave.dto';
import { TEnableAutoSaveInput } from '@/types/response/chapterAutoSave.response.types';
import { BaseModule } from '@utils/baseClass';
import { StoryQueryService } from '@/features/story/services/story-query.service';
import { ChapterQueryService } from '@/features/chapter/services/chapter-query.service';
import { CollaboratorQueryService } from '@/features/storyCollaborator/services/collaborator-query.service';
import { WRITE_CHAPTER_ROLES } from '@/middlewares/rbac/storyRole.middleware';
import { IChapterAutoSave } from '../types/chapterAutoSave.types';
import { ChapterAutoSaveRepository } from '../repositories/chapterAutoSave.repository';
import { IAutoSaveLifecycleService } from './interfaces/autosave-lifecycle.interface';

@singleton()
export class AutoSaveLifecycleService extends BaseModule implements IAutoSaveLifecycleService {
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

  async enableAutoSave(input: TEnableChapterAutoSaveDTO): Promise<IChapterAutoSave> {
    const { userId, storySlug, autoSaveType } = input;

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
      this.throwForbiddenError('You do not have permission to enable auto-save for this story.');
    }

    let repoInput: TEnableAutoSaveInput;

    switch (autoSaveType) {
      case 'root_chapter':
        repoInput = {
          autoSaveType,
          userId,
          storySlug,
          title: input.title,
          content: input.content,
        };
        break;
      case 'new_chapter':
        repoInput = {
          autoSaveType,
          userId,
          storySlug,
          title: input.title,
          content: input.content,
          parentChapterSlug: input.parentChapterSlug,
        };
        break;
      case 'update_chapter':
        repoInput = {
          autoSaveType,
          userId,
          storySlug,
          title: input.title,
          content: input.content,
          chapterSlug: input.chapterSlug,
          parentChapterSlug: input.parentChapterSlug,
        };
        break;
      default:
        throw this.throwBadRequest('Invalid auto-save type');
    }

    const autoSave = await this.chapterAutoSaveRepo.enableAutoSave(repoInput);

    if (!autoSave) {
      this.throwInternalError('Failed to enable auto-save');
    }

    return autoSave;
  }

  async disableAutoSave(chapterSlug: string, userId: string): Promise<IChapterAutoSave> {
    const autoSave = await this.chapterAutoSaveRepo.findByChapterSlugAndUser(chapterSlug, userId);

    if (!autoSave) {
      this.throwNotFoundError('Auto-save is not enabled for this chapter.');
    }

    const disabledAutoSave =
      await this.chapterAutoSaveRepo.disableAutoSaveForExistingChapter(chapterSlug);

    if (!disabledAutoSave) {
      this.throwInternalError('Failed to disable auto-save. Please try again.');
    }

    return disabledAutoSave;
  }

  async deleteAutoSave(autoSaveId: string): Promise<void> {
    await this.chapterAutoSaveRepo.deleteById(autoSaveId);
  }
}
