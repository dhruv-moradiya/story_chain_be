import { inject, singleton } from 'tsyringe';
import { Types } from 'mongoose';
import { TOKENS } from '@container/tokens';
import { TEnableChapterAutoSaveDTO } from '@dto/chapterAutoSave.dto';
import { ID } from '@/types';
import { TEnableAutoSaveInput } from '@/types/response/chapterAutoSave.response.types';
import { BaseModule } from '@utils/baseClass';
import { StoryQueryService } from '@/features/story/services/story-query.service';
import { IChapterAutoSave } from '../types/chapterAutoSave.types';
import { ChapterAutoSaveRepository } from '../repositories/chapterAutoSave.repository';
import { IAutoSaveLifecycleService } from './interfaces/autosave-lifecycle.interface';

@singleton()
export class AutoSaveLifecycleService extends BaseModule implements IAutoSaveLifecycleService {
  constructor(
    @inject(TOKENS.ChapterAutoSaveRepository)
    private readonly chapterAutoSaveRepo: ChapterAutoSaveRepository,
    @inject(TOKENS.StoryQueryService)
    private readonly storyQueryService: StoryQueryService
  ) {
    super();
  }

  /**
   * Resolve storySlug to storyId
   */
  private async resolveStoryId(storySlug: string): Promise<ID> {
    const story = await this.storyQueryService.getBySlug(storySlug);
    return story._id as ID;
  }

  async enableAutoSave(input: TEnableChapterAutoSaveDTO): Promise<IChapterAutoSave> {
    const { userId, storySlug, autoSaveType } = input;

    const storyId = await this.resolveStoryId(storySlug);

    let repoInput: TEnableAutoSaveInput;

    switch (autoSaveType) {
      case 'root_chapter':
        repoInput = {
          autoSaveType,
          userId,
          storyId: storyId as Types.ObjectId,
          title: input.title,
          content: input.content,
        };
        break;
      case 'new_chapter':
        repoInput = {
          autoSaveType,
          userId,
          storyId: storyId as Types.ObjectId,
          title: input.title,
          content: input.content,
          parentChapterSlug: input.parentChapterSlug as unknown as string,
        };
        break;
      case 'update_chapter':
        repoInput = {
          autoSaveType,
          userId,
          storyId: storyId as Types.ObjectId,
          title: input.title,
          content: input.content,
          chapterId: input.chapterId as unknown as Types.ObjectId,
          parentChapterSlug: input.parentChapterSlug as unknown as string,
        };
        break;
    }

    const autoSave = await this.chapterAutoSaveRepo.enableAutoSave(repoInput);

    if (!autoSave) {
      this.throwInternalError('Failed to enable auto-save');
    }

    return autoSave;
  }

  async disableAutoSave(chapterId: string, userId: string): Promise<IChapterAutoSave> {
    const autoSave = await this.chapterAutoSaveRepo.findByChapterIdAndUser(chapterId, userId);

    if (!autoSave) {
      this.throwNotFoundError('Auto-save is not enabled for this chapter.');
    }

    const disabledAutoSave =
      await this.chapterAutoSaveRepo.disableAutoSaveForExistingChapter(chapterId);

    if (!disabledAutoSave) {
      this.throwInternalError('Failed to disable auto-save. Please try again.');
    }

    return disabledAutoSave;
  }

  async deleteAutoSave(autoSaveId: string): Promise<void> {
    await this.chapterAutoSaveRepo.deleteById(autoSaveId);
  }
}
