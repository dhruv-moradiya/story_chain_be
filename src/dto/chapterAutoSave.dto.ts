import { TSaveType } from '@features/chapterAutoSave/types/chapterAutoSave.types';
import {
  TAutoSaveContentSchemaVer2,
  TConvertAutoSaveQuerySchema,
  TConvertAutoSaveSchema,
  TEnableAutoSaveSchemaVer2Type,
} from '@schema/request/chapterAutoSaveVer2.Schema';

type TEnableChapterAutoSaveDTO = TEnableAutoSaveSchemaVer2Type & {
  userId: string;
};

type TAutoSaveContentDTO = TAutoSaveContentSchemaVer2 & {
  userId: string;
};

/**
 * Convert AutoSave to Chapter
 */
type TConvertAutoSaveDTO = TConvertAutoSaveSchema &
  TConvertAutoSaveQuerySchema & {
    userId: string;
  };

interface IAutoSaveContentDTO {
  chapterSlug?: string;
  userId: string;
  content: string;
  title: string;
  autoSaveType: TSaveType;
  storySlug: string;
  parentChapterSlug?: string;
}

interface IDisableAutoSaveDTO {
  chapterSlug?: string;
  userId: string;
  autoSaveType: TSaveType;
  storySlug: string;
  parentChapterSlug?: string;
}

interface IGetAutoSaveDraftDTO {
  userId: string;
  page?: number;
  limit?: number;
}

export type {
  TEnableChapterAutoSaveDTO,
  TAutoSaveContentDTO,
  IAutoSaveContentDTO,
  IDisableAutoSaveDTO,
  IGetAutoSaveDraftDTO,
  TConvertAutoSaveDTO,
};
