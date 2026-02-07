import { Document, Types } from 'mongoose';
import { ID } from '@/types';

export interface IReadingHistory {
  _id: ID;
  userId: string;
  storySlug: string;
  currentChapterSlug: string;
  chaptersRead: {
    chapterSlug: string;
    readAt: Date;
  }[];
  lastReadAt: Date;
  totalReadTime: number;
  completedEndingChapters: string[];
  completedPaths: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IReadingHistoryDoc extends IReadingHistory, Document {
  _id: Types.ObjectId;
}
