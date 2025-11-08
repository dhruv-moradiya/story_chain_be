import { FastifyInstance } from 'fastify';
import { validateAuth } from '../../middlewares/authHandler';
import { StoryController } from './story.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { createStorySchema } from './story.validation';

export async function storyRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/',
    { preHandler: [validateAuth, validateRequest(createStorySchema)] },
    StoryController.addNewStory
  );
}
