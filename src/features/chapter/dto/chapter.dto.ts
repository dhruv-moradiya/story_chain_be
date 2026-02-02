import { ChapterStatus } from '../types/chapter-enum';

type TChapterAddRootDTO = {
  storySlug: string;
  userId: string;
  title: string;
  content: string;
};

type IChapterAddChildDTO = {
  storySlug: string;
  userId: string;
  parentChapterSlug: string;
  title: string;
  content: string;
  ancestorSlugs: string[];
  depth: number;
  status: ChapterStatus;
};

type ICreateChildChapterSimpleDTO = {
  storySlug: string;
  userId: string;
  parentChapterSlug: string;
  title: string;
  content: string;
  status?: ChapterStatus;
};

export type { IChapterAddChildDTO, TChapterAddRootDTO, ICreateChildChapterSimpleDTO };
