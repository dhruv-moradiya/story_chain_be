import { TOKENS } from '@/container';
import {
  AnalyticsQuerySchema,
  TChapterAnalyticsParamSchema,
  TStoryAnalyticsParamSchema,
} from '@/schema/request/analytics.schema';
import { BaseModule } from '@/utils/baseClass';
import { catchAsync } from '@/utils/catchAsync';
import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { HTTP_STATUS } from '@/constants/httpStatus';
import { ApiResponse } from '@/utils/apiResponse';
import { AnalyticsService } from '../services/analytics.service';
import { TAnalyticsType } from '../types/analytics-enum';

interface IAnalyticsQuerystring {
  type: TAnalyticsType;
  date?: string;
  from?: string;
  to?: string;
}

@singleton()
class AnalyticsController extends BaseModule {
  constructor(
    @inject(TOKENS.AnalyticsService)
    private readonly analyticsService: AnalyticsService
  ) {
    super();
  }

  /**
   * Get chapter-level analytics
   */
  getChapterAnalytics = catchAsync(
    async (
      request: FastifyRequest<{
        Params: TChapterAnalyticsParamSchema;
        Querystring: IAnalyticsQuerystring;
      }>,
      reply: FastifyReply
    ) => {
      const { chapterSlug, storySlug } = request.params;
      const query = AnalyticsQuerySchema.parse(request.query);

      const analytics = await this.analyticsService.getChapterAnalytics({
        chapterSlug,
        storySlug,
        type: query.type,
        date: query.date,
        from: query.from,
        to: query.to,
      });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.fetched(analytics, 'Chapter analytics fetched successfully'));
    }
  );

  /**
   * Get story-level analytics
   */
  getStoryAnalytics = catchAsync(
    async (
      request: FastifyRequest<{
        Params: TStoryAnalyticsParamSchema;
        Querystring: IAnalyticsQuerystring;
      }>,
      reply: FastifyReply
    ) => {
      const { storySlug } = request.params;
      const query = AnalyticsQuerySchema.parse(request.query);

      const analytics = await this.analyticsService.getStoryAnalytics({
        storySlug,
        type: query.type,
        date: query.date,
        from: query.from,
        to: query.to,
      });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.fetched(analytics, 'Story analytics fetched successfully'));
    }
  );
}

export { AnalyticsController };
