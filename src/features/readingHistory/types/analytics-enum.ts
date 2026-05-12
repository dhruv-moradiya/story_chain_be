enum AnalyticsType {
  HOURLY = 'hourly',
  YESTERDAY = 'yesterday',
  LAST_7_DAYS = 'last7days',
  LAST_30_DAYS = 'last30days',
  THIS_MONTH = 'thisMonth',
  DAILY = 'daily',
}

const ANALYTICS_TYPES = [
  'hourly',
  'yesterday',
  'last7days',
  'last30days',
  'thisMonth',
  'daily',
] as const;

type TAnalyticsType = (typeof ANALYTICS_TYPES)[number];

type BucketType = 'hour' | 'day';

export { AnalyticsType, ANALYTICS_TYPES };
export type { TAnalyticsType, BucketType };
