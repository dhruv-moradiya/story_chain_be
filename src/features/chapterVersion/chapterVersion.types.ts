import { Document, Types } from 'mongoose';
import { ID } from '../../types';

/**
 * Represents a single version (revision) of a chapter.
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
  prId?: ID;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose Document type for ChapterVersion.
 */
export interface IChapterVersionDoc extends Document, IChapterVersion {
  _id: Types.ObjectId;
}
