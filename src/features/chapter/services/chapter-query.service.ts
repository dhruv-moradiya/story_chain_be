import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { ID, IOperationOptions } from '@/types';
import { BaseModule } from '@utils/baseClass';
import { IChapter } from '../types/chapter.types';
import {
  ChapterRepository,
  IChapterDetails,
  IChapterWithStory,
} from '../repositories/chapter.repository';
import { IChapterQueryService } from './interfaces/chapter-query.interface';

@singleton()
export class ChapterQueryService extends BaseModule implements IChapterQueryService {
  constructor(
    @inject(TOKENS.ChapterRepository)
    private readonly chapterRepo: ChapterRepository
  ) {
    super();
  }

  async getById(chapterId: ID, options: IOperationOptions = {}): Promise<IChapter | null> {
    const chapter = this.chapterRepo.findById(chapterId, {}, { session: options.session });
    return chapter;
  }

  async getByStory(storySlug: string): Promise<IChapter[]> {
    return this.chapterRepo.findByStorySlug(storySlug);
  }

  /**
   * Get all chapters created by a user with story info
   */
  async getByAuthor(userId: string): Promise<IChapterWithStory[]> {
    return this.chapterRepo.findByAuthorWithStory(userId);
  }

  /**
   * Get chapter details by ID with story and author info
   */
  async getDetails(chapterId: string): Promise<IChapterDetails | null> {
    return this.chapterRepo.findByIdWithDetails(chapterId);
  }
}
