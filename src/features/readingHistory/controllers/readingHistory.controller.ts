import { TOKENS } from '@/container';
import { TRecordHeartBeatSchema } from '@/schema/request/readingHistory.schema';
import { BaseModule } from '@/utils/baseClass';
import { catchAsync } from '@/utils/catchAsync';
import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { HTTP_STATUS } from '@/constants/httpStatus';
import { ApiResponse } from '@/utils/apiResponse';
import { IReadingHistoryService } from '../services/interfaces';

@singleton()
class ReadingHistoryController extends BaseModule {
  constructor(
    @inject(TOKENS.ReadingHistoryService)
    private readonly readingHistoryService: IReadingHistoryService
  ) {
    super();
  }

  /**
   * Record heartbeat
   */
  upsert = catchAsync(
    async (request: FastifyRequest<{ Body: TRecordHeartBeatSchema }>, reply: FastifyReply) => {
      const userId = request.user.clerkId;
      const body = request.body;

      const readingHistory = await this.readingHistoryService.upsert({ userId, ...body });

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(new ApiResponse(true, 'Heartbeat recorded successfully', readingHistory));
    }
  );
}

export { ReadingHistoryController };
