import { ID } from '@/types';
import { TStoryStatus } from '@features/story/types/story.types';

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
  status: TStoryStatus;
};

export type { IChapterAddChildDTO, TChapterAddRootDTO };
