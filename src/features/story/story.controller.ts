import { FastifyReply, FastifyRequest } from 'fastify';

import { catchAsync } from '../../utils/catchAsync';
import { storyService } from './story.service';
import { HTTP_STATUS } from '../../constants/httpStatus';
import { ApiResponse } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';
import { CreateStoryInput } from './story.validation';

export class StoryController {
  /**
   * Create a new story
   */
  static addNewStory = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const storyData = request.body as CreateStoryInput;

    const userId = request.userId;
    if (!userId) {
      return reply
        .code(HTTP_STATUS.UNAUTHORIZED.code)
        .send(new ApiResponse(false, 'Unauthorized: User ID is missing from request'));
    }

    const newStory = await storyService.createStory({
      ...storyData,
      creatorId: userId,
    });

    logger.info(`New story created with ID: ${newStory._id} by User: ${userId}`);

    return reply
      .code(HTTP_STATUS.CREATED.code)
      .send(new ApiResponse(true, 'Story created successfully', newStory));
  });
}
