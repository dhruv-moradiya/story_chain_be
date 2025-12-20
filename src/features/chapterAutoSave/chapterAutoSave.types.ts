import { Document, Types } from 'mongoose';
import { ID } from '../../types';

interface IChapterAutoSave {
  _id: ID;
  chapterId?: ID;
  draftId?: string;
  userId: string;
  content: string;
  title: string;
  lastSavedAt: Date;
  isEnabled: boolean;
  saveCount: number;
  changes?: {
    additionsCount: number;
    deletionsCount: number;
  };
}

interface IChapterAutoSaveDoc extends Document, IChapterAutoSave {
  _id: Types.ObjectId;
}

export { IChapterAutoSave, IChapterAutoSaveDoc };
