interface IReadingHistoryResponse {
  totalReadTime: number;
  currentChapterSlug: string | null;
  lastReadAt: Date;
  completedPaths: number;
}

export type { IReadingHistoryResponse };
