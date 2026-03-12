import { TOKENS } from '@/container';
import { HTTP_STATUS } from '@/constants/httpStatus';
import { IGetPRReviewsDTO } from '@/dto/pr-review.dto';
import { TPullRequestIdSchema } from '@/schema/request/pullRequest.schema';
import { TSubmitPRReviewSchema } from '@/schema/request/pr-review.schema';
import { ApiResponse } from '@/utils/apiResponse';
import { BaseModule } from '@/utils/baseClass';
import { catchAsync } from '@/utils/catchAsync';
import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { PrReviewService } from '../services/prReview.service';

@singleton()
class PrReviewController extends BaseModule {
  constructor(
    @inject(TOKENS.PrReviewService)
    private readonly prReviewService: PrReviewService
  ) {
    super();
  }

  submitReview = catchAsync(
    async (
      request: FastifyRequest<{ Body: TSubmitPRReviewSchema; Params: TPullRequestIdSchema }>,
      reply: FastifyReply
    ) => {
      const userId = request.user.clerkId;
      const pullRequestId = request.params.pullRequestId;
      const body = request.body;

      const review = await this.prReviewService.submitReview({
        userId,
        pullRequestId,
        ...body,
      });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(
          ApiResponse.success(review, 'OK', 'Pull request review submitted successfully', 'UPDATED')
        );
    }
  );

  getPRReviews = catchAsync(
    async (request: FastifyRequest<{ Params: TPullRequestIdSchema }>, reply: FastifyReply) => {
      const userId = request.user.clerkId;
      const input: IGetPRReviewsDTO = {
        userId,
        pullRequestId: request.params.pullRequestId,
      };

      const reviews = await this.prReviewService.getPRReviews(input);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.success(reviews, 'OK', 'Pull request reviews fetched successfully'));
    }
  );

  getMyPRReview = catchAsync(
    async (request: FastifyRequest<{ Params: TPullRequestIdSchema }>, reply: FastifyReply) => {
      const userId = request.user.clerkId;
      const input: IGetPRReviewsDTO = {
        userId,
        pullRequestId: request.params.pullRequestId,
      };

      const review = await this.prReviewService.getMyPRReview(input);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.success(review, 'OK', 'Pull request review fetched successfully'));
    }
  );
}

export { PrReviewController };
