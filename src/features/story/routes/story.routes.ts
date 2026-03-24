import { FastifyInstance } from 'fastify';
import type {} from '@fastify/rate-limit';
import zodToJsonSchema from 'zod-to-json-schema';
import { container } from 'tsyringe';
import { TOKENS } from '@/container';
import { StoryRoleGuards } from '@middleware/rbac/storyRole.middleware';
import {
  type AuthMiddlewareFactory,
  type PlatformRoleMiddlewareFactory,
  type StoryRoleMiddlewareFactory,
} from '@/middlewares/factories';
import { ChapterResponses, CollaboratorResponses, StoryResponses } from '@schema/response.schema';
import {
  StoryAddChapterBySlugSchema,
  StoryCreateInviteLinkSchema,
  StoryCreateSchema,
  StorySearchSchema,
  StorySlugSchema,
  StoryUpdateCardImageSchema,
  StoryUpdateCoverImageSchema,
  StoryUpdateSettingSchema,
} from '@schema/request/story.schema';
import { type StoryController } from '../controllers/story.controller';
import { type StoryCollaboratorController } from '@features/storyCollaborator/controllers/storyCollaborator.controller';
import { RateLimits } from '@/constants/rateLimits';

// Story API Routes - following chapterAutoSave pattern
const StoryApiRoutes = {
  // Story CRUD
  Create: '/',
  GetAll: '/',
  GetNew: '/new',
  GetMy: '/my',
  GetDraft: '/draft',
  Search: '/search',

  // SUPER_ADMIN only
  GetAllStories: '/all',
  CreateBulkStories: '/bulk-create',

  // QUERY
  GetBySlug: '/slug/:slug',
  GetTreeBySlug: '/slug/:slug/tree',
  GetCollaboratorsBySlug: '/slug/:slug/collaborators',
  GetStoryOverviewBySlug: '/slug/:slug/overview',
  GetSignatureUrlBySlug: '/slug/:slug/signature-url',
  GetStorySettingsBySlug: '/slug/:slug/settings',

  // UPDATE STORY STATUS
  PublishBySlug: '/slug/:slug/publish',

  // UPDATE STORY METADATA
  UpdateSettingsBySlug: '/slug/:slug/settings',
  UpdateStoryCoverImageBySlug: '/slug/:slug/cover-image',
  UpdateStoryCardImageBySlug: '/slug/:slug/card-image',

  // COLLABORATORS
  AcceptInvitationById: '/slug/:slug/collaborators/accept-invitation',
  CreateInvitationBySlug: '/slug/:slug/collaborators',
  DeclineInvitationById: '/slug/:slug/collaborators/decline-invitation',

  // CHAPTERS
  AddChapterBySlug: '/slug/:slug/chapters',
} as const;

export { StoryApiRoutes };

export async function storyRoutes(fastify: FastifyInstance) {
  const storyController = container.resolve<StoryController>(TOKENS.StoryController);
  const storyCollaboratorController = container.resolve<StoryCollaboratorController>(
    TOKENS.StoryCollaboratorController
  );

  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);
  const platformRoleFactory = container.resolve<PlatformRoleMiddlewareFactory>(
    TOKENS.PlatformRoleMiddlewareFactory
  );
  const storyRoleFactory = container.resolve<StoryRoleMiddlewareFactory>(
    TOKENS.StoryRoleMiddlewareFactory
  );

  const validateAuth = authFactory.createAuthMiddleware();
  const PlatformRoleGuards = platformRoleFactory.createGuards();
  const loadStoryContext = storyRoleFactory.createLoadContextBySlug();

  // ===============================
  // SUPER_ADMIN ROUTES
  // ===============================

  // List all stories - SUPER_ADMIN only
  fastify.get(
    StoryApiRoutes.GetAllStories,
    {
      preHandler: [validateAuth, PlatformRoleGuards.superAdmin],
      config: { rateLimit: RateLimits.AUTHENTICATED },
      schema: {
        description: 'List all stories (SUPER_ADMIN only)',
        tags: ['Stories'],
        security: [{ bearerAuth: [] }],
        response: StoryResponses.storyList,
      },
    },
    storyController.getAllStories
  );

  // Bulk create stories - SUPER_ADMIN only
  fastify.post(
    StoryApiRoutes.CreateBulkStories,
    {
      preHandler: [validateAuth, PlatformRoleGuards.superAdmin],
      config: { rateLimit: RateLimits.AUTHENTICATED },
      schema: {
        description: 'Bulk create stories (SUPER_ADMIN only)',
        tags: ['Stories'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'array',
          items: zodToJsonSchema(StoryCreateSchema),
        },
        response: StoryResponses.bulkStoryCreated,
      },
    },
    storyController.createBulkStories
  );

  // ===============================
  // STORY ROUTES (BY ID)
  // ===============================

  // Create a new story
  fastify.post(
    StoryApiRoutes.Create,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.CREATION_HOURLY },
      schema: {
        description: 'Create a new story',
        tags: ['Stories'],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(StoryCreateSchema),
        response: StoryResponses.storyCreated,
      },
    },
    storyController.createStory
  );

  // List all stories - SUPER_ADMIN only
  fastify.get(
    StoryApiRoutes.GetAll,
    {
      preHandler: [validateAuth, PlatformRoleGuards.superAdmin],
      config: { rateLimit: RateLimits.AUTHENTICATED },
      schema: {
        description: 'List all stories (SUPER_ADMIN only)',
        tags: ['Stories'],
        security: [{ bearerAuth: [] }],
        response: StoryResponses.storyList,
      },
    },
    storyController.getStories
  );

  // For public feed - only stories created in last 7 days
  fastify.get(
    StoryApiRoutes.GetNew,
    {
      config: { rateLimit: RateLimits.PUBLIC_READ },
      schema: {
        description: 'Get new/trending stories for public feed (no authentication required)',
        tags: ['Stories'],
        response: StoryResponses.storyList,
      },
    },
    storyController.getNewStories
  );

  // Get all stories created by the authenticated user
  fastify.get(
    StoryApiRoutes.GetMy,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.AUTHENTICATED },
      schema: {
        description: "Get authenticated user's stories",
        tags: ['Stories'],
        security: [{ bearerAuth: [] }],
        response: StoryResponses.storyList,
      },
    },
    storyController.getMyStories
  );

  // Get all draft stories created by the authenticated user
  fastify.get(
    StoryApiRoutes.GetDraft,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.AUTHENTICATED },
      schema: {
        description: "Get user's draft stories",
        tags: ['Stories'],
        security: [{ bearerAuth: [] }],
        response: StoryResponses.storyList,
      },
    },
    storyController.getDraftStories
  );

  // Search stories
  fastify.get(
    StoryApiRoutes.Search,
    {
      config: { rateLimit: RateLimits.PUBLIC_READ },
      schema: {
        description: 'Search stories by title or user slug',
        tags: ['Stories'],
        querystring: zodToJsonSchema(StorySearchSchema),
        response: StoryResponses.storyList,
      },
    },
    storyController.searchStories
  );

  // Fetch a single story by its slug
  fastify.get(
    StoryApiRoutes.GetBySlug,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.PUBLIC_READ },
      schema: {
        description: 'Get story by slug',
        tags: ['Stories'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StorySlugSchema),
        response: StoryResponses.storyDetails,
      },
    },
    storyController.getStoryBySlug
  );

  // ===============================
  // STORY ROUTES (BY SLUG)
  // ===============================

  // Publish a story by slug
  fastify.post(
    StoryApiRoutes.PublishBySlug,
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.canPublishStory],
      config: { rateLimit: RateLimits.CRITICAL },
      schema: {
        description: 'Publish a story by slug',
        tags: ['Stories'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StorySlugSchema),
        response: StoryResponses.storyPublished,
      },
    },
    storyController.publishStoryBySlug
  );

  // Get story tree by slug
  fastify.get(
    StoryApiRoutes.GetTreeBySlug,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.PUBLIC_READ },
      schema: {
        description: 'Get story chapter tree structure by slug',
        tags: ['Stories'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StorySlugSchema),
        response: StoryResponses.storyTree,
      },
    },
    storyController.getStoryTreeBySlug
  );

  // Update story settings by slug
  fastify.patch(
    StoryApiRoutes.UpdateSettingsBySlug,
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.canEditStorySettings],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Update story settings by slug',
        tags: ['Stories'],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(StoryUpdateSettingSchema),
        params: zodToJsonSchema(StorySlugSchema),
        response: StoryResponses.storySettings,
      },
    },
    storyController.updateStorySettingBySlug
  );

  // Get story collaborators by slug
  fastify.get(
    StoryApiRoutes.GetCollaboratorsBySlug,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.PUBLIC_READ },
      schema: {
        description: 'Get story collaborators by slug',
        tags: ['Story Collaborators'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StorySlugSchema),
        response: CollaboratorResponses.collaboratorList,
      },
    },
    storyCollaboratorController.getStoryCollaboratorsBySlug
  );

  // Create invitation for collaborator by slug
  fastify.post(
    StoryApiRoutes.CreateInvitationBySlug,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.CRITICAL },
      schema: {
        description: 'Create collaborator invitation by slug',
        tags: ['Story Collaborators'],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(StoryCreateInviteLinkSchema),
        params: zodToJsonSchema(StorySlugSchema),
        response: CollaboratorResponses.collaboratorCreated,
      },
    },
    storyCollaboratorController.createInvitationBySlug
  );

  fastify.post(
    StoryApiRoutes.AcceptInvitationById,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.CRITICAL },
      schema: {
        description: 'Accept collaborator invitation by slug',
        tags: ['Story Collaborators'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StorySlugSchema),
        response: StoryResponses.acceptInvitation,
      },
    },
    storyCollaboratorController.acceptInvitation
  );

  fastify.post(
    StoryApiRoutes.DeclineInvitationById,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.CRITICAL },
      schema: {
        description: 'Decline collaborator invitation by slug',
        tags: ['Story Collaborators'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StorySlugSchema),
        response: StoryResponses.declineInvitation,
      },
    },
    storyCollaboratorController.declineInvitation
  );

  // Add a chapter to a story by slug
  fastify.post(
    StoryApiRoutes.AddChapterBySlug,
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.canWriteChapters],
      config: { rateLimit: RateLimits.CREATION_HOURLY },
      schema: {
        description:
          'Add a chapter to a story by slug. Use "root" as parentChapterId for root chapters.',
        tags: ['Chapters'],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(StoryAddChapterBySlugSchema),
        params: zodToJsonSchema(StorySlugSchema),
        response: ChapterResponses.chapterCreated,
      },
    },
    storyController.addChapterToStoryBySlug
  );

  // Get signature URL by slug
  fastify.get(
    StoryApiRoutes.GetSignatureUrlBySlug,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Get image upload signature URL by slug',
        tags: ['Stories'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StorySlugSchema),
        response: StoryResponses.signatureUrl,
      },
    },
    storyController.getSignatureURLBySlug
  );

  fastify.get(
    StoryApiRoutes.GetStoryOverviewBySlug,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.PUBLIC_READ },
      schema: {
        description: 'Get story overview by slug',
        tags: ['Stories'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StorySlugSchema),
        response: StoryResponses.storyOverview,
      },
    },
    storyController.getStoryOverviewBySlug
  );

  fastify.get(
    StoryApiRoutes.GetStorySettingsBySlug,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.AUTHENTICATED },
      schema: {
        description: 'Get story settings by slug',
        tags: ['Stories'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StorySlugSchema),
        response: StoryResponses.storySettings,
      },
    },
    storyController.getStorySettingsBySlug
  );

  fastify.patch(
    StoryApiRoutes.UpdateStoryCoverImageBySlug,
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.canEditStorySettings],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Update story cover image by slug',
        tags: ['Stories'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StorySlugSchema),
        body: zodToJsonSchema(StoryUpdateCoverImageSchema),
        response: StoryResponses.storyCoverImageUpdated,
      },
    },
    storyController.updateStoryCoverImageBySlug
  );

  fastify.patch(
    StoryApiRoutes.UpdateStoryCardImageBySlug,
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.canEditStorySettings],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Update story card image by slug',
        tags: ['Stories'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StorySlugSchema),
        body: zodToJsonSchema(StoryUpdateCardImageSchema),
        response: StoryResponses.storyCardImageUpdated,
      },
    },
    storyController.updateStoryCardImageBySlug
  );
}
