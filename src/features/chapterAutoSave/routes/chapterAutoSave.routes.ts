import { FastifyInstance } from 'fastify';
import zodToJsonSchema from 'zod-to-json-schema';
import { container } from 'tsyringe';
import { TOKENS } from '@/container';
import { type AuthMiddlewareFactory } from '@/middlewares/factories';
import {
  AutoSaveContentSchemaVer2,
  ChapterAutoSaveSearchSchema,
  ConvertAutoSaveQuerySchema,
  ConvertAutoSaveSchema,
  GetAutoSaveDraftQuerySchema,
} from '@schema/request/chapterAutoSaveVer2.Schema';
import { AutoSaveResponses } from '@schema/response.schema';
import { type ChapterAutoSaveController } from '../controllers/chapterAutoSave.controller';
import { RateLimits } from '@/constants/rateLimits';
import type {} from '@fastify/rate-limit';

enum ChapterAutoSaveApiRoutes {
  AutoSaveContent = '/save',
  GetAutoSaveDraft = '/draft',
  Convert = '/convert',
  Search = '/search',
}

export async function chapterAutoSaveRoutes(fastify: FastifyInstance) {
  const controller = container.resolve<ChapterAutoSaveController>(TOKENS.ChapterAutoSaveController);

  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);
  const validateAuth = authFactory.createAuthMiddleware();

  fastify.get(
    ChapterAutoSaveApiRoutes.Search,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.AUTHENTICATED },
      schema: {
        description: 'Search auto-saves by title, story slug or chapter slug',
        tags: ['Chapter Auto-Save'],
        security: [{ bearerAuth: [] }],
        querystring: zodToJsonSchema(ChapterAutoSaveSearchSchema),
        response: AutoSaveResponses.search,
      },
    },
    controller.searchAutoSaves
  );

  fastify.post(
    ChapterAutoSaveApiRoutes.AutoSaveContent,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.FAST_WRITE },
      schema: {
        description: 'Auto-save chapter content',
        tags: ['Chapter Auto-Save'],
        body: zodToJsonSchema(AutoSaveContentSchemaVer2),
        response: AutoSaveResponses.saved,
      },
    },
    controller.autoSaveContent
  );

  /**
   * Get auto-save draft for user
   */
  fastify.get(
    ChapterAutoSaveApiRoutes.GetAutoSaveDraft,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.AUTHENTICATED },
      schema: {
        description: 'Get auto-save draft for a chapter',
        tags: ['Chapter Auto-Save'],
        querystring: zodToJsonSchema(GetAutoSaveDraftQuerySchema),
        response: AutoSaveResponses.draft,
      },
    },
    controller.getAutoSaveDraft
  );

  /**
   * Convert AutoSave to Draft or Published Chapter
   * - type=draft: Only the owner of the autosave can convert it (no role required)
   * - type=publish: Requires canWriteChapters permission in the story
   */
  fastify.post(
    ChapterAutoSaveApiRoutes.Convert,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Convert auto-save to a draft or published chapter',
        tags: ['Chapter Auto-Save'],
        querystring: zodToJsonSchema(ConvertAutoSaveQuerySchema),
        body: zodToJsonSchema(ConvertAutoSaveSchema),
      },
    },
    controller.convertAutoSave
  );
}
