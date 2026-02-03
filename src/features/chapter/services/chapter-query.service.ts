import { ID, IOperationOptions } from '@/types';
import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { ChapterPipelineBuilder } from '../pipelines/chapterPipeline.builder';
import { ChapterRepository } from '../repositories/chapter.repository';
import { IChapter } from '../types/chapter.types';
import { IChapterQueryService } from './interfaces/chapter-query.interface';
import { IChapterWithStoryResponse } from '@/types/response/chapter.response.types';

@singleton()
export class ChapterQueryService extends BaseModule implements IChapterQueryService {
  constructor(
    @inject(TOKENS.ChapterRepository)
    private readonly chapterRepo: ChapterRepository
  ) {
    super();
  }

  async getBySlug(chapterSlug: string): Promise<IChapter | null> {
    return this.chapterRepo.findBySlug(chapterSlug);
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
  async getByAuthor(authorId: string): Promise<IChapterWithStoryResponse[]> {
    const pipeline = new ChapterPipelineBuilder()
      .loadChaptersByAuthor(authorId)
      .attachStory()
      .attachAuthor()
      .projectChapterWithStory()
      .sortByCreatedAt()
      .build();

    return this.chapterRepo.aggregateChapters<IChapterWithStoryResponse>(pipeline);
  }

  /**
   * Get chapter details by ID with story and author info
   */
  // async getDetails(slug: string): Promise<IChapterDetails> {
  //   const pipeline = new ChapterPipelineBuilder()
  //     .findBySlug(slug)
  //     .attachStory()
  //     .attachAuthor()
  //     .projectChapterWithStory()
  //     .build();

  //   const [chapter] = await this.chapterRepo.aggregateChapters(pipeline);
  //   console.log('chapter', chapter);

  //   if (!chapter) {
  //     this.throwNotFoundError(`Chapter with slug ${slug} not found`);
  //   }

  //   return chapter;
  // }
}
