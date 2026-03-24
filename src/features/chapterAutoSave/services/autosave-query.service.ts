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
    return this.chapterAutoSaveRepo.findById({ id: autoSaveId });
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

  async search(
    filters: {
      q?: string;
      storySlug?: string;
      chapterSlug?: string;
      autoSaveType?: string;
      userId: string;
    },
    fields?: string[],
    limit?: number
  ): Promise<IChapterAutoSave[]> {
    const requestedFields = [...(fields || [])];
    let wordCountRequested = requestedFields.includes('wordCount');

    // Remove wordCount from DB fields if it's there (since it's a virtual/calculated)
    const dbFields = requestedFields.filter((f) => f !== 'wordCount');

    // If no fields specified, we fetch all (including content).
    // If fields specified AND wordCount requested, ensure content is fetched.
    if (fields && wordCountRequested && !dbFields.includes('content')) {
      dbFields.push('content');
    }

    const results = await this.chapterAutoSaveRepo.search(filters, dbFields, limit);

    return results.map((doc) => {
      const mapped = { ...doc };
      if (!fields || wordCountRequested) {
        mapped.wordCount = doc.content ? doc.content.trim().split(/\s+/).length : 0;
      }

      // If wordCount was requested but content was NOT originally requested,
      // and we had to add content to dbFields, we should probably remove it from final output
      if (fields && wordCountRequested && !fields.includes('content')) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (mapped as any).content;
      }

      return mapped as IChapterAutoSave;
    });
  }
}
