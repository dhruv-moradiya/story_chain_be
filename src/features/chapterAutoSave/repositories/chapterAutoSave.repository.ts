import { Types } from 'mongoose';
import { ChapterAutoSave } from '@models/chapterAutoSave.modal';
import { ID } from '@/types';
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
  findByChapterIdAndUser(chapterId: ID, userId: string) {
    return this.model.findOne({ chapterId, userId });
  }

  findByDraftIdAndUser(draftId: string, userId: string) {
    return this.model.findOne({ draftId, userId });
  }

  findByUser(userId: string): Promise<IChapterAutoSave[]> {
    return this.model.find({ userId });
  }

  disableAutoSaveForExistingChapter(chapterId: ID) {
    return this.findOneAndUpdate({ chapterId: chapterId }, { isEnabled: false }, { new: true });
  }

  disableAutoSaveForSraftAutoSave(id: ID) {
    return this.findOneAndUpdate({ _id: id }, { isEnabled: false }, { new: true });
  }

  // ───────────────────────────────────────────────
  // Create autosave for NEW chapter
  // ───────────────────────────────────────────────
  enableAutoSaveForChapter(chapter: {
    chapterId: Types.ObjectId;
    userId: string;
    title: string;
    content: string;
    autoSaveType: string;
    storyId: Types.ObjectId;
    parentChapterSlug?: string;
  }): Promise<IChapterAutoSave> {
    const { chapterId, userId, title, content, autoSaveType, storyId, parentChapterSlug } = chapter;

    return this.model.findOneAndUpdate(
      { chapterId, userId },
      {
        $set: {
          isEnabled: true,
          lastSavedAt: new Date(),
        },
        $setOnInsert: {
          chapterId,
          userId,
          title,
          content,
          saveCount: 0,
          autoSaveType,
          storyId,
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
    storyId: Types.ObjectId;
    parentChapterSlug?: string;
  }) {
    const { draftId, userId, autoSaveType, storyId, parentChapterSlug } = draft;

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
          storyId,
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
  linkDraftToChapter(userId: string, draftId: string, chapterId: Types.ObjectId) {
    return this.model.findOneAndUpdate(
      { userId, draftId },
      {
        $set: {
          chapterId,
          draftId: null,
        },
      },
      { new: true }
    );
  }

  // ───────────────────────────────────────────────
  // Delete autosave by ID
  // ───────────────────────────────────────────────
  deleteById(id: ID): Promise<IChapterAutoSave | null> {
    return this.model.findByIdAndDelete(id).lean<IChapterAutoSave>().exec();
  }

  // ───────────────────────────────────────────────
  // Enable auto-save (handles all auto-save types)
  // ───────────────────────────────────────────────
  enableAutoSave(input: TEnableAutoSaveInput): Promise<IChapterAutoSave> {
    const { autoSaveType, userId, storyId, title, content } = input;
    const baseFields = {
      userId,
      storyId,
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
          chapterId: updateInput.chapterId,
          parentChapterSlug: updateInput.parentChapterSlug,
        });
      }
    }
  }
}
