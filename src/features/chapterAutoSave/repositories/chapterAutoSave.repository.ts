import { ChapterAutoSave } from '@models/chapterAutoSave.modal';
import { ID, IOperationOptions } from '@/types';
import {
  IEnableAutoSaveNewChapter,
  IEnableAutoSaveUpdateChapter,
  TEnableAutoSaveInput,
} from '@/types/response/chapterAutoSave.response.types';
import { BaseRepository } from '@utils/baseClass';
import { IChapterAutoSave, IChapterAutoSaveDoc } from '../types/chapterAutoSave.types';

export class ChapterAutoSaveRepository extends BaseRepository<
  IChapterAutoSave,
  IChapterAutoSaveDoc
> {
  constructor() {
    super(ChapterAutoSave);
  }

  // ───────────────────────────────────────────────
  // Finds
  // ───────────────────────────────────────────────
  findByChapterSlugAndUser(chapterSlug: string, userId: string) {
    return this.model.findOne({ chapterSlug, userId });
  }

  findByDraftIdAndUser(draftId: string, userId: string) {
    return this.model.findOne({ draftId, userId });
  }

  findByUser(userId: string, page: number, limit: number): Promise<IChapterAutoSave[]> {
    return this.model
      .find({ userId })
      .sort({ lastSavedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
  }

  countByUser(userId: string): Promise<number> {
    return this.model.countDocuments({ userId });
  }

  disableAutoSaveForExistingChapter(chapterSlug: string) {
    return this.findOneAndUpdate({ chapterSlug: chapterSlug }, { isEnabled: false }, { new: true });
  }

  disableAutoSaveForSraftAutoSave(id: ID) {
    return this.findOneAndUpdate({ _id: id }, { isEnabled: false }, { new: true });
  }

  // ───────────────────────────────────────────────
  // Create autosave for NEW chapter
  // ───────────────────────────────────────────────
  enableAutoSaveForChapter(chapter: {
    chapterSlug: string;
    userId: string;
    title: string;
    content: string;
    autoSaveType: string;
    storySlug: string;
    parentChapterSlug?: string;
  }): Promise<IChapterAutoSave> {
    const { chapterSlug, userId, title, content, autoSaveType, storySlug, parentChapterSlug } =
      chapter;

    return this.model.findOneAndUpdate(
      { chapterSlug, userId },
      {
        $set: {
          isEnabled: true,
          lastSavedAt: new Date(),
        },
        $setOnInsert: {
          chapterSlug,
          userId,
          title,
          content,
          saveCount: 0,
          autoSaveType,
          storySlug,
          parentChapterSlug,
        },
      },
      { new: true, upsert: true }
    );
  }

  // ───────────────────────────────────────────────
  // Create autosave for NEW draft (no chapter yet)
  // ───────────────────────────────────────────────
  enableAutoSaveForDraft(draft: {
    draftId: string;
    userId: string;
    autoSaveType: string;
    storySlug: string;
    parentChapterSlug?: string;
  }) {
    const { draftId, userId, autoSaveType, storySlug, parentChapterSlug } = draft;

    return this.model.findOneAndUpdate(
      { draftId, userId },
      {
        $set: {
          isEnabled: true,
          lastSavedAt: new Date(),
        },
        $setOnInsert: {
          draftId,
          userId,
          title: '',
          content: '',
          saveCount: 0,
          autoSaveType,
          storySlug,
          parentChapterSlug,
        },
      },
      { new: true, upsert: true }
    );
  }

  // ───────────────────────────────────────────────
  // Update existing autosave (after saving content)
  // ───────────────────────────────────────────────
  updateAutoSave(id: ID, update: Partial<IChapterAutoSave>) {
    return this.model.findByIdAndUpdate(id, update, { new: true });
  }

  // ───────────────────────────────────────────────
  // When chapter is officially created → attach draft
  // ───────────────────────────────────────────────
  linkDraftToChapter(userId: string, draftId: string, chapterSlug: string) {
    return this.model.findOneAndUpdate(
      { userId, draftId },
      {
        $set: {
          chapterSlug,
          draftId: null,
        },
      },
      { new: true }
    );
  }

  // ───────────────────────────────────────────────
  // Delete autosave by ID
  // ───────────────────────────────────────────────
  deleteById(id: ID, options?: IOperationOptions): Promise<IChapterAutoSave | null> {
    const query = this.model.findByIdAndDelete(id);

    if (options?.session) {
      query.session(options.session);
    }

    return query.lean<IChapterAutoSave>().exec();
  }

  // ───────────────────────────────────────────────
  // Enable auto-save (handles all auto-save types)
  // ───────────────────────────────────────────────
  enableAutoSave(input: TEnableAutoSaveInput): Promise<IChapterAutoSave> {
    const { autoSaveType, userId, storySlug, title, content } = input;
    const baseFields = {
      userId,
      storySlug,
      title,
      content,
      autoSaveType,
      isEnabled: true,
      lastSavedAt: new Date(),
      saveCount: 0,
    };

    switch (autoSaveType) {
      case 'root_chapter':
        return this.model.create(baseFields);

      case 'new_chapter': {
        const newChapterInput = input as IEnableAutoSaveNewChapter;
        return this.model.create({
          ...baseFields,
          parentChapterSlug: newChapterInput.parentChapterSlug,
        });
      }

      case 'update_chapter': {
        const updateInput = input as IEnableAutoSaveUpdateChapter;
        return this.model.create({
          ...baseFields,
          chapterSlug: updateInput.chapterSlug,
          parentChapterSlug: updateInput.parentChapterSlug,
        });
      }
      default:
        throw new Error(`Unsupported autoSaveType: ${autoSaveType}`);
    }
  }
}
