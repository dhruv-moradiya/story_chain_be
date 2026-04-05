import { TOKENS } from '@/container';
import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { PRQueryService } from '../services/pr-query.service';
import { FastifyReply, FastifyRequest } from 'fastify';
import { catchAsync } from '@/utils/catchAsync';
import { HTTP_STATUS } from '@/constants/httpStatus';
import { ApiResponse } from '@/utils/apiResponse';

@singleton()
export class PRQueryController extends BaseModule {
  constructor(@inject(TOKENS.PRQueryService) private readonly prQueryService: PRQueryService) {
    super();
  }

  getCurrentUserPullRequests = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const useId = request.user.clerkId;

    const pullRequests = await this.prQueryService.getCurrentUserPullRequests(useId);

    return reply
      .code(HTTP_STATUS.OK.code)
      .send(
        ApiResponse.success(
          pullRequests,
          'OK',
          "Fetched current user's pull requests successfully",
          'FETCHED'
        )
      );
  });
}
