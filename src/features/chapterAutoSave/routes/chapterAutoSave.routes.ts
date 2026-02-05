import { FastifyInstance } from 'fastify';
import zodToJsonSchema from 'zod-to-json-schema';
import { container } from 'tsyringe';
import { TOKENS } from '@/container';
import { validateAuth } from '@middleware/authHandler';
import {
  AutoSaveContentSchemaVer2,
  ConvertAutoSaveQuerySchema,
  ConvertAutoSaveSchema,
  EnableAutoSaveSchemaVer2,
  GetAutoSaveDraftQuerySchema,
} from '@schema/request/chapterAutoSaveVer2.Schema';
import { AutoSaveResponses } from '@schema/response.schema';
import { type ChapterAutoSaveController } from '../controllers/chapterAutoSave.controller';

enum ChapterAutoSaveApiRoutes {
  EnableAutoSave = '/enable',
  AutoSaveContent = '/save',
  // DisableAutoSave = '/disable',
  GetAutoSaveDraft = '/draft',
  Convert = '/convert',
}

export async function chapterAutoSaveRoutes(fastify: FastifyInstance) {
  const controller = container.resolve<ChapterAutoSaveController>(TOKENS.ChapterAutoSaveController);

  fastify.post(
    ChapterAutoSaveApiRoutes.EnableAutoSave,
    {
      preHandler: [validateAuth],
      schema: {
        description: 'Enable auto-save for a chapter',
        tags: ['Chapter Auto-Save'],
        body: zodToJsonSchema(EnableAutoSaveSchemaVer2),
        response: AutoSaveResponses.enabled,
      },
    },
    controller.enableAutoSave
  );

  fastify.post(
    ChapterAutoSaveApiRoutes.AutoSaveContent,
    {
      preHandler: [validateAuth],
      schema: {
        description: 'Auto-save chapter content',
        tags: ['Chapter Auto-Save'],
        body: zodToJsonSchema(AutoSaveContentSchemaVer2),
        response: AutoSaveResponses.saved,
      },
    },
    controller.autoSaveContent
  );

  // fastify.post(
  //   ChapterAutoSaveApiRoutes.DisableAutoSave,
  //   {
  //     preHandler: [validateAuth],
  //     schema: {
  //       description: 'Disable auto-save for a chapter',
  //       tags: ['Chapter Auto-Save'],
  //       body: zodToJsonSchema(DisableAutoSaveSchema),
  //       response: AutoSaveResponses.disabled,
  //     },
  //   },
  //   controller.disableAutoSave
  // );

  /**
   * Get auto-save draft for user
   */
  fastify.get(
    ChapterAutoSaveApiRoutes.GetAutoSaveDraft,
    {
      preHandler: [validateAuth],
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
