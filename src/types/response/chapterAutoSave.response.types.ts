import { ID } from '..';

interface IChapterAutoSaveResponse {
  _id: ID;
  chapterId?: ID;
  draftId?: string;
  userId: string;
}

interface IEnableAutoSaveRootChapter {
  autoSaveType: 'root_chapter';
  userId: string;
  storyId: ID;
  title: string;
  content: string;
}

interface IEnableAutoSaveNewChapter {
  autoSaveType: 'new_chapter';
  userId: string;
  storyId: ID;
  title: string;
  content: string;
  parentChapterId: ID;
}

interface IEnableAutoSaveUpdateChapter {
  autoSaveType: 'update_chapter';
  userId: string;
  storyId: ID;
  title: string;
  content: string;
  chapterId: ID;
  parentChapterId: ID;
}

type TEnableAutoSaveInput =
  | IEnableAutoSaveRootChapter
  | IEnableAutoSaveNewChapter
  | IEnableAutoSaveUpdateChapter;

export type {
  IChapterAutoSaveResponse,
  IEnableAutoSaveRootChapter,
  IEnableAutoSaveNewChapter,
  IEnableAutoSaveUpdateChapter,
  TEnableAutoSaveInput,
};
