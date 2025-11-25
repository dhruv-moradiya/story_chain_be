import { FastifyInstance } from 'fastify';
import { validateAuth } from '../../middlewares/authHandler';
import { chapterController } from './chapter.controller';

export async function chapterRoutes(fastify: FastifyInstance) {
  fastify.get('/:storyId/tree', { preHandler: [validateAuth] }, chapterController.getStoryTree);
}
