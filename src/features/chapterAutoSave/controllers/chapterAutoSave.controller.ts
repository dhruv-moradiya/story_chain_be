import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { HTTP_STATUS } from '@constants/httpStatus';
import { TDisableAutoSaveSchema } from '@schema/request/chapterAutoSave.schema';
import {
  TAutoSaveContentSchemaVer2,
  TConvertAutoSaveQuerySchema,
  TConvertAutoSaveSchema,
  TEnableAutoSaveSchemaVer2Type,
  TGetAutoSaveDraftQuerySchema,
} from '@schema/request/chapterAutoSaveVer2.Schema';
import { ApiResponse } from '@utils/apiResponse';
import { BaseModule } from '@utils/baseClass';
import { catchAsync } from '@utils/catchAsync';
import { AutoSaveLifecycleService } from '../services/autosave-lifecycle.service';
import { AutoSaveContentService } from '../services/autosave-content.service';
import { AutoSaveQueryService } from '../services/autosave-query.service';
import { AutoSaveConversionService } from '../services/autosave-conversion.service';

@singleton()
export class ChapterAutoSaveController extends BaseModule {
  constructor(
    @inject(TOKENS.AutoSaveLifecycleService)
    private readonly lifecycleService: AutoSaveLifecycleService,
    @inject(TOKENS.AutoSaveContentService)
    private readonly contentService: AutoSaveContentService,
    @inject(TOKENS.AutoSaveQueryService)
    private readonly queryService: AutoSaveQueryService,
    @inject(TOKENS.AutoSaveConversionService)
    private readonly conversionService: AutoSaveConversionService
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

      const result = await this.lifecycleService.enableAutoSave({ ...input, userId });

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(new ApiResponse(true, 'Auto-save enabled successfully.', result));
    }
  );

  autoSaveContent = catchAsync(
    async (request: FastifyRequest<{ Body: TAutoSaveContentSchemaVer2 }>, reply: FastifyReply) => {
      const userId = request.user.clerkId;
      const input = request.body;

      const result = await this.contentService.autoSaveContent({ ...input, userId });

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
      const userId = request.user.clerkId;
      const { chapterSlug } = request.body;

      if (!chapterSlug) {
        this.throwBadRequest('chapterSlug is required');
      }

      await this.lifecycleService.disableAutoSave(chapterSlug, userId);

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(new ApiResponse(true, 'Auto-save disabled successfully.', {}));
    }
  );

  getAutoSaveDraft = catchAsync(
    async (
      request: FastifyRequest<{ Querystring: TGetAutoSaveDraftQuerySchema }>,
      reply: FastifyReply
    ) => {
      const userId = request.user.clerkId;
      const { page, limit } = request.query;

      const result = await this.queryService.getByUser({ userId, page, limit });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Auto-save draft retrieved successfully.', result));
    }
  );

  /**
   * Convert AutoSave to Draft or Published Chapter
   */
  convertAutoSave = catchAsync(
    async (
      request: FastifyRequest<{
        Querystring: TConvertAutoSaveQuerySchema;
        Body: TConvertAutoSaveSchema;
      }>,
      reply: FastifyReply
    ) => {
      const userId = request.user.clerkId;
      const { autoSaveId } = request.body;
      const { type } = request.query;

      await this.conversionService.convert({
        autoSaveId,
        userId,
        type: type as 'draft' | 'publish',
      });

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(
          new ApiResponse(
            true,
            `Auto-save (${autoSaveId}) converted to ${type === 'publish' ? 'published' : 'draft'} chapter successfully.`,
            {}
          )
        );
    }
  );

  /**
   * Get AutoSave by ID (helper for loading story context in middleware)
   */
  getAutoSaveById = catchAsync(
    async (request: FastifyRequest<{ Params: { autoSaveId: string } }>, reply: FastifyReply) => {
      const { autoSaveId } = request.params;

      const autoSave = await this.queryService.getById(autoSaveId);

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
