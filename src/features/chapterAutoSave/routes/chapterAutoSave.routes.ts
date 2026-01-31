import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import zodToJsonSchema from 'zod-to-json-schema';
import { container } from 'tsyringe';
import { TOKENS } from '@/container';
import { validateAuth } from '@middleware/authHandler';
import { loadStoryContext, StoryRoleGuards } from '@middleware/rbac/storyRole.middleware';
import { DisableAutoSaveSchema } from '@schema/request/chapterAutoSave.schema';
import {
  AutoSaveContentSchemaVer2,
  ConvertAutoSaveToDraftSchema,
  ConvertAutoSaveToPublishedSchema,
  EnableAutoSaveSchemaVer2,
} from '@schema/request/chapterAutoSaveVer2.Schema';
import { AutoSaveResponses } from '@schema/response.schema';
import { HTTP_STATUS } from '@constants/httpStatus';
import { type ChapterAutoSaveController } from '../controllers/chapterAutoSave.controller';
import { ChapterAutoSaveService } from '../services/chapterAutoSave.service';

enum ChapterAutoSaveApiRoutes {
  EnableAutoSave = '/enable',
  AutoSaveContent = '/save',
  DisableAutoSave = '/disable',
  GetAutoSaveDraft = '/draft',
  ConvertToDraft = '/convert-to-draft',
  ConvertToPublished = '/convert-to-published',
}

/**
 * Middleware to load story context from autoSaveId in request body
 * This is needed for RBAC checks on the convertToPublished endpoint
 */
async function loadStoryContextFromAutoSave(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { autoSaveId } = request.body as { autoSaveId?: string };

  if (!autoSaveId) {
    return reply.code(HTTP_STATUS.BAD_REQUEST.code).send({
      success: false,
      error: 'Bad Request',
      message: 'autoSaveId is required.',
    });
  }

  const chapterAutoSaveService = container.resolve<ChapterAutoSaveService>(
    TOKENS.ChapterAutoSaveService
  );

  const autoSave = await chapterAutoSaveService.getAutoSaveById(autoSaveId);

  if (!autoSave) {
    return reply.code(HTTP_STATUS.NOT_FOUND.code).send({
      success: false,
      error: 'Not Found',
      message: 'Auto-save not found.',
    });
  }

  // Set storyId in params so loadStoryContext can use it
  (request.params as { storyId: string }).storyId = autoSave.storyId.toString();

  // Now call the standard loadStoryContext
  await loadStoryContext(request, reply);
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

  fastify.post(
    ChapterAutoSaveApiRoutes.DisableAutoSave,
    {
      preHandler: [validateAuth],
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
      preHandler: [validateAuth],
      schema: {
        description: 'Get auto-save draft for a chapter',
        tags: ['Chapter Auto-Save'],
        response: AutoSaveResponses.draft,
      },
    },
    controller.getAutoSaveDraft
  );

  /**
   * Convert AutoSave to Draft Chapter
   * - Only requires authentication (owner check is done in service)
   * - No story role permission required
   */
  fastify.post(
    ChapterAutoSaveApiRoutes.ConvertToDraft,
    {
      preHandler: [validateAuth],
      schema: {
        description: 'Convert auto-save to a draft chapter (owned by user)',
        tags: ['Chapter Auto-Save'],
        body: zodToJsonSchema(ConvertAutoSaveToDraftSchema),
      },
    },
    controller.convertToDraft
  );

  /**
   * Convert AutoSave to Published Chapter
   * - Requires authentication
   * - Requires `canWriteChapters` permission in the story
   * - Middleware loads story context from autoSaveId and checks permission
   */
  fastify.post(
    ChapterAutoSaveApiRoutes.ConvertToPublished,
    {
      preHandler: [validateAuth, loadStoryContextFromAutoSave, StoryRoleGuards.canWriteChapters],
      schema: {
        description:
          'Convert auto-save to a published chapter (requires canWriteChapters permission)',
        tags: ['Chapter Auto-Save'],
        body: zodToJsonSchema(ConvertAutoSaveToPublishedSchema),
      },
    },
    controller.convertToPublished
  );
}
