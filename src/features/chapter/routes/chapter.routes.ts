import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import zodToJsonSchema from 'zod-to-json-schema';
import { TOKENS } from '@/container';
import { type AuthMiddlewareFactory } from '@/middlewares/factories';
import { ChapterResponses } from '@schema/response.schema';
import { ChapterSearchSchema } from '@schema/request/chapter.schema';
import { type ChapterController } from '../controllers/chapter.controller';
import { RateLimits } from '@/constants/rateLimits';
import type {} from '@fastify/rate-limit';

// Chapter API Routes
const ChapterApiRoutes = {
  GetMyChapters: '/my',
  Search: '/search',

  // ID
  GetChapterById: '/:chapterId',

  // Slug
  GetChapterBySlug: '/slug/:chapterSlug',

  CreateChildChapter: '/child',
} as const;

export { ChapterApiRoutes };

export async function chapterRoutes(fastify: FastifyInstance) {
  const chapterController = container.resolve<ChapterController>(TOKENS.ChapterController);

  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);
  const validateAuth = authFactory.createAuthMiddleware();

  fastify.get(
    ChapterApiRoutes.Search,
    {
      config: { rateLimit: RateLimits.PUBLIC_READ },
      schema: {
        description: 'Search chapters by title, slug, story slug or author',
        tags: ['Chapters'],
        querystring: zodToJsonSchema(ChapterSearchSchema),
        response: ChapterResponses.chapterSearch,
      },
    },
    chapterController.searchChapters
  );

  /**
   * Get all chapters created by the current user
   * Response: title, storySlug, chapterId, status, reads, createdAt, updatedAt, PR info, author
   */
  fastify.get(
    ChapterApiRoutes.GetMyChapters,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.AUTHENTICATED },
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
      config: { rateLimit: RateLimits.PUBLIC_READ },
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
      config: { rateLimit: RateLimits.CREATION_HOURLY },
      schema: {
        description: 'Create a new child chapter',
        tags: ['Chapters'],
        security: [{ bearerAuth: [] }],
        // body: ChapterSchemas.createChild,
        response: ChapterResponses.chapterCreated,
      },
    },
    chapterController.createChild
  );
}
