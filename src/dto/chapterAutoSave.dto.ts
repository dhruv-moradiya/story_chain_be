import { ID } from '../types';

interface IEnableChapterAutoSaveDTO {
  userId: string;
  chapterId?: ID;
  draftId?: string;
}

interface IAutoSaveContentDTO {
  chapterId?: ID;
  draftId?: string;
  userId: string;
  content: string;
  title: string;
}

interface IDisableAutoSaveDTO {
  chapterId?: ID;
  draftId?: string;
  userId: string;
}

interface IGetAutoSaveDraftDTO {
  chapterId?: ID;
  draftId?: string;
  userId: string;
}

export type {
  IEnableChapterAutoSaveDTO,
  IAutoSaveContentDTO,
  IDisableAutoSaveDTO,
  IGetAutoSaveDraftDTO,
};
