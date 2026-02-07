import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { HTTP_STATUS } from '@constants/httpStatus';
import { ApiResponse } from '@utils/apiResponse';
import { BaseModule } from '@utils/baseClass';
import { catchAsync } from '@utils/catchAsync';
import { ChapterQueryService } from '../services/chapter-query.service';
import { ChapterCrudService } from '../services/chapter-crud.service';
import { TCreateChapterSchema } from '@/schema/request/chapter.schema';

@singleton()
export class ChapterController extends BaseModule {
  constructor(
    @inject(TOKENS.ChapterQueryService)
    private readonly chapterQueryService: ChapterQueryService,
    @inject(TOKENS.ChapterCrudService)
    private readonly chapterCrudService: ChapterCrudService
  ) {
    super();
  }

  /**
   * Get all chapters created by the current user
   * Response includes: title, storySlug, chapterId, status, reads, createdAt, updatedAt, PR info, author
   */
  getMyChapters = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.clerkId;
    const { page, limit } = request.query as { page?: number; limit?: number };

    const chapters = await this.chapterQueryService.getByAuthor(userId, {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    });

    return reply
      .code(HTTP_STATUS.OK.code)
      .send(
        ApiResponse.fetched(
          chapters,
          chapters.length === 0
            ? 'No chapters found.'
            : `${chapters.length} chapter${chapters.length > 1 ? 's' : ''} found.`
        )
      );
  });

  /**
   * Get chapter details by slug
   * Response includes: full chapter info with story slug, story title, and author details
   */
  getChapterBySlug = catchAsync(
    async (request: FastifyRequest<{ Params: { chapterSlug: string } }>, reply: FastifyReply) => {
      const { chapterSlug } = request.params;

      const chapter = await this.chapterQueryService.getBySlug(chapterSlug);

      if (!chapter) {
        return reply
          .code(HTTP_STATUS.NOT_FOUND.code)
          .send(new ApiResponse(false, 'Chapter not found.', null));
      }

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.fetched(chapter, 'Chapter details retrieved successfully.'));
    }
  );

  createChild = catchAsync(
    async (request: FastifyRequest<{ Body: TCreateChapterSchema }>, reply: FastifyReply) => {
      const input = request.body;
      const userId = request.user.clerkId;

      const chapter = await this.chapterCrudService.createChild({
        ...input,
        userId,
      });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.created(chapter, 'Chapter created successfully.'));
    }
  );
}
