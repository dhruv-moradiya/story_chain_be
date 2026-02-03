import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { TOKENS } from '@/container';
import { validateAuth } from '@middleware/authHandler';
import { ChapterResponses } from '@schema/response.schema';
import { type ChapterController } from '../controllers/chapter.controller';

// Chapter API Routes
const ChapterApiRoutes = {
  GetMyChapters: '/my',

  // ID
  GetChapterById: '/:chapterId',

  // Slug
  GetChapterBySlug: '/slug/:chapterSlug',

  CreateChildChapter: '/child',
} as const;

export { ChapterApiRoutes };

export async function chapterRoutes(fastify: FastifyInstance) {
  const chapterController = container.resolve<ChapterController>(TOKENS.ChapterController);

  /**
   * Get all chapters created by the current user
   * Response: title, storySlug, chapterId, status, reads, createdAt, updatedAt, PR info, author
   */
  fastify.get(
    ChapterApiRoutes.GetMyChapters,
    {
      preHandler: [validateAuth],
      schema: {
        description: 'Get all chapters created by the current authenticated user',
        tags: ['Chapters'],
        security: [{ bearerAuth: [] }],
        response: ChapterResponses.myChapters,
      },
    },
    chapterController.getMyChapters
  );

  /**
   * Get chapter details by slug
   * Response: full chapter info with story slug, story title, author details, stats, votes
   */
  fastify.get(
    ChapterApiRoutes.GetChapterBySlug,
    {
      schema: {
        description: 'Get chapter details by slug with story and author info',
        tags: ['Chapters'],
        params: {
          type: 'object',
          properties: {
            chapterSlug: { type: 'string', description: 'Chapter slug' },
          },
          required: ['chapterSlug'],
        },
        response: ChapterResponses.chapterDetails,
      },
    },
    chapterController.getChapterBySlug
  );

  /**
   * Create a new child chapter
   * Response: full chapter info with story slug, story title, author details, stats, votes
   */
  fastify.post(
    ChapterApiRoutes.CreateChildChapter,
    {
      preHandler: [validateAuth],
      schema: {
        description: 'Create a new child chapter',
        tags: ['Chapters'],
        security: [{ bearerAuth: [] }],
        // body: ChapterSchemas.createChild,
        response: chapterController.createChild,
      },
    },
    chapterController.createChild
  );
}
