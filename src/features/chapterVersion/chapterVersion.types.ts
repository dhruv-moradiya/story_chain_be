import { Document, Types } from 'mongoose';

/**
 * Represents a single version (revision) of a chapter.
 */
export interface IChapterVersion {
  _id: Types.ObjectId;
  chapterId: Types.ObjectId;
  version: number;
  content: string;
  title?: string;
  editedBy: string;
  editReason?: string;
  changesSummary?: string;
  prId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose Document type for ChapterVersion.
 */
export interface IChapterVersionDoc extends Document<Types.ObjectId>, IChapterVersion {}
