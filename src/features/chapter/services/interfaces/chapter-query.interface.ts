interface IChapterQueryService {
  getById(chapterId: string): Promise<void>;
  getByStory(storyId: string): Promise<void>;
  getByAuthor(authorId: string): Promise<void>;
}

export type { IChapterQueryService };
