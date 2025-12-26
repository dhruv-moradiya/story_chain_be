import { FastifyReply, FastifyRequest } from 'fastify';

import { HTTP_STATUS } from '../../constants/httpStatus';
import {
  IStoryCreateDTO,
  IStoryUpdateSettingDTO,
  TStoryCreateInviteLinkDTO,
} from '../../dto/story.dto';
import {
  TStoryAddChapterSchema,
  TStoryCreateInviteLinkSchema,
  TStoryIDSchema,
  TStorySlugSchema,
  TStoryUpdateSettingSchema,
} from '../../schema/story.schema';
import { ApiResponse } from '../../utils/apiResponse';
import { BaseModule } from '../../utils/baseClass';
import { catchAsync } from '../../utils/catchAsync';
import { storyService } from './story.service';

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
        .send(new ApiResponse(true, 'Story created successfully as a draft.', newStory));
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
        .send(new ApiResponse(true, 'Story retrieved successfully', story));
    }
  );

  getStoryBySlug = catchAsync(
    async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
      const { slug } = request.params;

      const story = await storyService.getStoryBySlug(slug);

      this.logInfo(`Fetched story ${slug}`);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Story retrieved successfully', story));
    }
  );

  // List all stories with pagination support only for SUPER_ADMIN.
  getStories = catchAsync(async (_request: FastifyRequest, reply: FastifyReply) => {
    const stories = await storyService.listStories();

    this.logInfo(`Fetched stories`);
    return reply
      .code(HTTP_STATUS.OK.code)
      .send(new ApiResponse(true, 'All stories fetched successfully', stories));
  });

  // For public feed - only stories created in last 7 days
  getNewStories = catchAsync(async (_request: FastifyRequest, reply: FastifyReply) => {
    const stories = await storyService.getNewStories();
    this.logInfo(`Fetched new stories`);
    return reply
      .code(HTTP_STATUS.OK.code)
      .send(new ApiResponse(true, 'Latest stories fetched successfully', stories));
  });

  // Get all stories created by the authenticated user.
  getMyStories = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const { user } = request;
    const userId = user.clerkId;

    const stories = await storyService.getStoriesByCreatorId(userId);

    this.logInfo(`Fetched stories for user ${userId}`);
    return reply
      .code(HTTP_STATUS.OK.code)
      .send(new ApiResponse(true, 'Your stories fetched successfully', stories));
  });

  // Get all draft stories created by the authenticated user.
  getDraftStories = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const { user } = request;
    const userId = user.clerkId;

    const stories = await storyService.getDraftStoriesByCreatorId(userId);

    this.logInfo(`Fetched draft stories for user ${userId}`);
    return reply
      .code(HTTP_STATUS.OK.code)
      .send(new ApiResponse(true, 'Your draft stories fetched successfully', stories));
  });

  // TODO: Only valid user can do this
  getStoryCollaborators = catchAsync(
    async (request: FastifyRequest<{ Params: TStoryIDSchema }>, reply: FastifyReply) => {
      const storyId = request.params.storyId;
      const userId = request.user.clerkId;

      const collaborators = await storyService.getAllCollaborators({
        storyId,
        userId,
      });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(
          new ApiResponse(
            true,
            collaborators.length === 0
              ? `No collaborators found for this story.`
              : `${collaborators.length} user${collaborators.length > 1 ? 's' : ''} found.`,
            collaborators
          )
        );
    }
  );

  // Get story tree by ID
  getStoryTree = catchAsync(
    async (request: FastifyRequest<{ Params: { storyId: string } }>, reply: FastifyReply) => {
      const { storyId } = request.params;
      const storyTree = await storyService.getStoryTree(storyId);

      this.logInfo(`Fetched story tree for story ${storyId}`);
      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Story tree loaded successfully', storyTree));
    }
  );

  // Get story tree by slug
  getStoryTreeBySlug = catchAsync(
    async (request: FastifyRequest<{ Params: TStorySlugSchema }>, reply: FastifyReply) => {
      const { slug } = request.params;
      const storyTree = await storyService.getStoryTreeBySlug(slug);

      this.logInfo(`Fetched story tree for story ${slug}`);
      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Story tree loaded successfully', storyTree));
    }
  );

  // Publish a story by ID
  publishStory = catchAsync(
    async (request: FastifyRequest<{ Params: TStoryIDSchema }>, reply: FastifyReply) => {
      const { storyId } = request.params;
      const { clerkId: userId } = request.user;

      const publishedStory = await storyService.publishStory({ storyId, userId });

      this.logInfo(`Published story ${storyId} by user ${userId}`);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Story published successfully', publishedStory));
    }
  );

  // Publish a story by slug
  publishStoryBySlug = catchAsync(
    async (request: FastifyRequest<{ Params: TStorySlugSchema }>, reply: FastifyReply) => {
      const { slug } = request.params;
      const { clerkId: userId } = request.user;

      const publishedStory = await storyService.publishStoryBySlug({ slug, userId });

      this.logInfo(`Published story ${slug} by user ${userId}`);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Story published successfully', publishedStory));
    }
  );

  // Get story collaborators by slug
  getStoryCollaboratorsBySlug = catchAsync(
    async (request: FastifyRequest<{ Params: TStorySlugSchema }>, reply: FastifyReply) => {
      const { slug } = request.params;
      const userId = request.user.clerkId;

      const collaborators = await storyService.getAllCollaboratorsBySlug({ slug, userId });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(
          new ApiResponse(
            true,
            collaborators.length === 0
              ? `No collaborators found for this story.`
              : `${collaborators.length} user${collaborators.length > 1 ? 's' : ''} found.`,
            collaborators
          )
        );
    }
  );

  // Create invitation by slug
  createInvitationBySlug = catchAsync(
    async (
      request: FastifyRequest<{ Params: TStorySlugSchema; Body: TStoryCreateInviteLinkSchema }>,
      reply: FastifyReply
    ) => {
      const { clerkId: userId, username } = request.user;
      const { slug } = request.params;
      const { role, invitedUserId, invitedUserName } = request.body;

      const invitation = await storyService.createInvitationBySlug({
        slug,
        role,
        invitedUser: {
          id: invitedUserId,
          name: invitedUserName,
        },
        inviterUser: {
          id: userId,
          name: username,
        },
      });

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(new ApiResponse(true, 'Invitation created successfully', invitation));
    }
  );

  // Update story settings by slug
  updateStorySettingBySlug = catchAsync(
    async (
      request: FastifyRequest<{ Params: TStorySlugSchema; Body: TStoryUpdateSettingSchema }>,
      reply: FastifyReply
    ) => {
      const { slug } = request.params;
      console.log('request.body :>> ', request.body);

      const story = await storyService.updateSettingBySlug({
        ...request.body,
        slug,
      });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Story setting updated successfully', story));
    }
  );

  // Add chapter to story by slug
  addChapterToStoryBySlug = catchAsync(
    async (
      request: FastifyRequest<{
        Body: TStoryAddChapterSchema;
        Params: TStorySlugSchema;
      }>,
      reply: FastifyReply
    ) => {
      const { clerkId: userId } = request.user;
      const { slug } = request.params;
      const { title, content, parentChapterId } = request.body;

      const newChapter = await storyService.addChapterToStoryBySlug({
        slug,
        userId,
        title,
        content,
        parentChapterId,
      });

      this.logInfo(`Added chapter to story ${slug} by user ${userId}`);

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(new ApiResponse(true, 'Chapter added successfully', newChapter));
    }
  );

  // --------------------
  // CHAPTER RELATED METHODS (BY ID)
  // --------------------

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

  createInvitation = catchAsync(
    async (
      request: FastifyRequest<{ Params: TStoryIDSchema; Body: TStoryCreateInviteLinkSchema }>,
      reply: FastifyReply
    ) => {
      const { clerkId: userId, username } = request.user;
      const { storyId } = request.params;
      const { role, invitedUserId, invitedUserName } = request.body;

      const input: TStoryCreateInviteLinkDTO = {
        storyId: storyId,
        role: role,
        invitedUser: {
          id: invitedUserId,
          name: invitedUserName,
        },
        inviterUser: {
          id: userId,
          name: username,
        },
      };

      const invitation = await storyService.createInvitation(input);

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(new ApiResponse(true, 'Invitation created successfully', invitation));
    }
  );

  updateStorySetting = catchAsync(
    async (
      request: FastifyRequest<{ Params: TStoryIDSchema; Body: TStoryUpdateSettingSchema }>,
      reply: FastifyReply
    ) => {
      const { storyId } = request.params;

      const input: IStoryUpdateSettingDTO = {
        ...request.body,
        storyId,
      };

      const story = await storyService.updateSetting(input);

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(new ApiResponse(true, 'Story setting updated successfully', story));
    }
  );

  getSignatureURLBySlug = catchAsync(
    async (request: FastifyRequest<{ Params: TStorySlugSchema }>, reply: FastifyReply) => {
      const userId = request.user.clerkId;
      const { slug } = request.params;

      const uploadParams = await storyService.getStoryImageUploadParams(slug, userId);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Upload parameters generated successfully', uploadParams));
    }
  );

  getStoryOverviewBySlug = catchAsync(
    async (request: FastifyRequest<{ Params: TStorySlugSchema }>, reply: FastifyReply) => {
      const { slug } = request.params;

      const overview = await storyService.getStoryOverviewBySlug(slug);
      this.logInfo(`Fetched story overview for story ${slug}`);
      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Story overview fetched successfully', overview));
    }
  );

  getStorySettingsBySlug = catchAsync(
    async (request: FastifyRequest<{ Params: TStorySlugSchema }>, reply: FastifyReply) => {
      const { slug } = request.params;

      const settings = await storyService.getStorySettingsBySlug(slug);
      this.logInfo(`Fetched story settings for story ${slug}`);
      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Story settings fetched successfully', settings));
    }
  );
}

export const storyController = new StoryController();
