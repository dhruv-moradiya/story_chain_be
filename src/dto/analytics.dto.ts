import { TAnalyticsType } from '@features/readingHistory/types/analytics-enum';

interface IChapterAnalyticsDTO {
  chapterSlug: string;
  storySlug: string;
  type: TAnalyticsType;
  date?: string;
  from?: string;
  to?: string;
}

interface IStoryAnalyticsDTO {
  storySlug: string;
  type: TAnalyticsType;
  date?: string;
  from?: string;
  to?: string;
}

export type { IChapterAnalyticsDTO, IStoryAnalyticsDTO };
