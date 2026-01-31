import { inject, singleton } from 'tsyringe';
import { Types } from 'mongoose';
import { TOKENS } from '@container/tokens';
import { TAutoSaveContentDTO } from '@dto/chapterAutoSave.dto';
import { ID } from '@/types';
import { TEnableAutoSaveInput } from '@/types/response/chapterAutoSave.response.types';
import { BaseModule } from '@utils/baseClass';
import { StoryQueryService } from '@/features/story/services/story-query.service';
import { IChapterAutoSave } from '../types/chapterAutoSave.types';
import { ChapterAutoSaveRepository } from '../repositories/chapterAutoSave.repository';
import { IAutoSaveContentService } from './interfaces/autosave-content.interface';

@singleton()
export class AutoSaveContentService extends BaseModule implements IAutoSaveContentService {
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

  private async saveAutoSaveContent(
    autoSave: IChapterAutoSave,
    update: { title: string; content: string }
  ) {
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

  async autoSaveContent(input: TAutoSaveContentDTO): Promise<IChapterAutoSave> {
    const { content, title, userId, autoSaveType } = input;

    // CASE 1: Update existing auto-save (autoSaveId provided)
    if ('autoSaveId' in input && input.autoSaveId) {
      const existingAutoSave = await this.chapterAutoSaveRepo.findById(input.autoSaveId);

      if (!existingAutoSave) {
        this.throwNotFoundError('Auto-save record not found');
      }

      if (existingAutoSave.userId !== userId) {
        this.throwForbiddenError('You do not have permission to update this auto-save');
      }

      return this.saveAutoSaveContent(existingAutoSave, { title, content });
    }

    // CASE 2: Create new auto-save (storySlug provided, no autoSaveId)
    const { storySlug } = input;

    if (!storySlug) {
      this.throwBadRequest('storySlug is required when autoSaveId is not provided');
    }

    const storyId = await this.resolveStoryId(storySlug);

    let repoInput: TEnableAutoSaveInput;

    switch (autoSaveType) {
      case 'root_chapter':
        repoInput = {
          autoSaveType,
          userId,
          storyId: storyId as Types.ObjectId,
          title,
          content,
        };
        break;
      case 'new_chapter':
        if (!('parentChapterId' in input)) {
          this.throwBadRequest('parentChapterId is required for new_chapter auto-save');
        }
        repoInput = {
          autoSaveType,
          userId,
          storyId: storyId as Types.ObjectId,
          title,
          content,
          parentChapterId: input.parentChapterId as unknown as Types.ObjectId,
        };
        break;
      case 'update_chapter':
        if (!('chapterId' in input) || !('parentChapterId' in input)) {
          this.throwBadRequest('chapterId and parentChapterId are required for update auto-save');
        }
        repoInput = {
          autoSaveType,
          userId,
          storyId: storyId as Types.ObjectId,
          title,
          content,
          chapterId: input.chapterId as unknown as Types.ObjectId,
          parentChapterId: input.parentChapterId as unknown as Types.ObjectId,
        };
        break;
    }

    const autoSave = await this.chapterAutoSaveRepo.enableAutoSave(repoInput);

    if (!autoSave) {
      this.throwInternalError('Failed to create auto-save');
    }

    return autoSave;
  }
}
