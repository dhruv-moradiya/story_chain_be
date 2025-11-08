import { Document, Types } from 'mongoose';

export interface IBookmark {
  _id: Types.ObjectId;
  userId: String;
  storyId: Types.ObjectId;
  chapterId?: Types.ObjectId;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBookmarkDoc extends Document<Types.ObjectId>, IBookmark {}

export type CreateBookmarkInput = Omit<IBookmark, '_id' | 'createdAt' | 'updatedAt'>;
export type UpdateBookmarkInput = Partial<Omit<CreateBookmarkInput, 'userId' | 'storyId'>>;
