import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { HTTP_STATUS } from '@constants/httpStatus';
import { TDisableAutoSaveSchema } from '@schema/request/chapterAutoSave.schema';
import {
  TAutoSaveContentSchemaVer2,
  TConvertAutoSaveToDraftSchema,
  TConvertAutoSaveToPublishedSchema,
  TEnableAutoSaveSchemaVer2Type,
} from '@schema/request/chapterAutoSaveVer2.Schema';
import { ApiResponse } from '@utils/apiResponse';
import { BaseModule } from '@utils/baseClass';
import { catchAsync } from '@utils/catchAsync';
import { ChapterAutoSaveService } from '../services/chapterAutoSave.service';

@singleton()
export class ChapterAutoSaveController extends BaseModule {
  constructor(
    @inject(TOKENS.ChapterAutoSaveService)
    private readonly chapterAutoSaveService: ChapterAutoSaveService
  ) {
    super();
  }

  enableAutoSave = catchAsync(
    async (
      request: FastifyRequest<{ Body: TEnableAutoSaveSchemaVer2Type }>,
      reply: FastifyReply
    ) => {
      const userId = request.user.clerkId;
      const input = request.body;

      const result = await this.chapterAutoSaveService.enableAutoSave({ ...input, userId });

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(new ApiResponse(true, 'Auto-save enabled successfully.', result));
    }
  );

  autoSaveContent = catchAsync(
    async (request: FastifyRequest<{ Body: TAutoSaveContentSchemaVer2 }>, reply: FastifyReply) => {
      const userId = request.user.clerkId;
      const input = request.body;

      const result = await this.chapterAutoSaveService.autoSaveContent({ ...input, userId });

      return reply.code(HTTP_STATUS.CREATED.code).send(
        new ApiResponse(true, 'Content auto-saved successfully.', {
          _id: result._id,
          saveCount: result.saveCount,
        })
      );
    }
  );

  disableAutoSave = catchAsync(
    async (request: FastifyRequest<{ Body: TDisableAutoSaveSchema }>, reply: FastifyReply) => {
      const input = request.body;

      await this.chapterAutoSaveService.disableAutoSave(input);

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(new ApiResponse(true, 'Auto-save disabled successfully.', {}));
    }
  );

  getAutoSaveDraft = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.clerkId;

    const result = await this.chapterAutoSaveService.getAutoSaveDraft({ userId });

    return reply
      .code(HTTP_STATUS.OK.code)
      .send(new ApiResponse(true, 'Auto-save draft retrieved successfully.', result));
  });

  /**
   * Convert AutoSave to Draft Chapter
   * - Only the owner of the autosave can convert it
   * - No story role permission required
   */
  convertToDraft = catchAsync(
    async (
      request: FastifyRequest<{ Body: TConvertAutoSaveToDraftSchema }>,
      reply: FastifyReply
    ) => {
      const userId = request.user.clerkId;
      const { autoSaveId } = request.body;

      const chapter = await this.chapterAutoSaveService.convertToDraft({
        autoSaveId,
        userId,
      });

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(new ApiResponse(true, 'Auto-save converted to draft chapter successfully.', chapter));
    }
  );

  /**
   * Convert AutoSave to Published Chapter
   * - Requires `canWriteChapters` permission in the story
   * - Permission is verified by route middleware (RBAC)
   */
  convertToPublished = catchAsync(
    async (
      request: FastifyRequest<{ Body: TConvertAutoSaveToPublishedSchema }>,
      reply: FastifyReply
    ) => {
      const userId = request.user.clerkId;
      const { autoSaveId } = request.body;

      const chapter = await this.chapterAutoSaveService.convertToPublished({
        autoSaveId,
        userId,
      });

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(
          new ApiResponse(true, 'Auto-save converted to published chapter successfully.', chapter)
        );
    }
  );

  /**
   * Get AutoSave by ID (helper for loading story context in middleware)
   */
  getAutoSaveById = catchAsync(
    async (request: FastifyRequest<{ Params: { autoSaveId: string } }>, reply: FastifyReply) => {
      const { autoSaveId } = request.params;

      const autoSave = await this.chapterAutoSaveService.getAutoSaveById(autoSaveId);

      if (!autoSave) {
        return reply
          .code(HTTP_STATUS.NOT_FOUND.code)
          .send(new ApiResponse(false, 'Auto-save not found.', null));
      }

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Auto-save retrieved successfully.', autoSave));
    }
  );
}
