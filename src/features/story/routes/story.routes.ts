import { FastifyInstance } from 'fastify';
import zodToJsonSchema from 'zod-to-json-schema';
import { container } from 'tsyringe';
import { TOKENS } from '@/container';
import { validateAuth } from '@middleware/authHandler';
import {
  loadStoryContext,
  loadStoryContextBySlug,
  StoryRoleGuards,
} from '@middleware/rbac/storyRole.middleware';
import { PlatformRoleGuards } from '@middleware/rbac/platformRole.middleware';
import { ChapterResponses, CollaboratorResponses, StoryResponses } from '@schema/response.schema';
import {
  StoryAddChapterBySlugSchema,
  StoryAddChapterSchema,
  StoryCreateInviteLinkSchema,
  StoryCreateSchema,
  StoryIdSchema,
  StorySearchSchema,
  StorySlugSchema,
  StoryUpdateCardImageSchema,
  StoryUpdateCoverImageSchema,
  StoryUpdateSettingSchema,
} from '@schema/request/story.schema';
import { type StoryController } from '../controllers/story.controller';
import { type StoryCollaboratorController } from '@features/storyCollaborator/controllers/storyCollaborator.controller';

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

  // By Slug
  GetBySlug: '/slug/:slug',
  PublishBySlug: '/slug/:slug/publish',
  UpdateSettingsBySlug: '/slug/:slug/settings',
  UpdateStoryCoverImageBySlug: '/slug/:slug/cover-image',
  UpdateStoryCardImageBySlug: '/slug/:slug/card-image',
  GetTreeBySlug: '/slug/:slug/tree',
  GetCollaboratorsBySlug: '/slug/:slug/collaborators',
  CreateInvitationBySlug: '/slug/:slug/collaborators',
  AcceptInvitationById: '/slug/:slug/collaborators/accept-invitation',
  DeclineInvitationById: '/slug/:slug/collaborators/decline-invitation',
  AddChapterBySlug: '/slug/:slug/chapters',
  GetSignatureUrlBySlug: '/slug/:slug/signature-url',
  GetStoryOverviewBySlug: '/slug/:slug/overview',
  GetStorySettingsBySlug: '/slug/:slug/settings',

  // By ID
  GetById: '/id/:storyId',
  Publish: '/id/:storyId/publish',
  UpdateSettings: '/id/:storyId/settings',
  GetTree: '/id/:storyId/tree',
  AddChapter: '/id/:storyId/chapters',
} as const;

export { StoryApiRoutes };

export async function storyRoutes(fastify: FastifyInstance) {
  const storyController = container.resolve<StoryController>(TOKENS.StoryController);
  const storyCollaboratorController = container.resolve<StoryCollaboratorController>(
    TOKENS.StoryCollaboratorController
  );

  // ===============================
  // SUPER_ADMIN ROUTES
  // ===============================

  // List all stories - SUPER_ADMIN only
  fastify.get(
    StoryApiRoutes.GetAllStories,
    {
      preHandler: [validateAuth, PlatformRoleGuards.superAdmin],
      schema: {
        description: 'List all stories (SUPER_ADMIN only)',
        tags: ['Stories'],
        security: [{ bearerAuth: [] }],
        response: StoryResponses.storyList,
      },
    },
    storyController.getAllStories
  );

  // ===============================
  // STORY ROUTES (BY ID)
  // ===============================

  // Create a new story
  fastify.post(
    StoryApiRoutes.Create,
    {
      preHandler: [validateAuth],
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
      schema: {
        description: "Get user's draft stories",
        tags: ['Stories'],
        security: [{ bearerAuth: [] }],
        response: StoryResponses.storyList,
      },
    },
    storyController.getDraftStories
  );

  // Search stories by title
  fastify.get(
    StoryApiRoutes.Search,
    {
      schema: {
        description: 'Search stories by title',
        tags: ['Stories'],
        querystring: zodToJsonSchema(StorySearchSchema),
        response: StoryResponses.storySearch,
      },
    },
    storyController.searchStories
  );

  // Fetch a single story by its slug
  fastify.get(
    StoryApiRoutes.GetBySlug,
    {
      preHandler: [validateAuth],
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

  // Fetch a single story by its ID
  fastify.get(
    StoryApiRoutes.GetById,
    {
      preHandler: [validateAuth],
      schema: {
        description: 'Get story by ID',
        tags: ['Stories'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StoryIdSchema),
        response: StoryResponses.storyDetails,
      },
    },
    storyController.getStoryById
  );

  // Publish a story by ID
  fastify.post(
    StoryApiRoutes.Publish,
    {
      preHandler: [validateAuth],
      schema: {
        description: 'Publish a story by ID',
        tags: ['Stories'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StoryIdSchema),
        response: StoryResponses.storyPublished,
      },
    },
    storyController.publishStory
  );

  // Get story tree by ID
  fastify.get(
    StoryApiRoutes.GetTree,
    {
      preHandler: [validateAuth],
      schema: {
        description: 'Get story chapter tree structure by ID',
        tags: ['Stories'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StoryIdSchema),
        response: StoryResponses.storyTree,
      },
    },
    storyController.getStoryTree
  );

  // Update story settings by ID
  fastify.post(
    StoryApiRoutes.UpdateSettings,
    {
      preHandler: [validateAuth],
      schema: {
        description: 'Update story settings by ID',
        tags: ['Stories'],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(StoryUpdateSettingSchema),
        params: zodToJsonSchema(StoryIdSchema),
        response: StoryResponses.storySettings,
      },
    },
    storyController.updateStorySetting
  );

  // Add a chapter to a story by ID
  fastify.post(
    StoryApiRoutes.AddChapter,
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.canWriteChapters],
      schema: {
        description: 'Add a chapter to a story by ID',
        tags: ['Chapters'],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(StoryAddChapterSchema),
        params: zodToJsonSchema(StoryIdSchema),
        response: ChapterResponses.chapterCreated,
      },
    },
    storyController.addChapterToStory
  );

  // ===============================
  // STORY ROUTES (BY SLUG)
  // ===============================

  // Publish a story by slug
  fastify.post(
    StoryApiRoutes.PublishBySlug,
    {
      preHandler: [validateAuth, loadStoryContextBySlug, StoryRoleGuards.canPublishStory],
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
  fastify.post(
    StoryApiRoutes.UpdateSettingsBySlug,
    {
      preHandler: [validateAuth, loadStoryContextBySlug, StoryRoleGuards.canEditStorySettings],
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
      preHandler: [validateAuth, loadStoryContextBySlug, StoryRoleGuards.canWriteChapters],
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
      preHandler: [validateAuth, loadStoryContextBySlug, StoryRoleGuards.canEditStorySettings],
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
      preHandler: [validateAuth, loadStoryContextBySlug, StoryRoleGuards.canEditStorySettings],
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
