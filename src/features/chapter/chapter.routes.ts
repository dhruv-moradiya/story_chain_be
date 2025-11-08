import { FastifyInstance } from 'fastify';
import { validateAuth } from '../../middlewares/authHandler';
import { ChapterController } from './chapter.controller';

export async function chapterRoutes(fastify: FastifyInstance) {
  fastify.post('/:storyId', { preHandler: [validateAuth] }, ChapterController.createChapter);
}
