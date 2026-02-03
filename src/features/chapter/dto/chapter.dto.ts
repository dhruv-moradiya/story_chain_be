import { TChapterStatus } from '../types/chapter.types';

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
  status: TChapterStatus;
};

type ICreateChildChapterSimpleDTO = {
  storySlug: string;
  userId: string;
  parentChapterSlug: string;
  title: string;
  content: string;
  status?: TChapterStatus;
};

export type { IChapterAddChildDTO, TChapterAddRootDTO, ICreateChildChapterSimpleDTO };
