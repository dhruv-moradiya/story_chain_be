import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { HTTP_STATUS } from '@constants/httpStatus';
import {
  ChapterAutoSaveSearchSchema,
  TAutoSaveContentSchemaVer2,
  TChapterAutoSaveSearchSchema,
  TConvertAutoSaveQuerySchema,
  TConvertAutoSaveSchema,
  TGetAutoSaveDraftQuerySchema,
} from '@schema/request/chapterAutoSaveVer2.Schema';

import { ApiResponse } from '@utils/apiResponse';
import { BaseModule } from '@utils/baseClass';
import { catchAsync } from '@utils/catchAsync';
import { AutoSaveContentService } from '../services/autosave-content.service';
import { AutoSaveQueryService } from '../services/autosave-query.service';
import { AutoSaveConversionService } from '../services/autosave-conversion.service';

@singleton()
export class ChapterAutoSaveController extends BaseModule {
  constructor(
    @inject(TOKENS.AutoSaveContentService)
    private readonly contentService: AutoSaveContentService,
    @inject(TOKENS.AutoSaveQueryService)
    private readonly queryService: AutoSaveQueryService,
    @inject(TOKENS.AutoSaveConversionService)
    private readonly conversionService: AutoSaveConversionService
  ) {
    super();
  }

  autoSaveContent = catchAsync(
    async (request: FastifyRequest<{ Body: TAutoSaveContentSchemaVer2 }>, reply: FastifyReply) => {
      const userId = request.user.clerkId;
      const input = request.body;

      const result = await this.contentService.autoSaveContent({ ...input, userId });

      return reply.code(HTTP_STATUS.CREATED.code).send(
        ApiResponse.created(
          {
            _id: result._id,
            saveCount: result.saveCount,
          },
          'Content auto-saved successfully.'
        )
      );
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
        .send(ApiResponse.fetched(result, 'Auto-save draft retrieved successfully.'));
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
          ApiResponse.created(
            {},
            `Auto-save (${autoSaveId}) converted to ${type === 'publish' ? 'published' : 'draft'} chapter successfully.`
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
        this.throwNotFoundError('AUTOSAVE_NOT_FOUND', 'Auto-save not found.');
      }

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.fetched(autoSave, 'Auto-save retrieved successfully.'));
    }
  );

  searchAutoSaves = catchAsync(
    async (
      request: FastifyRequest<{ Querystring: TChapterAutoSaveSearchSchema }>,
      reply: FastifyReply
    ) => {
      const userId = request.user.clerkId;
      const { q, storySlug, chapterSlug, autoSaveType, fields, limit } =
        ChapterAutoSaveSearchSchema.parse(request.query);

      const results = await this.queryService.search(
        { q, storySlug, chapterSlug, autoSaveType, userId },
        fields,
        limit
      );

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.fetched(results, `Found ${results.length} auto-save(s).`));
    }
  );
}
