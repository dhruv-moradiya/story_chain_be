import { IChapterAutoSave } from '../features/chapterAutoSave/chapterAutoSave.types';

export class ChapterRepositoryRule {
  static alreadyEnabled(record: IChapterAutoSave | null): boolean {
    return !!record?.isEnabled;
  }

  static ensureBelongsToUser(record: IChapterAutoSave, userId: string): boolean {
    const isBelongToUser = record.userId !== userId;
    return isBelongToUser;
  }
}
