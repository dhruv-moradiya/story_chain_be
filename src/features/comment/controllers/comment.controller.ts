import { HTTP_STATUS } from '@/constants/httpStatus';
import { TOKENS } from '@/container';
import {
  TCommentCreateSchema,
  TCommentIdSchema,
  TCommentUpdateSchema,
} from '@/schema/request/comment.schema';
import { ApiResponse } from '@/utils/apiResponse';
import { BaseModule } from '@/utils/baseClass';
import { catchAsync } from '@/utils/catchAsync';
import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { CommentService } from '../services/comment.service';

@singleton()
class CommentController extends BaseModule {
  constructor(@inject(TOKENS.CommentService) private readonly commentService: CommentService) {
    super();
  }

  syncCounts = catchAsync(async (_request: FastifyRequest, reply: FastifyReply) => {
    await this.commentService.syncCounts();
    return reply
      .code(HTTP_STATUS.OK.code)
      .send(ApiResponse.success(null, 'OK', 'Counts synced successfully'));
  });

  addComment = catchAsync(
    async (request: FastifyRequest<{ Body: TCommentCreateSchema }>, reply: FastifyReply) => {
      const userId = request.user.clerkId;
      const input = request.body;

      await this.commentService.addComment({ ...input, userId });

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(ApiResponse.created(null, 'Comment added successfully'));
    }
  );

  updateComment = catchAsync(
    async (
      request: FastifyRequest<{ Body: TCommentUpdateSchema; Params: TCommentIdSchema }>,
      reply: FastifyReply
    ) => {
      const userId = request.user.clerkId;
      const input = request.body;
      const { commentId } = request.params;
      // We pass userId to service for ownership check
      await this.commentService.updateComment({ ...input, userId, commentId });
      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.updated(null, 'Comment updated successfully'));
    }
  );

  deleteComment = catchAsync(
    async (request: FastifyRequest<{ Params: TCommentIdSchema }>, reply: FastifyReply) => {
      const userId = request.user.clerkId;
      const input = request.params;
      // Pass userId to service
      const result = await this.commentService.deleteComment({ ...input, userId });
      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.success(result, 'OK', 'Comment deleted successfully'));
    }
  );

  getComment = catchAsync(
    async (request: FastifyRequest<{ Params: TCommentIdSchema }>, reply: FastifyReply) => {
      const input = request.params;
      const result = await this.commentService.getComment(input);
      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.success(result, 'OK', 'Comment retrieved successfully'));
    }
  );

  getComments = catchAsync(
    async (
      request: FastifyRequest<{
        Params: { chapterSlug: string };
        Querystring: { limit?: number; page?: number; parentCommentId?: string };
      }>,
      reply: FastifyReply
    ) => {
      const { chapterSlug } = request.params;
      const { limit, page = 1, parentCommentId } = request.query;

      const userId = request.user?.clerkId;

      const result = await this.commentService.getComments({
        chapterSlug,
        limit,
        page,
        parentCommentId,
        userId,
      });
      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.success(result, 'OK', 'Comments retrieved successfully'));
    }
  );
}

export { CommentController };
