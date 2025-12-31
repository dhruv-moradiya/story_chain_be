import { ID } from '../types';
import { TSaveType } from '../features/chapterAutoSave/chapterAutoSave.types';

interface IEnableChapterAutoSaveDTO {
  userId: string;
  chapterId?: ID;
  draftId?: string;
  autoSaveType: TSaveType;
  storySlug: string;
  parentChapterId?: ID;
}

interface IAutoSaveContentDTO {
  chapterId?: ID;
  draftId?: string;
  userId: string;
  content: string;
  title: string;
  autoSaveType: TSaveType;
  storySlug: string;
  parentChapterId?: ID;
}

interface IDisableAutoSaveDTO {
  chapterId?: ID;
  draftId?: string;
  userId: string;
  autoSaveType: TSaveType;
  storySlug: string;
  parentChapterId?: ID;
}

interface IGetAutoSaveDraftDTO {
  // chapterId?: ID;
  // draftId?: string;
  userId: string;
}

interface IPublishAutoSaveDraftDTO {
  userId: string;
  chapterId?: string;
  draftId?: string;
}

export type {
  IEnableChapterAutoSaveDTO,
  IAutoSaveContentDTO,
  IDisableAutoSaveDTO,
  IGetAutoSaveDraftDTO,
  IPublishAutoSaveDraftDTO,
};
