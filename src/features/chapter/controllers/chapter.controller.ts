import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { HTTP_STATUS } from '@constants/httpStatus';
import { ApiResponse } from '@utils/apiResponse';
import { BaseModule } from '@utils/baseClass';
import { catchAsync } from '@utils/catchAsync';
import { ChapterQueryService } from '../services/chapter-query.service';
import { TCreateChapterSchema } from '@/schema/request/chapter.schema';
import { ChapterCrudService } from '../services/chapter-crud.service';

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

    const chapters = await this.chapterQueryService.getByAuthor(userId);

    return reply
      .code(HTTP_STATUS.OK.code)
      .send(
        new ApiResponse(
          true,
          chapters.length === 0
            ? 'No chapters found.'
            : `${chapters.length} chapter${chapters.length > 1 ? 's' : ''} found.`,
          chapters
        )
      );
  });

  /**
   * Get chapter details by ID
   * Response includes: full chapter info with story slug, story title, and author details
   */
  getChapterById = catchAsync(
    async (request: FastifyRequest<{ Params: { chapterId: string } }>, reply: FastifyReply) => {
      const { chapterId } = request.params;

      const chapter = await this.chapterQueryService.getDetails(chapterId);

      if (!chapter) {
        return reply
          .code(HTTP_STATUS.NOT_FOUND.code)
          .send(new ApiResponse(false, 'Chapter not found.', null));
      }

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Chapter details retrieved successfully.', chapter));
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
        .send(new ApiResponse(true, 'Chapter created successfully.', chapter));
    }
  );
}
