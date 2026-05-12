import { TOKENS } from '@/container/index.js';
import { IChapterAnalyticsDTO, IStoryAnalyticsDTO } from '@/dto/analytics.dto.js';
import { IAnalyticsResponse } from '@/types/response/analytics.response.types.js';
import { BaseModule } from '@/utils/baseClass.js';
import { inject, singleton } from 'tsyringe';
import { ReadingHistoryRepository } from '../repositories/readingHistory.repository.js';
import { IAnalyticsService } from './interfaces/index.js';
import { TAnalyticsType, BucketType } from '../types/analytics-enum.js';
import { IRawAnalyticsBucket } from '../types/readingHistory.types.js';

interface IDateRange {
  from: Date;
  to: Date;
  bucketType: BucketType;
}

@singleton()
class AnalyticsService extends BaseModule implements IAnalyticsService {
  constructor(
    @inject(TOKENS.ReadingHistoryRepository)
    private readonly readingHistoryRepository: ReadingHistoryRepository
  ) {
    super();
  }

  async getChapterAnalytics(dto: IChapterAnalyticsDTO): Promise<IAnalyticsResponse> {
    const { chapterSlug, type, date, from, to } = dto;

    const dateRange = this.resolveDateRange(type, date, from, to);

    const rawBuckets = await this.readingHistoryRepository.aggregateChapterAnalytics(
      chapterSlug,
      dateRange.from,
      dateRange.to,
      dateRange.bucketType
    );

    return this.formatBuckets(rawBuckets, dateRange.from, dateRange.to, dateRange.bucketType, type);
  }

  async getStoryAnalytics(dto: IStoryAnalyticsDTO): Promise<IAnalyticsResponse> {
    const { storySlug, type, date, from, to } = dto;

    const dateRange = this.resolveDateRange(type, date, from, to);

    const rawBuckets = await this.readingHistoryRepository.aggregateStoryAnalytics(
      storySlug,
      dateRange.from,
      dateRange.to,
      dateRange.bucketType
    );

    return this.formatBuckets(rawBuckets, dateRange.from, dateRange.to, dateRange.bucketType, type);
  }

  /**
   * Resolve the date range and bucket type based on the analytics type.
   */
  private resolveDateRange(
    type: TAnalyticsType,
    date?: string,
    from?: string,
    to?: string
  ): IDateRange {
    const now = new Date();

    switch (type) {
      case 'hourly': {
        const targetDate = date ? new Date(date) : now;
        const startOfDay = new Date(
          Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate())
        );
        const endOfDay = new Date(
          Date.UTC(
            targetDate.getUTCFullYear(),
            targetDate.getUTCMonth(),
            targetDate.getUTCDate(),
            23,
            59,
            59,
            999
          )
        );
        return { from: startOfDay, to: endOfDay, bucketType: 'hour' };
      }

      case 'yesterday': {
        const yesterday = new Date(now);
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        const startOfDay = new Date(
          Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate())
        );
        const endOfDay = new Date(
          Date.UTC(
            yesterday.getUTCFullYear(),
            yesterday.getUTCMonth(),
            yesterday.getUTCDate(),
            23,
            59,
            59,
            999
          )
        );
        return { from: startOfDay, to: endOfDay, bucketType: 'hour' };
      }

      case 'last7days': {
        const endOfToday = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
        );
        const start = new Date(endOfToday);
        start.setUTCDate(start.getUTCDate() - 6);
        start.setUTCHours(0, 0, 0, 0);
        return { from: start, to: endOfToday, bucketType: 'day' };
      }

      case 'last30days': {
        const endOfToday = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
        );
        const start = new Date(endOfToday);
        start.setUTCDate(start.getUTCDate() - 29);
        start.setUTCHours(0, 0, 0, 0);
        return { from: start, to: endOfToday, bucketType: 'day' };
      }

      case 'thisMonth': {
        const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const endOfToday = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
        );
        return { from: startOfMonth, to: endOfToday, bucketType: 'day' };
      }

      case 'daily': {
        if (!from || !to) {
          this.throwBadRequest(
            'INVALID_INPUT',
            'Both "from" and "to" dates are required for daily analytics'
          );
        }

        const fromDate = new Date(from);
        fromDate.setUTCHours(0, 0, 0, 0);

        const toDate = new Date(to);
        toDate.setUTCHours(23, 59, 59, 999);

        return { from: fromDate, to: toDate, bucketType: 'day' };
      }

      default:
        this.throwBadRequest('INVALID_INPUT', `Invalid analytics type: ${type as string}`);
    }
  }

  /**
   * Fill in empty time buckets with zeros and produce final chart-ready arrays.
   */
  private formatBuckets(
    rawBuckets: IRawAnalyticsBucket[],
    from: Date,
    to: Date,
    bucketType: BucketType,
    type: TAnalyticsType
  ): IAnalyticsResponse {
    // Build a map from bucket key -> data
    const bucketMap = new Map<string, IRawAnalyticsBucket>();
    for (const bucket of rawBuckets) {
      bucketMap.set(bucket.bucket, bucket);
    }

    // Generate all expected bucket keys
    const allBucketKeys = this.generateBucketKeys(from, to, bucketType);

    const labels: string[] = [];
    const reads: number[] = [];
    const uniqueReaders: number[] = [];
    const totalReadTime: number[] = [];

    for (const key of allBucketKeys) {
      const data = bucketMap.get(key);
      labels.push(this.formatLabel(key, bucketType));
      reads.push(data?.reads ?? 0);
      uniqueReaders.push(data?.uniqueReaders ?? 0);
      totalReadTime.push(data?.totalReadTime ?? 0);
    }

    return {
      labels,
      reads,
      uniqueReaders,
      totalReadTime,
      type,
      from: from.toISOString(),
      to: to.toISOString(),
    };
  }

  /**
   * Generate all bucket keys between from and to dates.
   */
  private generateBucketKeys(from: Date, to: Date, bucketType: BucketType): string[] {
    const keys: string[] = [];
    const current = new Date(from);

    if (bucketType === 'hour') {
      // Generate keys for each hour in the day
      current.setUTCMinutes(0, 0, 0);
      while (current <= to) {
        const year = current.getUTCFullYear();
        const month = String(current.getUTCMonth() + 1).padStart(2, '0');
        const day = String(current.getUTCDate()).padStart(2, '0');
        const hour = String(current.getUTCHours()).padStart(2, '0');
        keys.push(`${year}-${month}-${day}T${hour}:00:00.000Z`);
        current.setUTCHours(current.getUTCHours() + 1);
      }
    } else {
      // Generate keys for each day
      current.setUTCHours(0, 0, 0, 0);
      const endDate = new Date(to);
      endDate.setUTCHours(0, 0, 0, 0);
      while (current <= endDate) {
        const year = current.getUTCFullYear();
        const month = String(current.getUTCMonth() + 1).padStart(2, '0');
        const day = String(current.getUTCDate()).padStart(2, '0');
        keys.push(`${year}-${month}-${day}`);
        current.setUTCDate(current.getUTCDate() + 1);
      }
    }

    return keys;
  }

  /**
   * Format a bucket key into a human-readable label.
   */
  private formatLabel(bucketKey: string, bucketType: BucketType): string {
    if (bucketType === 'hour') {
      // Extract HH:00 from the ISO string
      const date = new Date(bucketKey);
      const hours = String(date.getUTCHours()).padStart(2, '0');
      return `${hours}:00`;
    }

    // For daily buckets, return the date as-is (YYYY-MM-DD)
    return bucketKey;
  }
}

export { AnalyticsService };
