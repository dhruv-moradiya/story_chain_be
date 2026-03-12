import { TOKENS } from '@/container';
import { HTTP_STATUS } from '@/constants/httpStatus';
import { TPullRequestIdSchema } from '@/schema/request/pullRequest.schema';
import { TCastPRVoteSchema } from '@/schema/request/pr-vote.schema';
import { ApiResponse } from '@/utils/apiResponse';
import { BaseModule } from '@/utils/baseClass';
import { catchAsync } from '@/utils/catchAsync';
import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { PrVoteService } from '../services/prVote.service';

@singleton()
class PrVoteController extends BaseModule {
  constructor(
    @inject(TOKENS.PrVoteService)
    private readonly prVoteService: PrVoteService
  ) {
    super();
  }

  castVote = catchAsync(
    async (
      request: FastifyRequest<{ Body: TCastPRVoteSchema; Params: TPullRequestIdSchema }>,
      reply: FastifyReply
    ) => {
      const userId = request.user.clerkId;
      const pullRequestId = request.params.pullRequestId;
      const { vote } = request.body;

      const result = await this.prVoteService.castVote({ userId, pullRequestId, vote });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(
          ApiResponse.success(result, 'OK', 'Pull request vote recorded successfully', 'UPDATED')
        );
    }
  );

  removeVote = catchAsync(
    async (request: FastifyRequest<{ Params: TPullRequestIdSchema }>, reply: FastifyReply) => {
      const userId = request.user.clerkId;
      const pullRequestId = request.params.pullRequestId;

      const result = await this.prVoteService.removeVote({ userId, pullRequestId });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.updated(result, 'Pull request vote removed successfully'));
    }
  );

  getVoteSummary = catchAsync(
    async (request: FastifyRequest<{ Params: TPullRequestIdSchema }>, reply: FastifyReply) => {
      const userId = request.user.clerkId;
      const pullRequestId = request.params.pullRequestId;

      const result = await this.prVoteService.getVoteSummary({ userId, pullRequestId });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.success(result, 'OK', 'Pull request vote summary fetched successfully'));
    }
  );

  getUserVote = catchAsync(
    async (request: FastifyRequest<{ Params: TPullRequestIdSchema }>, reply: FastifyReply) => {
      const userId = request.user.clerkId;
      const pullRequestId = request.params.pullRequestId;

      const result = await this.prVoteService.getUserVote({ userId, pullRequestId });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.success(result, 'OK', 'Pull request vote fetched successfully'));
    }
  );
}

export { PrVoteController };
