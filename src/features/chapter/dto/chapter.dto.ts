import { ID } from '@/types';
import { ChapterStatus } from '../types/chapter-enum';

type TChapterAddRootDTO = {
  storyId: ID;
  userId: string;
  title: string;
  content: string;
};

type IChapterAddChildDTO = {
  storyId: ID;
  userId: string;
  parentChapterId: ID;
  title: string;
  content: string;
  ancestorIds: ID[];
  depth: number;
  status: ChapterStatus;
};

type ICreateChildChapterSimpleDTO = {
  storyId: ID;
  userId: string;
  parentChapterId: ID;
  title: string;
  content: string;
  status?: ChapterStatus;
};

export type { IChapterAddChildDTO, TChapterAddRootDTO, ICreateChildChapterSimpleDTO };
