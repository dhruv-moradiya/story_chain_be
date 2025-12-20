import { FastifyInstance } from 'fastify';

enum ChapterApiRoutes {
  EnableAutoSave = '/autosave/enable',
  AutoSaveContent = '',
  DisableAutoSave = '',
  GetAutoSaveDraft = '',
}

export async function chapterRoutes(fastify: FastifyInstance) {}
