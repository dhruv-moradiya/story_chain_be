import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { catchAsync } from '@utils/catchAsync';
import { ApiResponse } from '@utils/apiResponse';
import { HTTP_STATUS } from '@constants/httpStatus';
import { PullRequestService } from '../services/pullRequest.service';
import { TCreatePullRequestSchema } from '@schema/request/pullRequest.schema';

@singleton()
export class PullRequestController extends BaseModule {
  constructor(
    @inject(TOKENS.PullRequestService)
    private readonly pullRequestService: PullRequestService
  ) {
    super();
  }

  createPullRequest = catchAsync(
    async (request: FastifyRequest<{ Body: TCreatePullRequestSchema }>, reply: FastifyReply) => {
      const userId = request.user.clerkId;
      const input = request.body;

      const pr = await this.pullRequestService.create({ userId, ...input });

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(ApiResponse.success(pr, 'CREATED', HTTP_STATUS.CREATED.message, 'CREATED'));
    }
  );
}
