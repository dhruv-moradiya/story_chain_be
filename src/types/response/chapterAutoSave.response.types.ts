import { ID } from '..';

interface IChapterAutoSaveResponse {
  _id: ID;
  chapterId?: ID;
  draftId?: string;
  userId: string;
}

export type { IChapterAutoSaveResponse };
