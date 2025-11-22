import { FastifyReply, FastifyRequest } from 'fastify';

import { HTTP_STATUS } from '../../constants/httpStatus';
import { ApiResponse } from '../../utils/apiResponse';
import { catchAsync } from '../../utils/catchAsync';
import { IStoryCreateDTO } from './dto/story.dto';
import { storyService } from './story.service';
import { BaseModule } from '../../utils';

export class StoryController extends BaseModule {
  createStory = catchAsync(
    async (request: FastifyRequest<{ Body: IStoryCreateDTO }>, reply: FastifyReply) => {
      const { body, user } = request;
      const userId = user.clerkId;

      const newStory = await storyService.createStory({
        ...body,
        creatorId: userId,
      });

      this.logInfo(`Story created: ${newStory._id} by ${userId}`);

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(new ApiResponse(true, 'Story created successfully', newStory));
    }
  );

  getStoryById = catchAsync(
    async (request: FastifyRequest<{ Params: { storyId: string } }>, reply: FastifyReply) => {
      const { storyId } = request.params;

      const story = await storyService.getStoryById(storyId);

      this.logInfo(`Fetched story ${storyId}`);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Story fetched successfully', story));
    }
  );

  // TODO: Only SUPER_ADMIN can access + Pagination
  getStories = catchAsync(async (_request: FastifyRequest, reply: FastifyReply) => {
    const stories = await storyService.getStories();

    this.logInfo(`Fetched stories`);
    return reply
      .code(HTTP_STATUS.OK.code)
      .send(new ApiResponse(true, 'Stories fetched successfully', stories));
  });

  // For public feed - only stories created in last 7 days
  getNewStories = catchAsync(async (_request: FastifyRequest, reply: FastifyReply) => {
    const stories = await storyService.getNewStories();
    this.logInfo(`Fetched new stories`);
    return reply
      .code(HTTP_STATUS.OK.code)
      .send(new ApiResponse(true, 'New stories fetched successfully', stories));
  });
}

export const storyController = new StoryController();
