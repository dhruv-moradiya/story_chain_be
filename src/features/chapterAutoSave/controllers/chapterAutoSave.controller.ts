import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { HTTP_STATUS } from '@constants/httpStatus';
import { TDisableAutoSaveSchema } from '@schema/chapterAutoSave.schema';
import {
  TAutoSaveContentSchemaVer2,
  TEnableAutoSaveSchemaVer2Type,
} from '@schema/chapterAutoSaveVer2.Schema';
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
}
