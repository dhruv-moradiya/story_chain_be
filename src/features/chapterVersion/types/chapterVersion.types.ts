import { Document, Types } from 'mongoose';
import { ID } from '@/types';
import { CHAPTER_VERSION_EDIT_TYPES } from './chapterVersion-enum';

type TChapterVersionEditType = (typeof CHAPTER_VERSION_EDIT_TYPES)[number];

/**
 * Metadata about the changes made in this version
 * Used for non-PR edits to track change statistics
 */
export interface IChangeMetadata {
  characterCountDelta?: number;
  wordCountDelta?: number;
}

/**
 * Moderation information when a version is hidden
 */
export interface IModerationInfo {
  hiddenBy?: string;
  hiddenAt?: Date;
  reasonHidden?: string;
}

/**
 * ChapterVersion interface
 * Represents a historical snapshot of a chapter's content
 */
export interface IChapterVersion {
  _id: ID;
  chapterId: ID;
  version: number;
  content: string;
  title?: string;
  editedBy: string;
  editReason?: string;
  changesSummary?: string;
  editType: TChapterVersionEditType;
  prId?: ID;
  previousVersionId?: ID;
  changeMetadata?: IChangeMetadata;
  isVisible: boolean;
  moderationInfo?: IModerationInfo;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose Document type for ChapterVersion.
 */
export interface IChapterVersionDoc extends Document, Omit<IChapterVersion, '_id'> {
  _id: Types.ObjectId;
}

export type { TChapterVersionEditType };
