import { FastifyReply, FastifyRequest } from 'fastify';

import { HTTP_STATUS } from '../../constants/httpStatus';
import { ApiResponse } from '../../utils/apiResponse';
import { catchAsync } from '../../utils/catchAsync';
import { IStoryCreateDTO } from './dto/story.dto';
import { storyService } from './story.service';
import { BaseModule } from '../../utils/baseClass';
import { TStoryAddChapterSchema } from '../../schema/story.schema';

export class StoryController extends BaseModule {
  // Handles creation of a new story for the authenticated user.
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

  // Fetch a single story by its ID for viewing and for public access.
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

  // List all stories with pagination support only for SUPER_ADMIN.
  getStories = catchAsync(async (_request: FastifyRequest, reply: FastifyReply) => {
    const stories = await storyService.listStories();

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

  // Get all stories created by the authenticated user.
  getMyStories = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const { user } = request;
    const userId = user.clerkId;

    const stories = await storyService.getStoriesByCreatorId(userId);

    this.logInfo(`Fetched stories for user ${userId}`);
    return reply
      .code(HTTP_STATUS.OK.code)
      .send(new ApiResponse(true, 'Stories fetched successfully', stories));
  });

  // Get all draft stories created by the authenticated user.
  getDraftStories = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const { user } = request;
    const userId = user.clerkId;

    const stories = await storyService.getDraftStoriesByCreatorId(userId);

    this.logInfo(`Fetched draft stories for user ${userId}`);
    return reply
      .code(HTTP_STATUS.OK.code)
      .send(new ApiResponse(true, 'Draft stories fetched successfully', stories));
  });

  // TODO: Add story tree fetching logic
  getStoryTree = catchAsync(
    async (request: FastifyRequest<{ Params: { storyId: string } }>, reply: FastifyReply) => {
      const { storyId } = request.params;
      const storyTree = await storyService.getStoryTree(storyId);

      this.logInfo(`Fetched story tree for story ${storyId}`);
      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Story tree fetched successfully', storyTree));
    }
  );

  // Add a chapter to a story by the authenticated user.
  addChapterToStory = catchAsync(
    async (
      request: FastifyRequest<{
        Body: TStoryAddChapterSchema;
        Params: { storyId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { clerkId: userId } = request.user;
      const { storyId } = request.params;

      const { title, content, parentChapterId } = request.body;

      const newChapter = await storyService.addChapterToStory({
        storyId,
        userId,
        title,
        content,
        parentChapterId,
      });

      this.logInfo(`Added chapter to story ${storyId} by user ${userId}`);

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(new ApiResponse(true, 'Chapter added successfully', newChapter));
    }
  );
}

export const storyController = new StoryController();
