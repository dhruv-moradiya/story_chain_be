import { Types } from 'mongoose';
import { ChapterRules } from '../../domain/chapter.roles';
import {
  IAutoSaveContentDTO,
  IDisableAutoSaveDTO,
  IEnableChapterAutoSaveDTO,
  IGetAutoSaveDraftDTO,
} from '../../dto/chapterAutoSave.dto';
import { ID } from '../../types';
import { BaseModule } from '../../utils/baseClass';
import { IChapter } from '../chapter/chapter.types';
import { ChapterRepository } from '../chapter/repositories/chapter.repository';
import { IChapterAutoSave } from './chapterAutoSave.types';
import { ChapterAutoSaveRepository } from './repository/chapterAutoSave.repository';
import { storyService } from '../story/story.service';

class ChapterAutoSaveService extends BaseModule {
  private readonly chapterRepo = new ChapterRepository();
  private readonly chapterAutoSaveRepo = new ChapterAutoSaveRepository();

  private generateDraftId(): string {
    return crypto.randomUUID();
  }

  private async ensureChapterIsExist(chapterId: ID): Promise<IChapter> {
    const chapter = await this.chapterRepo.findById(chapterId);

    if (!chapter) {
      this.throwNotFoundError('Chapter not found');
    }
    return chapter;
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

  private async enableChapterAutoSave(
    chapterId: ID,
    userId: string,
    autoSaveType: string,
    storyId: ID,
    parentChapterId?: ID
  ): Promise<IChapterAutoSave> {
    const chapter = await this.ensureChapterIsExist(chapterId);

    ChapterRules.ensureCanEnableAutoSave(chapter, userId);

    const autoSave = await this.chapterAutoSaveRepo.enableAutoSaveForChapter({
      chapterId: chapter._id as Types.ObjectId,
      userId,
      title: chapter.title,
      content: chapter.content,
      autoSaveType,
      storyId: storyId as Types.ObjectId,
      parentChapterId: parentChapterId as Types.ObjectId | undefined,
    });

    if (!autoSave) {
      this.throwInternalError('Failed to enable autosave for chapter');
    }

    return autoSave;
  }

  private async enableDraftAutoSave(
    draftId: string,
    userId: string,
    autoSaveType: string,
    storyId: ID,
    parentChapterId?: ID
  ): Promise<IChapterAutoSave> {
    const autoSave = await this.chapterAutoSaveRepo.enableAutoSaveForDraft({
      draftId,
      userId,
      autoSaveType,
      storyId: storyId as Types.ObjectId,
      parentChapterId: parentChapterId as Types.ObjectId | undefined,
    });

    if (!autoSave) {
      this.throwInternalError('Failed to enable autosave for draft');
    }

    return autoSave;
  }

  /**
   * Resolve storySlug to storyId
   */
  private async resolveStoryId(storySlug: string): Promise<Types.ObjectId> {
    const story = await storyService.getStoryBySlug(storySlug);
    return story._id as Types.ObjectId;
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
  async enableAutoSave(input: IEnableChapterAutoSaveDTO): Promise<IChapterAutoSave> {
    const { chapterId, draftId, userId, autoSaveType, storySlug, parentChapterId } = input;

    // Resolve storySlug to storyId
    const storyId = await this.resolveStoryId(storySlug);

    // ───────────────────────────────────────────────
    // CASE 1: Existing Chapter → Standard AutoSave
    // ───────────────────────────────────────────────
    if (chapterId && chapterId !== 'root') {
      return this.enableChapterAutoSave(chapterId, userId, autoSaveType, storyId, parentChapterId);
    }

    // ───────────────────────────────────────────────
    // CASE 2: New or Existing Draft → Draft AutoSave
    // ───────────────────────────────────────────────
    const finalDraftId = draftId ?? this.generateDraftId();

    // Optional rule
    // DraftRules.ensureValidDraftOwner(finalDraftId, userId);

    return this.enableDraftAutoSave(finalDraftId, userId, autoSaveType, storyId, parentChapterId);
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * STEP 2: AUTO-SAVE (every 1 minute)
   * ═══════════════════════════════════════════════════════════════════
   *
   * Frontend calls this every 1 minute:
   * 1. Send current content
   * 2. Backend saves to ChapterAutoSave
   * 3. Calculate what changed
   * 4. Return success + metadata
   */
  async autoSaveContent(input: IAutoSaveContentDTO): Promise<IChapterAutoSave> {
    const { chapterId, draftId, content, title, userId, autoSaveType, storySlug, parentChapterId } =
      input;

    console.log({ input });

    // Resolve storySlug to storyId
    const storyId = await this.resolveStoryId(storySlug);

    let chapter: IChapter | null = null;
    let autoSave: IChapterAutoSave | null = null;
    let finalDraftId = draftId;

    // ───────────────────────────────────────────────
    // CASE 1: Auto-save for existing chapter
    // ───────────────────────────────────────────────
    if (chapterId && chapterId !== 'root') {
      chapter = await this.ensureChapterIsExist(chapterId);
      ChapterRules.ensureCanAutoSaveContent(chapter, userId);

      autoSave = await this.chapterAutoSaveRepo.findByChapterIdAndUser(
        chapter._id as Types.ObjectId,
        userId
      );

      if (!autoSave) {
        // Auto-save wasn't enabled → enable now
        autoSave = await this.chapterAutoSaveRepo.enableAutoSaveForChapter({
          chapterId: chapter._id as Types.ObjectId,
          userId,
          title: chapter.title,
          content: chapter.content,
          autoSaveType,
          storyId: storyId as Types.ObjectId,
          parentChapterId: parentChapterId as Types.ObjectId | undefined,
        });
      }

      return this.saveAutoSaveContent(autoSave, { title, content });
    }

    // ───────────────────────────────────────────────
    // CASE 2: Draft auto-save (no chapter yet)
    // ───────────────────────────────────────────────
    if (!finalDraftId) {
      finalDraftId = crypto.randomUUID(); // First-time draft autosave
    }

    // optional: if you implement DraftRules in future
    // DraftRules.ensureValidDraftOwner(finalDraftId, userId);

    autoSave = await this.chapterAutoSaveRepo.findByDraftIdAndUser(finalDraftId, userId);
    console.log('autoSave :>> ', autoSave);

    if (!autoSave) {
      // First time draft autosave
      autoSave = await this.chapterAutoSaveRepo.enableAutoSaveForDraft({
        draftId: finalDraftId,
        userId,
        autoSaveType,
        storyId: storyId as Types.ObjectId,
        parentChapterId: parentChapterId as Types.ObjectId | undefined,
      });
    }

    return this.saveAutoSaveContent(autoSave, { title, content });
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
    const { chapterId, draftId, userId } = input;

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
    if (draftId) {
      const autoSave = await this.chapterAutoSaveRepo.findByDraftIdAndUser(draftId, userId);

      if (!autoSave) {
        this.throwNotFoundError('Auto-save is not enabled for this draft.');
      }

      const disableAutoSaveData = await this.chapterAutoSaveRepo.disableAutoSaveForSraftAutoSave(
        autoSave._id
      );

      if (!disableAutoSaveData) {
        this.throwInternalError('Failed to disable auto-save. Please try again.');
      }

      return disableAutoSaveData;
    }

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

  /**
   * ═══════════════════════════════════════════════════════════════════
   * STEP 5: PUBLISH AUTO-SAVE DRAFT
   * ═══════════════════════════════════════════════════════════════════
   *
   * When user clicks "Publish" on their auto-saved draft:
   * 1. Find the auto-save record
   * 2. Create a new chapter from the draft content
   * 3. Return the published chapter
   */
  // async publishAutoSaveDraft(input: IPublishAutoSaveDraftDTO): Promise<IChapter> {
  //   const { userId, chapterId, draftId } = input;

  //   let autoSave: IChapterAutoSave | null = null;

  //   // ───────────────────────────────────────────────
  //   // CASE 1: Publish from existing chapter auto-save
  //   // ───────────────────────────────────────────────
  //   if (chapterId && chapterId !== 'root') {
  //     autoSave = await this.chapterAutoSaveRepo.findByChapterIdAndUser(chapterId, userId);
  //   }

  //   // ───────────────────────────────────────────────
  //   // CASE 2: Publish from draft auto-save
  //   // ───────────────────────────────────────────────
  //   if (!autoSave && draftId) {
  //     autoSave = await this.chapterAutoSaveRepo.findByDraftIdAndUser(draftId, userId);
  //   }

  //   if (!autoSave) {
  //     this.throwNotFoundError('No active auto-save was found to publish.');
  //   }

  //   const chapter = await storyService.addChapterToStoryBySlug({
  //     slug: autoSave.storySlug as string,
  //     title: autoSave.title,
  //     content: autoSave.content,
  //     parentChapterId: chapterId ?? null,
  //     userId,
  //   });

  //   return chapter;
  // }
}

export { ChapterAutoSaveService };
export const chapterAutoSaveService = new ChapterAutoSaveService();
