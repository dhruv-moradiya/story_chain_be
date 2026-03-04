import { z } from 'zod';
import { ObjectIdSchema } from '@utils/index';
import { CHAPTER_STATUSES } from '@/features/chapter/types/chapter-enum';
import { IChapter } from '@/features/chapter/types/chapter.types';

type TChapterFields = keyof IChapter;

const CHAPTER_FIELDS = [
  '_id',
  'title',
  'content',
  'slug',
  'storySlug',
  'authorId',
  'status',
  'parentChapterSlug',
  'ancestorSlugs',
  'depth',
  'chapterNumber',
  'branchIndex',
  'displayNumber',
  'isEnding',
  'version',
  'previousVersionId',
  'stats',
  'votes',
  'reportCount',
  'isFlagged',
  'createdAt',
  'updatedAt',
] as const satisfies TChapterFields[];

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

const ChapterFieldsQuerySchema = z.object({
  fields: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const requested = val.split(',').map((f) => f.trim());
      const allowed = CHAPTER_FIELDS as readonly string[];
      const validFields = requested.filter((f) => allowed.includes(f));
      return validFields.length > 0 ? validFields : undefined;
    }),
});

const ChapterSearchSchema = ChapterFieldsQuerySchema.extend({
  q: z.string().max(100, 'Search query too long').optional(),
  slug: z.string().optional(),
  storySlug: z.string().optional(),
  userId: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(10).optional(),
});

type TChapterIdSchema = z.infer<typeof ChapterIdSchema>;
type TChapterSlugSchema = z.infer<typeof ChapterSlugSchema>;
type TCreateChapterSchema = z.infer<typeof CreateChapterSchema>;
type TChapterFieldsQuerySchema = z.infer<typeof ChapterFieldsQuerySchema>;
type TChapterSearchSchema = z.infer<typeof ChapterSearchSchema>;

export {
  ChapterIdSchema,
  ChapterSlugSchema,
  CreateChapterSchema,
  ChapterFieldsQuerySchema,
  ChapterSearchSchema,
};

export type {
  TChapterIdSchema,
  TChapterSlugSchema,
  TCreateChapterSchema,
  TChapterFieldsQuerySchema,
  TChapterSearchSchema,
};
