import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { ID } from '@/types';
import { IChapterAutoSave } from '../types/chapterAutoSave.types';
import { ChapterAutoSaveRepository } from '../repositories/chapterAutoSave.repository';
import { IAutoSaveQueryService } from './interfaces/autosave-query.interface';
import { IGetAutoSaveDraftDTO } from '@/dto/chapterAutoSave.dto';
import { BaseModule } from '@/utils/baseClass';
import { IChapterAutoSavePaginatedResponse } from '@/types/response/chapterAutoSave.response.types';

@singleton()
export class AutoSaveQueryService extends BaseModule implements IAutoSaveQueryService {
  constructor(
    @inject(TOKENS.ChapterAutoSaveRepository)
    private readonly chapterAutoSaveRepo: ChapterAutoSaveRepository
  ) {
    super();
  }

  async getById(autoSaveId: ID): Promise<IChapterAutoSave | null> {
    return this.chapterAutoSaveRepo.findById(autoSaveId);
  }

  async getByUser(input: IGetAutoSaveDraftDTO): Promise<IChapterAutoSavePaginatedResponse> {
    const { userId, page = 1, limit = 10 } = input;

    const [docs, totalDocs] = await Promise.all([
      this.chapterAutoSaveRepo.findByUser(userId, page, limit),
      this.chapterAutoSaveRepo.countByUser(userId),
    ]);

    return this.formatPaginatedResponse(docs, totalDocs, page, limit);
  }

  private formatPaginatedResponse<T>(docs: T[], totalDocs: number, page: number, limit: number) {
    const totalPages = Math.ceil(totalDocs / limit);
    const pagingCounter = (page - 1) * limit + 1;
    const hasPrevPage = page > 1;
    const hasNextPage = page < totalPages;
    const prevPage = hasPrevPage ? page - 1 : null;
    const nextPage = hasNextPage ? page + 1 : null;

    return {
      docs,
      totalDocs,
      limit,
      totalPages,
      page,
      pagingCounter,
      hasPrevPage,
      hasNextPage,
      prevPage,
      nextPage,
    };
  }

  async getByChapterAndUser(chapterSlug: string, userId: string): Promise<IChapterAutoSave | null> {
    return this.chapterAutoSaveRepo.findByChapterSlugAndUser(chapterSlug, userId);
  }
}
