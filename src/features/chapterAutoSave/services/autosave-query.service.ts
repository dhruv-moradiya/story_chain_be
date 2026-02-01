import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { ID } from '@/types';
import { IChapterAutoSave } from '../types/chapterAutoSave.types';
import { ChapterAutoSaveRepository } from '../repositories/chapterAutoSave.repository';
import { IAutoSaveQueryService } from './interfaces/autosave-query.interface';

@singleton()
export class AutoSaveQueryService implements IAutoSaveQueryService {
  constructor(
    @inject(TOKENS.ChapterAutoSaveRepository)
    private readonly chapterAutoSaveRepo: ChapterAutoSaveRepository
  ) {}

  async getById(autoSaveId: ID): Promise<IChapterAutoSave | null> {
    return this.chapterAutoSaveRepo.findById(autoSaveId);
  }

  async getByUser(userId: string): Promise<IChapterAutoSave[]> {
    return this.chapterAutoSaveRepo.findByUser(userId);
  }

  async getByChapterAndUser(chapterId: string, userId: string): Promise<IChapterAutoSave | null> {
    return this.chapterAutoSaveRepo.findByChapterIdAndUser(chapterId, userId);
  }
}
