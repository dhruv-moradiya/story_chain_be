interface IReadingHistoryResponse {
  totalReadTime: number;
  currentChapterSlug: string;
  lastReadAt: Date;
  completedPaths: number;
}

export type { IReadingHistoryResponse };
