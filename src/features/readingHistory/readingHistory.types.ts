import { Document, Types } from 'mongoose';
import { ID } from '../../types';

export interface IReadingHistory {
  _id: ID;
  userId: string;
  storyId: ID;
  currentChapterId: ID;
  chaptersRead: {
    chapterId: ID;
    readAt: Date;
  }[];
  lastReadAt: Date;
  totalReadTime: number;
  completedPaths: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IReadingHistoryDoc extends IReadingHistory, Document {
  _id: Types.ObjectId;
}
