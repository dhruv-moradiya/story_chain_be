import { Types } from 'mongoose';
import {
  IDisableAutoSaveDTO,
  IGetAutoSaveDraftDTO,
  TAutoSaveContentDTO,
  TEnableChapterAutoSaveDTO,
} from '@dto/chapterAutoSave.dto';
import { ID } from '@/types';
import { TEnableAutoSaveInput } from '@/types/response/chapterAutoSave.response.types';
import { BaseModule } from '@utils/baseClass';
import { storyService } from '@features/story/services/story.service';
import { IChapterAutoSave } from '../types/chapterAutoSave.types';
import { ChapterAutoSaveRepository } from '../repositories/chapterAutoSave.repository';

export type { TEnableChapterAutoSaveDTO };

class ChapterAutoSaveService extends BaseModule {
  private readonly chapterAutoSaveRepo = new ChapterAutoSaveRepository();

  /**
   * Resolve storySlug to storyId
   */
  private async resolveStoryId(storySlug: string): Promise<ID> {
    const story = await storyService.getStoryBySlug(storySlug);
    return story._id as ID;
  }

  private async saveAutoSaveContent(
    autoSave: IChapterAutoSave,
    update: { title: string; content: string }
  ) {
    // Update autosave record
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

  /**
   * ═══════════════════════════════════════════════════════════════════
   * STEP 1: ENABLE AUTO-SAVE
   * ═══════════════════════════════════════════════════════════════════
   *
   * When user clicks "Enable Auto-Save" button:
   * 1. Create ChapterAutoSave document
   * 2. Set isEnabled = true
   * 3. Frontend starts 1-minute interval
   */
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
          parentChapterId: input.parentChapterId as unknown as Types.ObjectId,
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
          parentChapterId: input.parentChapterId as unknown as Types.ObjectId,
        };
        break;
    }

    const autoSave = await this.chapterAutoSaveRepo.enableAutoSave(repoInput);

    if (!autoSave) {
      this.throwInternalError('Failed to enable auto-save');
    }

    return autoSave;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * STEP 2: AUTO-SAVE (every 1 minute)
   * ═══════════════════════════════════════════════════════════════════
   *
   * Frontend calls this every 1 minute:
   * - If autoSaveId is provided → update existing auto-save
   * - If autoSaveId is not provided → create new auto-save
   */
  async autoSaveContent(input: TAutoSaveContentDTO): Promise<IChapterAutoSave> {
    const { content, title, userId, autoSaveType, storySlug } = input;

    // Resolve storySlug to storyId
    const storyId = await this.resolveStoryId(storySlug);

    // ───────────────────────────────────────────────
    // CASE 1: Update existing auto-save (autoSaveId provided)
    // ───────────────────────────────────────────────
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

    // ───────────────────────────────────────────────
    // CASE 2: Create new auto-save (no autoSaveId)
    // ───────────────────────────────────────────────
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

  /**
   * ═══════════════════════════════════════════════════════════════════
   * STEP 3: DISABLE AUTO-SAVE
   * ═══════════════════════════════════════════════════════════════════
   *
   * When user closes editor or disables auto-save:
   * 1. Set isEnabled = false
   * 2. Frontend stops 1-minute interval
   */
  async disableAutoSave(input: IDisableAutoSaveDTO): Promise<IChapterAutoSave> {
    const { chapterId, userId } = input;

    // ───────────────────────────────────────────────
    // CASE 1: Disable autosave for existing chapter
    // ───────────────────────────────────────────────
    if (chapterId) {
      const autoSave = await this.chapterAutoSaveRepo.findByChapterIdAndUser(chapterId, userId);

      if (!autoSave) {
        this.throwNotFoundError('Auto-save is not enabled for this chapter.');
      }

      const disableAutoSaveData =
        await this.chapterAutoSaveRepo.disableAutoSaveForExistingChapter(chapterId);

      if (!disableAutoSaveData) {
        this.throwInternalError('Failed to disable auto-save. Please try again.');
      }

      return disableAutoSaveData;
    }

    // ───────────────────────────────────────────────
    // CASE 2: Disable autosave for draft
    // draftId MUST be provided if chapterId is not
    // ───────────────────────────────────────────────
    // if (draftId) {
    //   const autoSave = await this.chapterAutoSaveRepo.findByDraftIdAndUser(draftId, userId);

    //   if (!autoSave) {
    //     this.throwNotFoundError('Auto-save is not enabled for this draft.');
    //   }

    //   const disableAutoSaveData = await this.chapterAutoSaveRepo.disableAutoSaveForSraftAutoSave(
    //     autoSave._id
    //   );

    //   if (!disableAutoSaveData) {
    //     this.throwInternalError('Failed to disable auto-save. Please try again.');
    //   }

    //   return disableAutoSaveData;
    // }

    // ───────────────────────────────────────────────
    // CASE 3: Invalid request
    // ───────────────────────────────────────────────
    this.throwBadRequest('Provide either chapterId or draftId to disable auto-save.');
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * STEP 4: GET AUTO-SAVE DRAFT
   * ═══════════════════════════════════════════════════════════════════
   *
   * When user returns to chapter:
   * 1. Check if auto-save exists
   * 2. Ask user: "Resume from auto-save?" or "Use published version?"
   * 3. Return draft content
   */
  async getAutoSaveDraft(input: IGetAutoSaveDraftDTO): Promise<IChapterAutoSave[]> {
    const { userId } = input;

    const autoSave = await this.chapterAutoSaveRepo.findByUser(userId);

    // if (!autoSave) {
    //   this.throwNotFoundError('No active auto-save was found.');
    // }

    return autoSave;

    // if (chapterId) {
    //   const autoSave = await this.chapterAutoSaveRepo.findByChapterIdAndUser(chapterId, userId);

    //   if (!autoSave) {
    //     this.throwNotFoundError('No active auto-save was found for this chapter.');
    //   }

    //   return autoSave;
    // }

    // if (draftId) {
    //   const autoSave = await this.chapterAutoSaveRepo.findByDraftIdAndUser(draftId, userId);
    //   if (!autoSave) {
    //     this.throwNotFoundError('No active auto-save was found for this draft.');
    //   }

    //   return autoSave;
    // }

    // this.throwBadRequest('Provide either chapterId or draftId to get auto-save.');
  }
}

export { ChapterAutoSaveService };
export const chapterAutoSaveService = new ChapterAutoSaveService();
