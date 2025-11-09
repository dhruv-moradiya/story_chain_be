import { ChapterVersion } from '../../../models/chapterVersion.model';
import { BaseRepository } from '../../../utils';
import { IChapterVersion, IChapterVersionDoc } from '../chapterVersion.types';

export class ChapterVersionRepository extends BaseRepository<IChapterVersion, IChapterVersionDoc> {
  constructor() {
    super(ChapterVersion);
  }
}

export const chapterVersionRepository = new ChapterVersionRepository();
