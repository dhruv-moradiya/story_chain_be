import { FastifyReply, FastifyRequest } from 'fastify';
import { ApiError, ApiResponse } from '../../utils/apiResponse';
import { catchAsync } from '../../utils/catchAsync';
import { chapterService } from './chapter.ser';

export class ChapterController {
  static createChapter = catchAsync(
    async (
      request: FastifyRequest<{
        Params: { storyId: string };
        Body: { parentChapterId?: string; content: string; title: string };
      }>,
      reply: FastifyReply
    ) => {
      const userId = request.userId;
      if (!userId) return ChapterController.unauthorized(reply);

      const { storyId } = request.params;
      const { parentChapterId, content, title } = request.body;

      try {
        const result = await chapterService.createChapter({
          storyId,
          parentChapterId,
          content,
          title,
          userId,
        });

        const payload = result.isPR
          ? { pullRequest: result.isPR, chapter: result.chapter }
          : {
              chapter: result.chapter,
              xpAwarded: result.xpAwarded,
              badgesEarned: result.badgesEarned,
              stats: result.stats,
            };

        return ChapterController.success(reply, 201, result.message, payload);
      } catch (error) {
        return ChapterController.handleError(error, reply);
      }
    }
  );

  // ========== RESPONSE HELPERS ==========
  private static success(reply: FastifyReply, status: number, message: string, data?: unknown) {
    return reply.code(status).send(new ApiResponse(true, message, data));
  }

  private static fail(reply: FastifyReply, status: number, message: string, data?: unknown) {
    return reply.code(status).send(new ApiResponse(false, message, data));
  }

  private static unauthorized(reply: FastifyReply) {
    return ChapterController.fail(reply, 401, 'Unauthorized');
  }

  // ========== ERROR HANDLER ==========
  // private static handleError(error: unknown, reply: FastifyReply) {
  //   switch (true) {
  //     case error instanceof ValidationError:
  //       return this.fail(reply, 400, error.message);

  //     case error instanceof NotFoundError:
  //       return this.fail(reply, 404, error.message);

  //     case error instanceof ForbiddenError:
  //       return this.fail(reply, 403, error.message);

  //     case error instanceof GoneError:
  //       return this.fail(reply, 410, error.message);

  //     case error instanceof ChapterError:
  //       return this.fail(reply, error.statusCode, error.message);

  //     default:
  //       console.error('Unexpected error in ChapterController:', error);
  //       const devInfo =
  //         process.env.NODE_ENV === 'development' ? { error: String(error) } : undefined;
  //       return this.fail(reply, 500, 'An unexpected error occurred', devInfo);
  //   }
  // }

  private static handleError(error: unknown, reply: FastifyReply) {
    if (error instanceof ApiError) {
      return this.fail(reply, error.statusCode, error.message);
    }

    // Fallback for unexpected errors: log and return 500 with optional dev info
    console.error('Unexpected error in ChapterController.handleError:', error);
    const devInfo = process.env.NODE_ENV === 'development' ? { error: String(error) } : undefined;
    return this.fail(reply, 500, 'An unexpected error occurred', devInfo);
  }
}
