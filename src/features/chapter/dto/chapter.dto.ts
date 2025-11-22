interface IChapterCreateDTO {
  storyId: string;
  parentChapterId?: string;
  title: string;
  content: string;
  userId: string;
}

export type { IChapterCreateDTO };
