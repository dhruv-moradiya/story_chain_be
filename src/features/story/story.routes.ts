import { FastifyInstance } from 'fastify';
import { validateAuth } from '../../middlewares/authHandler';
import { validateRequest } from '../../middlewares/validateRequest';
import { createStorySchema } from './story.validation';
import { storyController } from './story.controller';
import { validateSuperAdmin } from '../../middlewares/story/story.middleware';

export async function storyRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/',
    { preHandler: [validateAuth, validateRequest(createStorySchema)] },
    storyController.createStory
  );

  fastify.get('/', { preHandler: [validateAuth, validateSuperAdmin] }, storyController.getStories);

  // For public feed - only stories created in last 7 days
  fastify.get('/new', storyController.getNewStories);

  fastify.get('/:storyId', storyController.getStoryById);
}
