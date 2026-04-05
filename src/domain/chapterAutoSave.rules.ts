import { IChapterAutoSave } from '@features/chapterAutoSave/types/chapterAutoSave.types';

export class ChapterRepositoryRule {
  static ensureBelongsToUser(record: IChapterAutoSave, userId: string): boolean {
    const isBelongToUser = record.userId !== userId;
    return isBelongToUser;
  }
}
