import { Document, Types } from 'mongoose';
import { ID } from '@/types';

export interface IBookmark {
  _id: ID;
  userId: string;
  storyId: ID;
  chapterId?: ID;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBookmarkDoc extends Document, IBookmark {
  _id: Types.ObjectId;
}

export type CreateBookmarkInput = Omit<IBookmark, '_id' | 'createdAt' | 'updatedAt'>;
export type UpdateBookmarkInput = Partial<Omit<CreateBookmarkInput, 'userId' | 'storyId'>>;
