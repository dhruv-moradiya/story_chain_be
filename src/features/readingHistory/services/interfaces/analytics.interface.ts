import { IAnalyticsResponse } from '@/types/response/analytics.response.types';
import { IChapterAnalyticsDTO, IStoryAnalyticsDTO } from '@/dto/analytics.dto';

interface IAnalyticsService {
  getChapterAnalytics(dto: IChapterAnalyticsDTO): Promise<IAnalyticsResponse>;
  getStoryAnalytics(dto: IStoryAnalyticsDTO): Promise<IAnalyticsResponse>;
}

export type { IAnalyticsService };
