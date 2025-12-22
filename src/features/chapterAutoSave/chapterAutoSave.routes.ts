import { FastifyInstance } from 'fastify';
import { ChapterAutoSaveController } from './chapterAutoSave.controller';
import {
  EnableAutoSaveSchema,
  AutoSaveContentSchema,
  DisableAutoSaveSchema,
} from '../../schema/chapterAutoSave.schema';
import zodToJsonSchema from 'zod-to-json-schema';
import { AutoSaveResponses } from '../../schema/response.schema';

enum ChapterAutoSaveApiRoutes {
  EnableAutoSave = '/enable',
  AutoSaveContent = '/save',
  DisableAutoSave = '/disable',
  GetAutoSaveDraft = '/draft',
}

export async function chapterAutoSaveRoutes(fastify: FastifyInstance) {
  const controller = new ChapterAutoSaveController();

  fastify.post(
    ChapterAutoSaveApiRoutes.EnableAutoSave,
    {
      schema: {
        description: 'Enable auto-save for a chapter',
        tags: ['Chapter Auto-Save'],
        body: zodToJsonSchema(EnableAutoSaveSchema),
        response: AutoSaveResponses.enabled,
      },
    },
    controller.enableAutoSave
  );

  fastify.post(
    ChapterAutoSaveApiRoutes.AutoSaveContent,
    {
      schema: {
        description: 'Auto-save chapter content',
        tags: ['Chapter Auto-Save'],
        body: zodToJsonSchema(AutoSaveContentSchema),
        response: AutoSaveResponses.saved,
      },
    },
    controller.autoSaveContent
  );

  fastify.post(
    ChapterAutoSaveApiRoutes.DisableAutoSave,
    {
      schema: {
        description: 'Disable auto-save for a chapter',
        tags: ['Chapter Auto-Save'],
        body: zodToJsonSchema(DisableAutoSaveSchema),
        response: AutoSaveResponses.disabled,
      },
    },
    controller.disableAutoSave
  );

  fastify.get(
    ChapterAutoSaveApiRoutes.GetAutoSaveDraft,
    {
      schema: {
        description: 'Get auto-save draft for a chapter',
        tags: ['Chapter Auto-Save'],
        response: AutoSaveResponses.draft,
      },
    },
    controller.getAutoSaveDraft
  );
}
