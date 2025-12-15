import { FastifyInstance } from 'fastify';
import { validateAuth } from '../../middlewares/authHandler';
import { validateSuperAdmin } from '../../middlewares/story/story.middleware';
import {
  StoryAddChapterSchema,
  StoryCreateInviteLinkSchema,
  StoryCreateSchema,
  StoryIdSchema,
} from '../../schema/story.schema';
import { storyController } from './story.controller';
import zodToJsonSchema from 'zod-to-json-schema';
import { loadStoryContext, StoryRoleGuards } from '../../middlewares/rbac/storyRole.middleware';

export async function storyRoutes(fastify: FastifyInstance) {
  // ---------------
  // STORY ROUTES
  // ---------------

  // Create a new story
  fastify.post(
    '/',
    {
      preHandler: [validateAuth],
      schema: {
        body: zodToJsonSchema(StoryCreateSchema),
      },
    },
    storyController.createStory
  );

  // List all stories - SUPER_ADMIN only
  fastify.get('/', { preHandler: [validateAuth, validateSuperAdmin] }, storyController.getStories);

  // For public feed - only stories created in last 7 days
  fastify.get('/new', storyController.getNewStories);

  // Get all stories created by the authenticated user.
  fastify.get('/my', { preHandler: [validateAuth] }, storyController.getMyStories);

  // Fetch a single story by its ID for viewing and for public access.
  fastify.get('/:slug', { preHandler: [validateAuth] }, storyController.getStoryBySlug);

  fastify.get('/:storyId/tree', { preHandler: [validateAuth] }, storyController.getStoryTree);

  fastify.get(
    '/:storyId/collaborators',
    { preHandler: [validateAuth] },
    storyController.getStoryCollaborators
  );

  fastify.post(
    '/:storyId/collaborators',
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.canInvite],
      schema: {
        body: zodToJsonSchema(StoryCreateInviteLinkSchema),
        params: zodToJsonSchema(StoryIdSchema),
      },
    },
    storyController.createInvitation
  );

  // fastify.get('/:storyId', storyController.getStoryById);

  // ---------------
  // CHAPTER ROUTES
  // ---------------

  // Add a chapter to a story
  fastify.post(
    '/:storyId/chapters',
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.canWriteChapters],
      schema: {
        body: zodToJsonSchema(StoryAddChapterSchema),
        params: zodToJsonSchema(StoryIdSchema),
      },
    },
    storyController.addChapterToStory
  );
}
