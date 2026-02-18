import { z } from 'zod';

const BasePullRequestSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be under 200 characters')
    .trim(),
  description: z
    .string()
    .max(2000, 'Description must be under 2000 characters')
    .trim()
    .optional()
    .default(''),
  storySlug: z
    .string()
    .min(1, 'Story slug is required')
    .trim()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Story slug must be URL-friendly (lowercase, hyphen-separated)'
    ),
  isDraft: z.boolean().optional().default(false),
});

const CreateNewChapterPRSchema = BasePullRequestSchema.extend({
  prType: z.literal('new_chapter'),
  chapterSlug: z
    .string()
    .min(1, 'Chapter slug is required')
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Chapter slug must be URL-friendly'),
  parentChapterSlug: z
    .string()
    .min(1, 'Parent chapter slug is required')
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Parent chapter slug must be URL-friendly'),
  changes: z.object({
    proposed: z.string().max(100000, 'Proposed content exceeds maximum size'),
  }),
}).passthrough();

const CreateEditChapterPRSchema = BasePullRequestSchema.extend({
  prType: z.literal('edit_chapter'),
  chapterSlug: z
    .string()
    .min(1, 'Chapter slug is required')
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Chapter slug must be URL-friendly'),
  parentChapterSlug: z
    .string()
    .min(1, 'Parent chapter slug is required')
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Parent chapter slug must be URL-friendly'),
  changes: z.object({
    original: z.string().max(100000, 'Original content exceeds maximum size'),
    proposed: z.string().max(100000, 'Proposed content exceeds maximum size'),
  }),
}).passthrough();

const CreateDeleteChapterPRSchema = BasePullRequestSchema.extend({
  prType: z.literal('delete_chapter'),
  chapterSlug: z
    .string()
    .min(1, 'Chapter slug is required')
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Chapter slug must be URL-friendly'),
  parentChapterSlug: z
    .string()
    .min(1, 'Parent chapter slug is required')
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Parent chapter slug must be URL-friendly'),
  changes: z.object({
    original: z.string().max(100000, 'Original content exceeds maximum size'),
  }),
}).passthrough();

const CreatePullRequestSchema = z.discriminatedUnion('prType', [
  CreateNewChapterPRSchema,
  CreateEditChapterPRSchema,
  CreateDeleteChapterPRSchema,
]);

type TCreateNewChapterPRSchema = z.infer<typeof CreateNewChapterPRSchema>;
type TCreateEditChapterPRSchema = z.infer<typeof CreateEditChapterPRSchema>;
type TCreateDeleteChapterPRSchema = z.infer<typeof CreateDeleteChapterPRSchema>;
type TCreatePullRequestSchema = z.infer<typeof CreatePullRequestSchema>;

export {
  CreatePullRequestSchema,
  CreateNewChapterPRSchema,
  CreateEditChapterPRSchema,
  CreateDeleteChapterPRSchema,
};

export type {
  TCreatePullRequestSchema,
  TCreateNewChapterPRSchema,
  TCreateEditChapterPRSchema,
  TCreateDeleteChapterPRSchema,
};
