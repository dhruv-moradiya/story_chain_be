import { TOKENS } from '@/container';
import { BaseModule } from '@/utils/baseClass';
import { catchAsync } from '@/utils/catchAsync';
import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { FollowService } from '../services/follow.service';
import { TToggleFollowRequest } from '@/schema/request/follow.schema';
import { HTTP_STATUS } from '@/constants/httpStatus';
import { ApiResponse } from '@/utils/apiResponse';

@singleton()
export class FollowController extends BaseModule {
  constructor(
    @inject(TOKENS.FollowService)
    private readonly followService: FollowService
  ) {
    super();
  }

  toggleFollow = catchAsync(
    async (request: FastifyRequest<{ Body: TToggleFollowRequest }>, reply: FastifyReply) => {
      const userId = request.user.userId;
      const { followingId } = request.body;

      await this.followService.toggleFollow({ userId, followingId });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.ok(null, 'Follow status updated successfully'));
    }
  );
}
