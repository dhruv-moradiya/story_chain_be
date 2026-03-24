import { IOperationOptions } from '@/types';
import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { ChapterRepository } from '../repositories/chapter.repository';
import { IChapter } from '../types/chapter.types';
import { IChapterCrudService } from './interfaces/chapter-crud.interface';

@singleton()
export class ChapterCrudService extends BaseModule implements IChapterCrudService {
  constructor(
    @inject(TOKENS.ChapterRepository)
    private readonly chapterRepo: ChapterRepository
  ) {
    super();
  }

  async update(
    chapterId: string,
    updates: Partial<IChapter>,
    options: IOperationOptions = {}
  ): Promise<IChapter | null> {
    return this.chapterRepo.updateById(chapterId, updates, {
      session: options.session,
      new: true,
    });
  }

  async delete(chapterId: string, options: IOperationOptions = {}): Promise<void> {
    await this.chapterRepo.softDelete({
      filter: { _id: chapterId },
      options: { session: options.session },
    });
  }
}
