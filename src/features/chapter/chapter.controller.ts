import { FastifyReply, FastifyRequest } from 'fastify';
import { HTTP_STATUS } from '../../constants/httpStatus';
import { ApiError, ApiResponse } from '../../utils/apiResponse';
import { catchAsync } from '../../utils/catchAsync';
import { logger } from '../../utils/logger';
import { chapterService } from './chapter.service';
import { IChapterCreateDTO } from './dto/chapter.dto';

export class ChapterController {
  createChapter = catchAsync(
    async (
      request: FastifyRequest<{
        Params: { storyId: string };
        Body: IChapterCreateDTO;
      }>,
      reply: FastifyReply
    ) => {
      const userId = request.user.clerkId;
      if (!userId) return this.unauthorized(reply);
      const { storyId } = request.params;
      const { parentChapterId, content, title } = request.body;

      const result = await chapterService.createChapter({
        storyId,
        parentChapterId,
        content,
        title,
        userId,
      });

      const message = result.isPR ? 'Pull request' : 'Chapter created';

      return reply.code(HTTP_STATUS.CREATED.code).send(new ApiResponse(true, message, result));
    }
  );

  updateChapterTitle = catchAsync(
    async (
      request: FastifyRequest<{
        Params: { chapterId: string };
        Body: { title: string };
      }>,
      reply: FastifyReply
    ) => {
      const userId = request.user.clerkId;
      if (!userId) return this.unauthorized(reply);

      const { chapterId } = request.params;
      const { title } = request.body;

      const result = await chapterService.updateChapterTitle({
        chapterId,
        userId,
        title,
      });
    }
  );

  getStoryTree = catchAsync(
    async (request: FastifyRequest<{ Params: { storyId: string } }>, reply: FastifyReply) => {
      const { storyId } = request.params;

      const tree = await chapterService.getStoryTree(storyId);

      return this.success(reply, HTTP_STATUS.OK.code, 'Story tree fetched', tree);
    }
  );

  // ========== RESPONSE HELPERS ==========
  private success(reply: FastifyReply, status: number, message: string, data?: unknown) {
    return reply.code(status).send(new ApiResponse(true, message, data));
  }

  private fail(reply: FastifyReply, status: number, message: string, data?: unknown) {
    return reply.code(status).send(new ApiResponse(false, message, data));
  }

  private unauthorized(reply: FastifyReply) {
    return this.fail(reply, 401, 'Unauthorized');
  }
  private handleError(error: unknown, reply: FastifyReply) {
    if (error instanceof ApiError) {
      return this.fail(reply, error.statusCode, error.message);
    }

    // Fallback for unexpected errors: log and return 500 with optional dev info
    logger.error('Unexpected error in ChapterController.handleError:', error);
    const devInfo = process.env.NODE_ENV === 'development' ? { error: String(error) } : undefined;
    return this.fail(reply, 500, 'An unexpected error occurred', devInfo);
  }
}

export const chapterController = new ChapterController();
