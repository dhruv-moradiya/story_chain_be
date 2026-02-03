import { HTTP_STATUS } from '@constants/httpStatus';
import { TOKENS } from '@container/tokens';
import { IStoryUpdateCardImageBySlugDTO, IStoryUpdateSettingDTO } from '@dto/story.dto';
import {
  TStoryAddChapterSchema,
  TStoryCreateSchema,
  TStoryIDSchema,
  TStorySearchSchema,
  TStorySlugSchema,
  TStoryUpdateCoverImageSchema,
  TStoryUpdateSettingSchema,
} from '@schema/request/story.schema';
import { ApiResponse } from '@utils/apiResponse';
import { BaseModule } from '@utils/baseClass';
import { catchAsync } from '@utils/catchAsync';
import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';

// Import focused services
import { StoryCrudService } from '../services/story-crud.service';
import { StoryQueryService } from '../services/story-query.service';
import { StoryMediaService } from '../services/story-media.service';
import { StoryPublishingService } from '../services/story-publishing.service';

// Import chapter service
import { IChapterCrudService } from '@features/chapter/services/interfaces/chapter-crud.interface';

@singleton()
export class StoryController extends BaseModule {
  constructor(
    @inject(TOKENS.StoryCrudService)
    private readonly storyCrudService: StoryCrudService,
    @inject(TOKENS.StoryQueryService)
    private readonly storyQueryService: StoryQueryService,
    @inject(TOKENS.StoryMediaService)
    private readonly storyMediaService: StoryMediaService,
    @inject(TOKENS.StoryPublishingService)
    private readonly storyPublishingService: StoryPublishingService,
    @inject(TOKENS.ChapterCrudService)
    private readonly chapterCrudService: IChapterCrudService
  ) {
    super();
  }

  // =====================
  // CRUD OPERATIONS
  // =====================

  // Handles creation of a new story for the authenticated user.
  createStory = catchAsync(
    async (request: FastifyRequest<{ Body: TStoryCreateSchema }>, reply: FastifyReply) => {
      const { body, user } = request;
      const userId = user.clerkId;

      const newStory = await this.storyCrudService.create({
        ...body,
        creatorId: userId,
      });

      this.logInfo(`Story created: ${newStory._id} by ${userId}`);

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(new ApiResponse(true, 'Story created successfully as a draft.', newStory));
    }
  );

  // TODO: Remove this endpoint that use storyId instead of slug
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

      const story = await this.storyCrudService.updateSettings(input);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Story setting updated successfully', story));
    }
  );

  // Update story settings by slug
  updateStorySettingBySlug = catchAsync(
    async (
      request: FastifyRequest<{ Params: TStorySlugSchema; Body: TStoryUpdateSettingSchema }>,
      reply: FastifyReply
    ) => {
      const { slug } = request.params;

      const story = await this.storyCrudService.updateSettingsBySlug({
        ...request.body,
        slug,
      });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Story setting updated successfully', story));
    }
  );

  // =====================
  // QUERY OPERATIONS
  // =====================

  getAllStories = catchAsync(async (_request: FastifyRequest, reply: FastifyReply) => {
    const stories = await this.storyQueryService.getAllStories();
    this.logInfo(`Fetched all stories`);
    return reply
      .code(HTTP_STATUS.OK.code)
      .send(new ApiResponse(true, 'All stories fetched successfully', stories));
  });

  // TODO: Remove this endpoint that use storyId instead of slug
  // Fetch a single story by its ID for viewing and for public access.
  getStoryById = catchAsync(
    async (request: FastifyRequest<{ Params: { storyId: string } }>, reply: FastifyReply) => {
      const { storyId } = request.params;

      const story = await this.storyQueryService.getById(storyId);

      this.logInfo(`Fetched story ${storyId}`);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Story retrieved successfully', story));
    }
  );

  getStoryBySlug = catchAsync(
    async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
      const { slug } = request.params;

      const story = await this.storyQueryService.getBySlug(slug);

      this.logInfo(`Fetched story ${slug}`);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Story retrieved successfully', story));
    }
  );

  // List all stories with pagination support only for SUPER_ADMIN.
  getStories = catchAsync(async (_request: FastifyRequest, reply: FastifyReply) => {
    const stories = await this.storyQueryService.listStories();

    this.logInfo(`Fetched stories`);
    return reply
      .code(HTTP_STATUS.OK.code)
      .send(new ApiResponse(true, 'All stories fetched successfully', stories));
  });

  // For public feed - only stories created in last 7 days
  getNewStories = catchAsync(async (_request: FastifyRequest, reply: FastifyReply) => {
    const stories = await this.storyQueryService.getNewStories();
    this.logInfo(`Fetched new stories`);
    return reply
      .code(HTTP_STATUS.OK.code)
      .send(new ApiResponse(true, 'Latest stories fetched successfully', stories));
  });

  // Get all stories created by the authenticated user.
  getMyStories = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const { user } = request;
    const userId = user.clerkId;

    const stories = await this.storyQueryService.getAllByUserId(userId);

    this.logInfo(`Fetched stories for user ${userId}`);
    return reply
      .code(HTTP_STATUS.OK.code)
      .send(new ApiResponse(true, 'Your stories fetched successfully', stories));
  });

  // Get all draft stories created by the authenticated user.
  getDraftStories = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const { user } = request;
    const userId = user.clerkId;

    const stories = await this.storyQueryService.getDraftsByUserId(userId);

    this.logInfo(`Fetched draft stories for user ${userId}`);
    return reply
      .code(HTTP_STATUS.OK.code)
      .send(new ApiResponse(true, 'Your draft stories fetched successfully', stories));
  });

  // TODO: Remove this endpoint that use storyId instead of slug
  // Get story tree by ID
  getStoryTree = catchAsync(
    async (request: FastifyRequest<{ Params: { storyId: string } }>, reply: FastifyReply) => {
      const { storyId } = request.params;
      const storyTree = await this.storyQueryService.getStoryTree(storyId);

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
      const storyTree = await this.storyQueryService.getStoryTreeBySlug(slug);

      this.logInfo(`Fetched story tree for story ${slug}`);
      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Story tree loaded successfully', storyTree));
    }
  );

  getStoryOverviewBySlug = catchAsync(
    async (request: FastifyRequest<{ Params: TStorySlugSchema }>, reply: FastifyReply) => {
      const { slug } = request.params;

      const overview = await this.storyQueryService.getStoryOverviewBySlug(slug);

      this.logInfo(`Fetched story overview for story ${slug}`);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Story overview fetched successfully', overview));
    }
  );

  getStorySettingsBySlug = catchAsync(
    async (request: FastifyRequest<{ Params: TStorySlugSchema }>, reply: FastifyReply) => {
      const { slug } = request.params;

      const settings = await this.storyQueryService.getStorySettingsBySlug(slug);
      this.logInfo(`Fetched story settings for story ${slug}`);
      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Story settings fetched successfully', settings));
    }
  );

  searchStories = catchAsync(
    async (request: FastifyRequest<{ Querystring: TStorySearchSchema }>, reply: FastifyReply) => {
      const { q, limit } = request.query;

      const stories = await this.storyQueryService.searchStoriesByTitle(q, limit);

      this.logInfo(`Searched stories with query: ${q}`);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, `Found ${stories.length} stories`, stories));
    }
  );

  // =====================
  // PUBLISHING OPERATIONS
  // =====================

  // TODO: Remove this endpoint that use storyId instead of slug
  // Publish a story by ID
  publishStory = catchAsync(
    async (request: FastifyRequest<{ Params: TStoryIDSchema }>, reply: FastifyReply) => {
      const { storyId } = request.params;
      const { clerkId: userId } = request.user;

      // Get story first to get slug, then publish
      const story = await this.storyQueryService.getById(storyId);
      const publishedStory = await this.storyPublishingService.publish(story.slug, userId);

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

      const publishedStory = await this.storyPublishingService.publish(slug, userId);

      this.logInfo(`Published story ${slug} by user ${userId}`);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Story published successfully', publishedStory));
    }
  );

  // =====================
  // MEDIA OPERATIONS
  // =====================

  getSignatureURLBySlug = catchAsync(
    async (request: FastifyRequest<{ Params: TStorySlugSchema }>, reply: FastifyReply) => {
      const userId = request.user.clerkId;
      const { slug } = request.params;

      const uploadParams = await this.storyMediaService.getImageUploadParams(slug, userId);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Upload parameters generated successfully', uploadParams));
    }
  );

  updateStoryCoverImageBySlug = catchAsync(
    async (
      request: FastifyRequest<{ Params: TStorySlugSchema; Body: TStoryUpdateCoverImageSchema }>,
      reply: FastifyReply
    ) => {
      const { slug } = request.params;
      const { coverImage: coverImageInfo } = request.body;

      const coverImage = await this.storyMediaService.addOrUpdateCoverImage({
        slug,
        coverImage: coverImageInfo,
      });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Story cover image updated successfully', coverImage));
    }
  );

  updateStoryCardImageBySlug = catchAsync(
    async (
      request: FastifyRequest<{ Params: TStorySlugSchema; Body: IStoryUpdateCardImageBySlugDTO }>,
      reply: FastifyReply
    ) => {
      const { slug } = request.params;
      const { cardImage: cardImageInfo } = request.body;

      const cardImage = await this.storyMediaService.addOrUpdateCardImage({
        slug,
        cardImage: cardImageInfo,
      });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Story card image updated successfully', cardImage));
    }
  );

  // =====================
  // CHAPTER OPERATIONS
  // =====================

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
      const { title, content, parentChapterSlug } = request.body;

      // Get story by slug to get storyId
      const story = await this.storyQueryService.getBySlug(slug);

      let newChapter;
      if (!parentChapterSlug) {
        // Create root chapter
        newChapter = await this.chapterCrudService.createRoot({
          storySlug: story.slug,
          userId,
          title,
          content,
        });
      } else {
        // Create child chapter
        newChapter = await this.chapterCrudService.createChild({
          storySlug: story.slug,
          userId,
          title,
          content,
          parentChapterSlug,
        });
      }

      this.logInfo(`Added chapter to story ${slug} by user ${userId}`);

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(new ApiResponse(true, 'Chapter added successfully', newChapter));
    }
  );

  // TODO: Remove this endpoint that use storyId instead of slug
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
      const { title, content, parentChapterSlug } = request.body;

      const story = await this.storyQueryService.getById(storyId);

      let newChapter;
      if (!parentChapterSlug) {
        // Create root chapter
        newChapter = await this.chapterCrudService.createRoot({
          storySlug: story.slug,
          userId,
          title,
          content,
        });
      } else {
        // Create child chapter
        newChapter = await this.chapterCrudService.createChild({
          storySlug: story.slug,
          userId,
          title,
          content,
          parentChapterSlug,
        });
      }

      this.logInfo(`Added chapter to story ${storyId} by user ${userId}`);

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(new ApiResponse(true, 'Chapter added successfully', newChapter));
    }
  );
}
