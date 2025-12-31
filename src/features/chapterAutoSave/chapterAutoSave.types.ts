import { Document, Types } from 'mongoose';
import { ID } from '../../types';

enum ChapterAutoSaveType {
  UPDATE = 'update',
  NEW_CHAPTER = 'new_chapter',
  ROOT_CHAPTER = 'root_chapter',
}

type TSaveType = 'update' | 'new_chapter' | 'root_chapter';

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
  autoSaveType: TSaveType;
  storyId: ID;
  parentChapterId?: ID;
}

interface IChapterAutoSaveDoc extends Document, IChapterAutoSave {
  _id: Types.ObjectId;
}

export { IChapterAutoSave, IChapterAutoSaveDoc, TSaveType, ChapterAutoSaveType };
