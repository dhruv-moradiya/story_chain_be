interface IAnalyticsDataPoint {
  label: string;
  reads: number;
  uniqueReaders: number;
  totalReadTime: number;
}

interface IAnalyticsResponse {
  labels: string[];
  reads: number[];
  uniqueReaders: number[];
  totalReadTime: number[];
  type: string;
  from: string;
  to: string;
}

export type { IAnalyticsDataPoint, IAnalyticsResponse };
