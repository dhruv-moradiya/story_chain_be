import { z } from 'zod';
import { ObjectIdSchema } from '@utils/index';
import { CHAPTER_STATUSES } from '@/features/chapter/types/chapter-enum';

const ChapterIdSchema = z.object({
  chapterId: ObjectIdSchema(),
});

const ChapterSlugSchema = z.object({
  slug: z.string(),
});

const CreateChapterSchema = z.object({
  storySlug: z
    .string()
    .min(1, 'Story slug is required')
    .trim()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Story slug must be URL-friendly (lowercase, hyphen-separated)'
    ),

  title: z
    .string()
    .min(1, 'Chapter title is required')
    .max(150, 'Chapter title must be under 150 characters')
    .trim(),

  content: z
    .string()
    .min(1, 'Chapter content cannot be empty')
    .min(50, 'Chapter content is too short to be meaningful'),

  status: z
    .enum(CHAPTER_STATUSES, {
      errorMap: () => ({ message: 'Invalid chapter status' }),
    })
    .default('draft'),

  parentChapterSlug: z
    .string()
    .min(1, 'Parent chapter slug is required')
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Parent chapter slug must be URL-friendly'),
});

type TChapterIdSchema = z.infer<typeof ChapterIdSchema>;
type TChapterSlugSchema = z.infer<typeof ChapterSlugSchema>;
type TCreateChapterSchema = z.infer<typeof CreateChapterSchema>;

export { ChapterIdSchema, ChapterSlugSchema, CreateChapterSchema };

export type { TChapterIdSchema, TChapterSlugSchema, TCreateChapterSchema };
