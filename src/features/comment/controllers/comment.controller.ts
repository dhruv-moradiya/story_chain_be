import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { CommentService } from '../services/comment.service';
import { TOKENS } from '@/container';
import { catchAsync } from '@/utils/catchAsync';
import { FastifyReply, FastifyRequest } from 'fastify';
import {
  IAddCommentDTO,
  IDeleteCommentDTO,
  IGetCommentDTO,
  IGetCommentsDTO,
  IUpdateCommentDTO,
} from '@/dto/comments.dto';
import { HTTP_STATUS } from '@/constants/httpStatus';
import { ApiResponse } from '@/utils/apiResponse';

@singleton()
class CommentController extends BaseModule {
  constructor(@inject(TOKENS.CommentService) private readonly commentService: CommentService) {
    super();
  }

  addComment = catchAsync(
    async (request: FastifyRequest<{ Body: IAddCommentDTO }>, reply: FastifyReply) => {
      const userId = request.user.clerkId;
      const input = request.body;

      await this.commentService.addComment({ ...input, userId });

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(ApiResponse.created(null, 'Comment created successfully'));
    }
  );

  updateComment = catchAsync(
    async (request: FastifyRequest<{ Body: IUpdateCommentDTO }>, reply: FastifyReply) => {
      const userId = request.user.clerkId;
      const input = request.body;
      // We pass userId to service for ownership check
      await this.commentService.updateComment({ ...input, userId });
      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.updated(null, 'Comment updated successfully'));
    }
  );

  deleteComment = catchAsync(
    async (request: FastifyRequest<{ Params: IDeleteCommentDTO }>, reply: FastifyReply) => {
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
    async (request: FastifyRequest<{ Params: IGetCommentDTO }>, reply: FastifyReply) => {
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
        Params: IGetCommentsDTO;
        Querystring: { limit?: number; cursor?: string; parentCommentId?: string };
      }>,
      reply: FastifyReply
    ) => {
      const { chapterSlug } = request.params;
      const { limit, cursor, parentCommentId } = request.query;

      const result = await this.commentService.getComments({
        chapterSlug,
        limit,
        cursor,
        parentCommentId,
      });
      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.success(result, 'OK', 'Comments retrieved successfully'));
    }
  );
}

export { CommentController };
