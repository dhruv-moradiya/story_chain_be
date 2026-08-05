import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { catchAsync } from '@utils/catchAsync';
import { ApiResponse } from '@utils/apiResponse';
import { HTTP_STATUS } from '@constants/httpStatus';
import { StoryBanService } from '../services/storyBan.service';
import { TCheckStoryBanParamsInput } from '@/schema/request/storyBan.schema';

@singleton()
export class StoryBanController {
  constructor(
    @inject(TOKENS.StoryBanService)
    private readonly storyBanService: StoryBanService
  ) {}

  checkUserStoryBan = catchAsync(
    async (
      request: FastifyRequest<{
        Params: TCheckStoryBanParamsInput;
      }>,
      reply: FastifyReply
    ) => {
      const { storySlug, userId } = request.params;
      const result = await this.storyBanService.checkUserBanFromStory(storySlug, userId);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(
          ApiResponse.success(result, 'OK', 'Story ban status retrieved successfully.', 'FETCHED')
        );
    }
  );
}
