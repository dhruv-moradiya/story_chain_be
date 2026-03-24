import { HTTP_STATUS } from '@/constants/httpStatus';
import { TOKENS } from '@/container';
import { TCastCommentVoteSchema } from '@/schema/request/commentVote.schem';
import { ApiResponse } from '@/utils/apiResponse';
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
}
