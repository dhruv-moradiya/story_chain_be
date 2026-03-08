import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { catchAsync } from '@utils/catchAsync';
import { ApiResponse } from '@utils/apiResponse';
import { HTTP_STATUS } from '@constants/httpStatus';
import { PullRequestService } from '../services/pull-request.service';
import { TCreatePullRequestSchema } from '@schema/request/pullRequest.schema';
import { PullRequestQueryService } from '../services/pull-request-query.service';
import { TPRLabel } from '../types/pullRequest.types';

@singleton()
export class PullRequestController extends BaseModule {
  constructor(
    @inject(TOKENS.PullRequestService)
    private readonly pullRequestService: PullRequestService,
    @inject(TOKENS.PullRequestQueryService)
    private readonly pullRequestQueryService: PullRequestQueryService
  ) {
    super();
  }

  getUserPullRequests = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.clerkId;

    const prs = await this.pullRequestQueryService.getPullRequestsByUser({ userId });

    return reply
      .code(HTTP_STATUS.OK.code)
      .send(
        ApiResponse.fetched(
          prs,
          prs.length === 0 ? 'No pull requests found.' : 'Pull requests retrieved successfully.'
        )
      );
  });

  createPullRequest = catchAsync(
    async (request: FastifyRequest<{ Body: TCreatePullRequestSchema }>, reply: FastifyReply) => {
      const userId = request.user.clerkId;
      const input = request.body;

      const pr = await this.pullRequestService.create({ userId, ...input });

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(ApiResponse.created({ _id: pr._id }, 'Pull request created successfully.'));
    }
  );

  updatePRLabels = catchAsync(
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: { labels: TPRLabel[] } }>,
      reply
    ) => {
      const { id } = request.params;
      const { labels } = request.body;

      const pr = await this.pullRequestService.updatePRLable({ prId: id, labels });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(
          ApiResponse.success(pr, 'OK', 'Pull request labels updated successfully.', 'UPDATED')
        );
    }
  );
}
