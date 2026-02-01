interface IChapterCrudService {
  createRoot(storySlug: string, chapterTitle: string): Promise<void>;
  createChild(parentChapterId: string, chapterTitle: string): Promise<void>;
  update(chapterId: string, chapterTitle: string): Promise<void>;
  delete(chapterId: string): Promise<void>;
}

export type { IChapterCrudService };
