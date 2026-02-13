import { Document, Types } from 'mongoose';
import { ID } from '@/types';

export interface IChapterRead {
  chapterSlug: string;
  lastHeartbeatAt: Date;
  activeSessionId: string;
  hasQualifiedRead: boolean;
  totalReadTime: number;
}

export interface IReadingHistory {
  _id: ID;
  userId: string;
  storySlug: string;
  currentChapterSlug: string | null;
  chaptersRead: IChapterRead[];
  lastReadAt: Date;
  totalStoryReadTime: number;
  completedEndingChapters: string[];
  completedPaths: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IReadingHistoryDoc extends IReadingHistory, Document {
  _id: Types.ObjectId;
}

export interface IChapterReadDoc extends IChapterRead, Document {}
