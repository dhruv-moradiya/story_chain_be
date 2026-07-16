import { TOKENS } from '@/container';
import { TDistributeCoinsSchema } from '@/schema/request/storyEarningsPool.schema';
import { BaseModule } from '@/utils/baseClass';
import { catchAsync } from '@/utils/catchAsync';
import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { StoryEarningsPoolService } from '../services/storyEarningsPool.service';
import { HTTP_STATUS } from '@/constants/httpStatus';
import { ApiResponse } from '@/utils/apiResponse';

@singleton()
export class StoryEarningsPoolController extends BaseModule {
  constructor(
    @inject(TOKENS.StoryEarningsPoolService)
    private readonly storyEarningsPoolService: StoryEarningsPoolService
  ) {
    super();
  }

  getStoryEarningsPool = catchAsync(
    async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
      const userId = request.user.clerkId;
      const slug = request.params.slug;

      const result = await this.storyEarningsPoolService.getStoryEarningsPool({
        userId,
        slug,
      });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.ok(result, 'Story earnings pool fetched successfully'));
    }
  );

  distributeCoins = catchAsync(
    async (
      request: FastifyRequest<{ Params: { slug: string }; Body: TDistributeCoinsSchema }>,
      reply: FastifyReply
    ) => {
      const userId = request.user.clerkId;
      const slug = request.params.slug;
      const body = request.body;

      const result = await this.storyEarningsPoolService.distributeCoins({
        userId,
        slug,
        distributions: body,
      });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.ok(result, 'Coins distributed successfully'));
    }
  );
}
