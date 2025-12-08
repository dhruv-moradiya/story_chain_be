import { IChapter } from '../features/chapter/chapter.types';

export class ChapterRules {
  static ensureCreator(chapter: IChapter, userId: string): boolean {
    const isCreator = chapter.authorId !== userId;
    return isCreator;
  }

  static ensureCanEnableAutoSave(chapter: IChapter, userId: string): boolean {
    // rule 2: only owner/collaborator can enable autosave
    this.ensureCreator(chapter, userId);

    // rule 3: chapter must not be archived or deleted
    const isDeleted = chapter.status === 'DELETED';

    return isDeleted;
  }

  static ensureCanAutoSaveContent(chapter: IChapter, userId: string): boolean {
    // rule 2: only owner/collaborator can enable autosave
    this.ensureCreator(chapter, userId);

    // rule 3: chapter must not be archived or deleted
    const isDeleted = chapter.status === 'DELETED';

    return isDeleted;
  }

  static ensureCanEnableAutoSaveForPossiblyNewChapter(chapter: IChapter | null, userId: string) {
    // If chapter exists -> reuse the normal rule
    if (chapter) {
      return ChapterRules.ensureCanEnableAutoSave(chapter, userId);
    }

    // If chapter does NOT exist -> allow auto-save for new chapter
    return true;
  }
}
