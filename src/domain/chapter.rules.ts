import { IChapter } from '@/features/chapter/types/chapter.types';

export class ChapterRules {
  static canCreateNewChapter(parentChapter: IChapter | null): boolean {
    const hasParentChapter = !!parentChapter;
    return hasParentChapter;
  }

  static canUpdateChapter(chapter: IChapter | null): boolean {
    const hasChapter = !!chapter;
    return hasChapter;
  }
}
