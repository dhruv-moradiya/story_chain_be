import { FastifyReply, FastifyRequest } from 'fastify';
import { BaseModule } from '../../utils/baseClass';
import { catchAsync } from '../../utils/catchAsync';
import {
  TAutoSaveContentSchema,
  TDisableAutoSaveSchema,
  TEnableAutoSaveSchema,
} from '../../schema/chapterAutoSave.schema';
import { chapterAutoSaveService } from './chapterAutoSave.service';
import { HTTP_STATUS } from '../../constants/httpStatus';
import { ApiResponse } from '../../utils/apiResponse';
import { ChapterAutoSaveTransformer } from '../../transformer/chapterAutoSave.transformer';

export class ChapterAutoSaveController extends BaseModule {
  enableAutoSave = catchAsync(
    async (request: FastifyRequest<{ Body: TEnableAutoSaveSchema }>, reply: FastifyReply) => {
      const input = request.body;

      const result = await chapterAutoSaveService.enableAutoSave(input);

      const replyData = ChapterAutoSaveTransformer.enableAutoSaveRespose(result);

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(new ApiResponse(true, 'Auto-save enabled successfully.', replyData));
    }
  );

  autoSaveContent = catchAsync(
    async (request: FastifyRequest<{ Body: TAutoSaveContentSchema }>, reply: FastifyReply) => {
      const input = request.body;

      const result = await chapterAutoSaveService.autoSaveContent(input);

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(
          new ApiResponse(true, 'Content auto-saved successfully.', {
            saveCount: result.saveCount,
          })
        );
    }
  );

  disableAutoSave = catchAsync(
    async (request: FastifyRequest<{ Body: TDisableAutoSaveSchema }>, reply: FastifyReply) => {
      const input = request.body;

      await chapterAutoSaveService.disableAutoSave(input);

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(new ApiResponse(true, 'Auto-save disabled successfully.', {}));
    }
  );

  getAutoSaveDraft = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.clerkId;

    const result = await chapterAutoSaveService.getAutoSaveDraft({ userId });

    return reply
      .code(HTTP_STATUS.OK.code)
      .send(new ApiResponse(true, 'Auto-save draft retrieved successfully.', result));
  });
}
