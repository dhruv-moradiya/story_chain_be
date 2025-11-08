import { Document, Types } from 'mongoose';

export interface IReadingHistory {
  _id: Types.ObjectId;
  userId: string;
  storyId: Types.ObjectId;
  currentChapterId: Types.ObjectId;
  chaptersRead: {
    chapterId: Types.ObjectId;
    readAt: Date;
  }[];
  lastReadAt: Date;
  totalReadTime: number;
  completedPaths: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IReadingHistoryDoc extends IReadingHistory, Document<Types.ObjectId> {}
