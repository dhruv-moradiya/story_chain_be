interface IRecordHeartBeatDTO {
  userId: string;
  storySlug: string;
  chapterSlug: string;
  duration: number;
}

interface IStartSessionDTO {
  userId: string;
  storySlug: string;
  chapterSlug: string;
  sessionId: string;
}

interface IRecordSessionDTO {
  userId: string;
  storySlug: string;
  chapterSlug: string;
  sessionId: string;
  duration: number;
}

interface IMarkAsCompletedDTO {
  userId: string;
  storySlug: string;
  chapterSlug: string;
}

export { IRecordHeartBeatDTO, IStartSessionDTO, IRecordSessionDTO, IMarkAsCompletedDTO };
