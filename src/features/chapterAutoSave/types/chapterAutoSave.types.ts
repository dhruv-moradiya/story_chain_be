import { Document, Types } from 'mongoose';
import { ID } from '@/types';

enum ChapterAutoSaveType {
  UPDATE = 'update_chapter',
  NEW_CHAPTER = 'new_chapter',
  ROOT_CHAPTER = 'root_chapter',
}

type TSaveType = 'update_chapter' | 'new_chapter' | 'root_chapter';

interface IChapterAutoSave {
  _id: ID;
  title: string;
  chapterId?: ID;
  userId: string;
  content: string;
  lastSavedAt: Date;
  isEnabled: boolean;
  saveCount: number;
  changes?: {
    additionsCount: number;
    deletionsCount: number;
  };
  autoSaveType: TSaveType;
  storyId: ID;
  parentChapterSlug?: string;
}

interface IChapterAutoSaveDoc extends Document, IChapterAutoSave {
  _id: Types.ObjectId;
}

export { IChapterAutoSave, IChapterAutoSaveDoc, TSaveType, ChapterAutoSaveType };
