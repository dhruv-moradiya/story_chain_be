interface IRecordHeartBeatDTO {
  userId: string;
  storySlug: string;
  chapterSlug: string;
  duration: number;
}

interface IMarkAsCompletedDTO {
  userId: string;
  storySlug: string;
  chapterSlug: string;
}

export { IRecordHeartBeatDTO, IMarkAsCompletedDTO };
