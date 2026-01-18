import { ID } from '@/types';
import { TSaveType } from '@features/chapterAutoSave/types/chapterAutoSave.types';
import {
  TAutoSaveContentSchemaVer2,
  TEnableAutoSaveSchemaVer2Type,
} from '@schema/chapterAutoSaveVer2.Schema';

type TEnableChapterAutoSaveDTO = TEnableAutoSaveSchemaVer2Type & {
  userId: string;
};

type TAutoSaveContentDTO = TAutoSaveContentSchemaVer2 & {
  userId: string;
};

interface IAutoSaveContentDTO {
  chapterId?: ID;
  userId: string;
  content: string;
  title: string;
  autoSaveType: TSaveType;
  storySlug: string;
  parentChapterId?: ID;
}

interface IDisableAutoSaveDTO {
  chapterId?: ID;
  userId: string;
  autoSaveType: TSaveType;
  storySlug: string;
  parentChapterId?: ID;
}

interface IGetAutoSaveDraftDTO {
  userId: string;
}

interface IPublishAutoSaveDraftDTO {
  userId: string;
  chapterId?: string;
}

export type {
  TEnableChapterAutoSaveDTO,
  TAutoSaveContentDTO,
  IAutoSaveContentDTO,
  IDisableAutoSaveDTO,
  IGetAutoSaveDraftDTO,
  IPublishAutoSaveDraftDTO,
};
