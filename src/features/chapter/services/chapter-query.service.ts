import { ID, IOperationOptions } from '@/types';
import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { ChapterPipelineBuilder } from '../pipelines/chapterPipeline.builder';
import { PUBLIC_AUTHOR_PROJECTION } from '../pipelines/chapter.projections';
import { ChapterRepository } from '../repositories/chapter.repository';
import { IChapter } from '../types/chapter.types';
import { IChapterQueryService } from './interfaces/chapter-query.interface';
import {
  IChapterWithStoryResponse,
  IChapterDetailsResponse,
} from '@/types/response/chapter.response.types';
import { getDisplayNumberStages } from '@/shared/pipelines';

@singleton()
export class ChapterQueryService extends BaseModule implements IChapterQueryService {
  constructor(
    @inject(TOKENS.ChapterRepository)
    private readonly chapterRepo: ChapterRepository
  ) {
    super();
  }

  async getBySlug(
    chapterSlug: string,
    options: { fields?: string[] } & IOperationOptions = {}
  ): Promise<IChapter | null> {
    return this.chapterRepo.findBySlug(chapterSlug, options);
  }

  async getById(chapterId: ID, options: IOperationOptions = {}): Promise<IChapter | null> {
    const chapter = this.chapterRepo.findById({
      id: chapterId,
      options: { session: options.session },
    });
    return chapter;
  }

  async getByStory(storySlug: string): Promise<IChapter[]> {
    return this.chapterRepo.findByStorySlug(storySlug);
  }

  async getChapterDetails(chapterSlug: string): Promise<IChapterDetailsResponse> {
    const pipeline = new ChapterPipelineBuilder()
      .findBySlug(chapterSlug)
      .attachAuthor({ project: PUBLIC_AUTHOR_PROJECTION })
      .attachPreviousChapters({ project: { _id: 1, title: 1, slug: 1 } })
      .attachNextChapters({ project: { _id: 1, title: 1, slug: 1 } })
      .build();

    const [chapter] = await this.chapterRepo.aggregateChapters<IChapterDetailsResponse>(pipeline);
    return chapter;
  }

  /**
   * Get all chapters created by a user with story info
   */
  async getByAuthor(
    authorId: string,
    options: IOperationOptions = {}
  ): Promise<IChapterWithStoryResponse[]> {
    const pipeline = new ChapterPipelineBuilder()
      .loadChaptersByAuthor(authorId)
      .attachStory({ project: { title: 1, slug: 1, status: 1 } })
      .attachAuthor({ project: PUBLIC_AUTHOR_PROJECTION })
      .addStages(getDisplayNumberStages())
      .projectChapterWithStory()
      .sortByCreatedAt()
      .build();

    return this.chapterRepo.aggregateChapters<IChapterWithStoryResponse>(pipeline, options);
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

  async searchChapters(
    filters: { q?: string; slug?: string; storySlug?: string; userId?: string },
    fields?: string[],
    limit: number = 10,
    options: IOperationOptions = {}
  ): Promise<IChapter[]> {
    return this.chapterRepo.search(filters, fields, limit, options);
  }
}
