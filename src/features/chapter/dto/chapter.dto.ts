import { z } from 'zod';
import { CHAPTER_LIMITS } from '../../../constants';
import mongoose from 'mongoose';

const ChapterCreateDTO = z.object({
  title: z
    .string()
    .min(CHAPTER_LIMITS.TITLE.MIN_LENGTH, {
      message: `Title must be at least ${CHAPTER_LIMITS.TITLE.MIN_LENGTH} characters`,
    })
    .max(CHAPTER_LIMITS.TITLE.MAX_LENGTH, {
      message: `Title must be at most ${CHAPTER_LIMITS.TITLE.MAX_LENGTH} characters`,
    })
    .transform((s) => s.trim()),
  content: z
    .string()
    .min(CHAPTER_LIMITS.CONTENT.MIN_LENGTH, {
      message: `Content must be at least ${CHAPTER_LIMITS.CONTENT.MIN_LENGTH} characters`,
    })
    .max(CHAPTER_LIMITS.CONTENT.MAX_LENGTH, {
      message: `Content must be at most ${CHAPTER_LIMITS.CONTENT.MAX_LENGTH} characters`,
    })
    .transform((s) => s.trim()),
  parentChapterId: z
    .string()
    .optional()
    .transform((v) => (typeof v === 'string' ? v.trim() : v))
    .refine(
      (val) => {
        if (val === undefined || val === null || val === '') return true;
        return mongoose.Types.ObjectId.isValid(val as string);
      },
      { message: 'parentChapterId must be a valid ObjectId' }
    ),
});

type IChapterCreateDTO = z.infer<typeof ChapterCreateDTO>;

export { ChapterCreateDTO };
export type { IChapterCreateDTO };
