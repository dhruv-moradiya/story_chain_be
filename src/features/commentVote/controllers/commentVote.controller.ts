import { HTTP_STATUS } from '@/constants/httpStatus';
import { TOKENS } from '@/container';
import {
  TCastCommentVoteSchema,
  TRemoveCommentVoteSchema,
} from '@/schema/request/commentVote.schem';
import { ApiResponse, ApiError } from '@/utils/apiResponse';
import { catchAsync } from '@/utils/catchAsync';
import { BaseModule } from '@utils/baseClass';
import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { CommentVoteService } from '../services/commentVote.service';

@singleton()
export class CommentVoteController extends BaseModule {
  constructor(
    @inject(TOKENS.CommentVoteService)
    private readonly commentVoteService: CommentVoteService
  ) {
    super();
  }

  castVote = catchAsync(
    async (request: FastifyRequest<{ Body: TCastCommentVoteSchema }>, reply: FastifyReply) => {
      const userId = request.user.clerkId;
      const { commentId, voteType } = request.body;

      const vote = await this.commentVoteService.castVote({ commentId, userId, voteType });

      this.logDebug('Vote cast successfully', { vote });

      return reply.code(HTTP_STATUS.OK.code).send(ApiResponse.success('Vote cast successfully'));
    }
  );

  removeVote = catchAsync(
    async (request: FastifyRequest<{ Body: TRemoveCommentVoteSchema }>, reply: FastifyReply) => {
      const userId = request.user.clerkId;
      const { commentId } = request.body;

      const result = await this.commentVoteService.removeVote({ commentId, userId });

      if (!result.success) {
        throw ApiError.notFound('Vote not found');
      }

      this.logDebug('Vote removed successfully', { commentId, userId });

      return reply.code(HTTP_STATUS.OK.code).send(ApiResponse.success('Vote removed successfully'));
    }
  );
}
