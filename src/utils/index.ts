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
    chapterMap[chapter.slug] = { ...chapter, children: [] };
  });

  chapters.forEach((chapter) => {
    const node = chapterMap[chapter.slug];
    const parentSlug = chapter.parentChapterSlug;
    const parentNode = parentSlug ? chapterMap[parentSlug] : undefined;

    if (parentSlug && parentNode) {
      parentNode.children.push(node);
    } else {
      roots.push(node);
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
