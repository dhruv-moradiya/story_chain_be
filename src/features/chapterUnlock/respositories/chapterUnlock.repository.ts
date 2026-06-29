import { BaseRepository } from '@/utils/baseClass';
import { singleton } from 'tsyringe';
import { IChapterUnlock, IChapterUnlockDoc } from '../types/chapterUnlock.types';
import { ChapterUnlock } from '@/models/chapterUnlock.model';

@singleton()
export class ChapterUnlockRepository extends BaseRepository<IChapterUnlock, IChapterUnlockDoc> {
  constructor() {
    super(ChapterUnlock);
  }
}
