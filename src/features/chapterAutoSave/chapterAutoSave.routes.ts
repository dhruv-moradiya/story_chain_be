import { FastifyInstance } from 'fastify';
import { ChapterAutoSaveController } from './chapterAutoSave.controller';
import {
  EnableAutoSaveSchema,
  AutoSaveContentSchema,
  DisableAutoSaveSchema,
} from '../../schema/chapterAutoSave.schema';
import zodToJsonSchema from 'zod-to-json-schema';

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
        body: zodToJsonSchema(EnableAutoSaveSchema),
      },
    },
    controller.enableAutoSave
  );

  fastify.post(
    ChapterAutoSaveApiRoutes.AutoSaveContent,
    {
      schema: {
        body: zodToJsonSchema(AutoSaveContentSchema),
      },
    },
    controller.autoSaveContent
  );

  fastify.post(
    ChapterAutoSaveApiRoutes.DisableAutoSave,
    {
      schema: {
        body: zodToJsonSchema(DisableAutoSaveSchema),
      },
    },
    controller.disableAutoSave
  );

  fastify.get(ChapterAutoSaveApiRoutes.GetAutoSaveDraft, controller.getAutoSaveDraft);
}
