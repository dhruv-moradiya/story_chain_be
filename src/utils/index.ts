import { Types } from 'mongoose';
import { ID } from '@/types';
import { IChapter, TChapterMap, TChapterNode } from '@features/chapter/types/chapter.types';
import { z } from 'zod';
import mongoose from 'mongoose';

const toId = (id: ID) => (typeof id === 'string' ? new Types.ObjectId(id) : id);

// TODO: Move to story rules/service
function buildChapterTree(chapters: IChapter[]) {
  const chapterMap: TChapterMap = {};
  const roots: TChapterNode[] = [];

  chapters.forEach((chapter) => {
    chapterMap[chapter._id.toString()] = { ...chapter, children: [] };
  });

  chapters.forEach((chapter) => {
    const node = chapterMap[chapter._id.toString()];
    if (chapter.parentChapterId) {
      chapterMap[chapter.parentChapterId.toString()].children.push(node);
    } else {
      roots.push(chapterMap[chapter._id.toString()]);
    }
  });

  return roots;
}

const ObjectIdSchema = () =>
  z
    .string()
    .min(1, { message: 'An ObjectId must be provided.' })
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: 'Please provide a valid MongoDB ObjectId.',
    });

export { toId, buildChapterTree, ObjectIdSchema };
