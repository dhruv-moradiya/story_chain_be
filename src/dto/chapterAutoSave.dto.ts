import { ID } from '@/types';
import { TSaveType } from '@features/chapterAutoSave/types/chapterAutoSave.types';
import {
  TAutoSaveContentSchemaVer2,
  TConvertAutoSaveToDraftSchema,
  TConvertAutoSaveToPublishedSchema,
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

/**
 * Convert AutoSave to Draft Chapter
 * - Only requires ownership of the autosave (no story role required)
 * - Creates a chapter with status = DRAFT (not visible to others)
 */
type TConvertToDraftDTO = TConvertAutoSaveToDraftSchema & {
  userId: string;
};

/**
 * Convert AutoSave to Published Chapter
 * - Requires `canWriteChapters` permission in the story
 * - Creates a chapter with status = PUBLISHED
 */
type TConvertToPublishedDTO = TConvertAutoSaveToPublishedSchema & {
  userId: string;
};

export type {
  TEnableChapterAutoSaveDTO,
  TAutoSaveContentDTO,
  IAutoSaveContentDTO,
  IDisableAutoSaveDTO,
  IGetAutoSaveDraftDTO,
  TConvertToDraftDTO,
  TConvertToPublishedDTO,
};
