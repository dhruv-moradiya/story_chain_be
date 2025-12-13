import { Types } from 'mongoose';
import {
  IAutoSaveContentDTO,
  IDisableAutoSaveDTO,
  IEnableChapterAutoSaveDTO,
  IGetAutoSaveDraftDTO,
} from '../../dto/chapterAutoSave.dto';
import { ID, IOperationOptions } from '../../types';
import { BaseModule } from '../../utils/baseClass';
import { IChapter } from '../chapter/chapter.types';
import { ChapterRepository } from '../chapter/repositories/chapter.repository';
import { IChapterAutoSave } from './chapterAutoSave.types';
import { ChapterAutoSaveRepository } from './repository/chapterAutoSave.repository';
import { ChapterRules } from '../../domain/chapter.roles';

class ChapterAutoSaveService extends BaseModule {
  private readonly chapterRepo = new ChapterRepository();
  private readonly chapterAutoSaveRepo = new ChapterAutoSaveRepository();

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
  async enableAutoSave(
    input: IEnableChapterAutoSaveDTO,
    options: IOperationOptions = {}
  ): Promise<IChapterAutoSave> {
    const { chapterId, draftId, userId } = input;

    let chapter: IChapter | null = null;
    let finalDraftId = draftId;

    // ───────────────────────────────────────────────
    // CASE 1: Existing chapter → Standard AutoSave
    // ───────────────────────────────────────────────
    if (chapterId) {
      chapter = await this.ensureChapterIsExist(chapterId);
      ChapterRules.ensureCanEnableAutoSave(chapter, userId);

      return this.chapterAutoSaveRepo.enableAutoSaveForChapter({
        chapterId: chapter._id as Types.ObjectId,
        userId,
        title: chapter.title,
        content: chapter.content,
      });
    }

    // ───────────────────────────────────────────────
    // CASE 2: New draft (no chapter yet)
    // ───────────────────────────────────────────────
    if (!finalDraftId) {
      finalDraftId = crypto.randomUUID();
    }

    // Case 3: Resume draft → (optional) owner rule
    // DraftRules.ensureValidDraftOwner(finalDraftId, userId);

    return this.chapterAutoSaveRepo.enableAutoSaveForDraft({
      draftId: finalDraftId,
      userId,
    });
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
    const { chapterId, draftId, content, title, userId } = input;

    let chapter: IChapter | null = null;
    let autoSave: IChapterAutoSave | null = null;
    let finalDraftId = draftId;

    // ───────────────────────────────────────────────
    // CASE 1: Auto-save for existing chapter
    // ───────────────────────────────────────────────
    if (chapterId) {
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

    if (!autoSave) {
      // First time draft autosave
      autoSave = await this.chapterAutoSaveRepo.enableAutoSaveForDraft({
        draftId: finalDraftId,
        userId,
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

      const disableAutoSaveData = await this.chapterAutoSaveRepo.disableAutoSaveForExistingChapter(
        autoSave._id
      );

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
  async getAutoSaveDraft(input: IGetAutoSaveDraftDTO) {
    const { userId, chapterId, draftId } = input;

    if (chapterId) {
      const autoSave = await this.chapterAutoSaveRepo.findByChapterIdAndUser(chapterId, userId);

      if (!autoSave) {
        this.throwNotFoundError('No active auto-save was found for this chapter.');
      }

      return autoSave;
    }

    if (draftId) {
      const autoSave = await this.chapterAutoSaveRepo.findByDraftIdAndUser(draftId, userId);
      if (!autoSave) {
        this.throwNotFoundError('No active auto-save was found for this draft.');
      }

      return autoSave;
    }

    this.throwBadRequest('Provide either chapterId or draftId to get auto-save.');
  }
}

export { ChapterAutoSaveService };
