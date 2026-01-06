import { Document, Types } from 'mongoose';
import { ID } from '../../types';

export enum ChapterVersionEditType {
  MANUAL_EDIT = 'MANUAL_EDIT',
  PR_MERGE = 'PR_MERGE',
  ADMIN_ROLLBACK = 'ADMIN_ROLLBACK',
  MODERATION_REMOVAL = 'MODERATION_REMOVAL',
  IMPORT = 'IMPORT',
}

type TChapterVersionEditType = keyof typeof ChapterVersionEditType;

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
  previousVersionId: ID;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose Document type for ChapterVersion.
 */
export interface IChapterVersionDoc extends Document, IChapterVersion {
  _id: Types.ObjectId;
}
