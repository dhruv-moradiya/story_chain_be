import { FastifyInstance } from 'fastify';
import { validateAuth } from '../../middlewares/authHandler';
import { chapterController } from './chapter.controller';

export async function chapterRoutes(fastify: FastifyInstance) {
  fastify.post('/:storyId', { preHandler: [validateAuth] }, chapterController.createChapter);
}
