import { inject, singleton } from 'tsyringe';
import { Types } from 'mongoose';
import { TOKENS } from '@container/tokens';
import {
  IDisableAutoSaveDTO,
  IGetAutoSaveDraftDTO,
  TAutoSaveContentDTO,
  TConvertToDraftDTO,
  TConvertToPublishedDTO,
  TEnableChapterAutoSaveDTO,
} from '@dto/chapterAutoSave.dto';
import { ID } from '@/types';
import { TEnableAutoSaveInput } from '@/types/response/chapterAutoSave.response.types';
import { BaseModule } from '@utils/baseClass';
import { StoryQueryService } from '@/features/story/services/story-query.service';
import { ChapterService } from '@features/chapter/services/chapter.service';
import { IChapter } from '@features/chapter/types/chapter.types';
import { IChapterAutoSave } from '../types/chapterAutoSave.types';
import { ChapterAutoSaveRepository } from '../repositories/chapterAutoSave.repository';

export type { TEnableChapterAutoSaveDTO };

@singleton()
class ChapterAutoSaveService extends BaseModule {
  constructor(
    @inject(TOKENS.ChapterAutoSaveRepository)
    private readonly chapterAutoSaveRepo: ChapterAutoSaveRepository,
    @inject(TOKENS.StoryQueryService)
    private readonly storyQueryService: StoryQueryService,
    @inject(TOKENS.ChapterService)
    private readonly chapterService: ChapterService
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
    const { content, title, userId, autoSaveType } = input;

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
    // CASE 2: Create new auto-save (storySlug provided, no autoSaveId)
    // ───────────────────────────────────────────────
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

  /**
   * ═══════════════════════════════════════════════════════════════════
   * STEP 5: CONVERT AUTO-SAVE TO DRAFT (Chapter owned by user)
   * ═══════════════════════════════════════════════════════════════════
   *
   * Convert an autosave to a chapter that only the user can see/edit.
   * - Only the owner of the autosave can convert it
   * - No story role permission required (user owns their draft)
   * - Chapter is created with PENDING_APPROVAL status (not visible to others)
   * - AutoSave is deleted after successful conversion
   */
  async convertToDraft(input: TConvertToDraftDTO): Promise<IChapter> {
    const { autoSaveId, userId } = input;

    // 1. Find the autosave record
    const autoSave = await this.chapterAutoSaveRepo.findById(autoSaveId);

    if (!autoSave) {
      this.throwNotFoundError('Auto-save record not found.');
    }

    // 2. Verify ownership - only the autosave owner can convert
    if (autoSave.userId !== userId) {
      this.throwForbiddenError('You do not have permission to convert this auto-save.');
    }

    // 3. Validate content
    if (!autoSave.content || autoSave.content.trim().length < 50) {
      this.throwBadRequest('Chapter content must be at least 50 characters.');
    }

    // 4. Create chapter based on autoSaveType
    let chapter: IChapter;

    switch (autoSave.autoSaveType) {
      case 'root_chapter':
        chapter = await this.chapterService.createRootChapter({
          storyId: autoSave.storyId.toString(),
          userId,
          title: autoSave.title || 'Untitled Chapter',
          content: autoSave.content,
        });
        break;

      case 'new_chapter':
        if (!autoSave.parentChapterId) {
          this.throwBadRequest('Parent chapter ID is required for new chapter.');
        }
        chapter = await this.chapterService.createChildChapterSimple({
          storyId: autoSave.storyId.toString(),
          userId,
          title: autoSave.title || 'Untitled Chapter',
          content: autoSave.content,
          parentChapterId: autoSave.parentChapterId.toString(),
        });
        break;

      case 'update_chapter':
        // For update_chapter, we don't create a new chapter
        // This case should use a different flow (update existing chapter)
        throw this.throwBadRequest(
          'Cannot convert update_chapter autosave to draft. Use the chapter update API instead.'
        );

      default:
        throw this.throwBadRequest('Invalid auto-save type.');
    }

    // 5. Delete the autosave record after successful conversion
    await this.chapterAutoSaveRepo.deleteById(autoSaveId);

    return chapter;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * STEP 6: CONVERT AUTO-SAVE TO PUBLISHED CHAPTER
   * ═══════════════════════════════════════════════════════════════════
   *
   * Convert an autosave to a published chapter visible to all readers.
   * - Requires `canWriteChapters` permission in the story
   * - Permission check is done in the route middleware (RBAC)
   * - Chapter is created with PUBLISHED status
   * - AutoSave is deleted after successful conversion
   *
   * NOTE: The route must use StoryRoleGuards.canWriteChapters middleware
   */
  async convertToPublished(input: TConvertToPublishedDTO): Promise<IChapter> {
    const { autoSaveId, userId } = input;

    // 1. Find the autosave record
    const autoSave = await this.chapterAutoSaveRepo.findById(autoSaveId);

    if (!autoSave) {
      this.throwNotFoundError('Auto-save record not found.');
    }

    // 2. Verify ownership - only the autosave owner can convert
    if (autoSave.userId !== userId) {
      this.throwForbiddenError('You do not have permission to convert this auto-save.');
    }

    // 3. Validate content
    if (!autoSave.content || autoSave.content.trim().length < 50) {
      this.throwBadRequest('Chapter content must be at least 50 characters.');
    }

    // 4. Create chapter based on autoSaveType
    // Note: Permission to publish is already verified by route middleware
    let chapter: IChapter;

    switch (autoSave.autoSaveType) {
      case 'root_chapter':
        chapter = await this.chapterService.createRootChapter({
          storyId: autoSave.storyId.toString(),
          userId,
          title: autoSave.title || 'Untitled Chapter',
          content: autoSave.content,
        });
        break;

      case 'new_chapter':
        if (!autoSave.parentChapterId) {
          this.throwBadRequest('Parent chapter ID is required for new chapter.');
        }
        chapter = await this.chapterService.createChildChapterSimple({
          storyId: autoSave.storyId.toString(),
          userId,
          title: autoSave.title || 'Untitled Chapter',
          content: autoSave.content,
          parentChapterId: autoSave.parentChapterId.toString(),
        });
        break;

      case 'update_chapter':
        // For update_chapter, we don't create a new chapter
        // This case should use a different flow (update existing chapter)
        throw this.throwBadRequest(
          'Cannot convert update_chapter autosave to published chapter. Use the chapter update API instead.'
        );

      default:
        throw this.throwBadRequest('Invalid auto-save type.');
    }

    // 5. Delete the autosave record after successful conversion
    await this.chapterAutoSaveRepo.deleteById(autoSaveId);

    return chapter;
  }

  /**
   * Get autosave by ID (used by controller to load story context)
   */
  async getAutoSaveById(autoSaveId: string): Promise<IChapterAutoSave | null> {
    return this.chapterAutoSaveRepo.findById(autoSaveId);
  }
}

export { ChapterAutoSaveService };
