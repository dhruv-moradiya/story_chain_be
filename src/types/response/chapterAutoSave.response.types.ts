import { ID } from '..';
import { IChapterAutoSave } from '@/features/chapterAutoSave/types/chapterAutoSave.types';

interface IChapterAutoSaveResponse {
  _id: ID;
  chapterSlug?: string;
  draftId?: string;
  userId: string;
}

interface IEnableAutoSaveRootChapter {
  autoSaveType: 'root_chapter';
  userId: string;
  storySlug: string;
  title: string;
  content: string;
}

interface IEnableAutoSaveNewChapter {
  autoSaveType: 'new_chapter';
  userId: string;
  storySlug: string;
  title: string;
  content: string;
  parentChapterSlug?: string;
}

interface IEnableAutoSaveUpdateChapter {
  autoSaveType: 'update_chapter';
  userId: string;
  storySlug: string;
  title: string;
  content: string;
  chapterSlug: string;
  parentChapterSlug?: string;
}

interface IChapterAutoSavePaginatedResponse {
  docs: IChapterAutoSave[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
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
  IChapterAutoSavePaginatedResponse,
};
