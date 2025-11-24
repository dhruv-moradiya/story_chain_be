import { z } from 'zod';
import mongoose from 'mongoose';
import { CHAPTER_LIMITS } from '../../constants';

const objectIdSchema = () =>
  z
    .string()
    .min(1, { message: 'An ObjectId must be provided.' })
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: 'Please provide a valid MongoDB ObjectId.',
    });

export const createChapterSchema = z.object({
  storyId: objectIdSchema().transform((s) => s.trim()),
  parentChapterId: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (typeof v === 'string' ? v.trim() : v))
    .refine(
      (val) => {
        if (val === undefined || val === null || val === '') return true;
        return mongoose.Types.ObjectId.isValid(val as string);
      },
      { message: 'parentChapterId must be a valid ObjectId' }
    ),
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
});

export const updateChapterTitleSchema = z.object({
  title: z
    .string()
    .min(CHAPTER_LIMITS.TITLE.MIN_LENGTH, {
      message: `Title must be at least ${CHAPTER_LIMITS.TITLE.MIN_LENGTH} characters`,
    })
    .max(CHAPTER_LIMITS.TITLE.MAX_LENGTH, {
      message: `Title must be at most ${CHAPTER_LIMITS.TITLE.MAX_LENGTH} characters`,
    })
    .transform((s) => s.trim()),
});

export const updateChapterContentSchema = z.object({
  content: z
    .string()
    .min(CHAPTER_LIMITS.CONTENT.MIN_LENGTH, {
      message: `Content must be at least ${CHAPTER_LIMITS.CONTENT.MIN_LENGTH} characters`,
    })
    .max(CHAPTER_LIMITS.CONTENT.MAX_LENGTH, {
      message: `Content must be at most ${CHAPTER_LIMITS.CONTENT.MAX_LENGTH} characters`,
    })
    .transform((s) => s.trim()),
});
