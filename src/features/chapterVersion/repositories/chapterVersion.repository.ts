import { ChapterVersion } from '@models/chapterVersion.model';
import { BaseRepository } from '@utils/baseClass';
import { IChapterVersion, IChapterVersionDoc } from '../types/chapterVersion.types';

export class ChapterVersionRepository extends BaseRepository<IChapterVersion, IChapterVersionDoc> {
  constructor() {
    super(ChapterVersion);
  }
}

export const chapterVersionRepository = new ChapterVersionRepository();
