import { ID } from '../../../types';
import { StoryStatusType } from '../../story/story.types';

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
  status: StoryStatusType;
};

export type { IChapterAddChildDTO, TChapterAddRootDTO };
