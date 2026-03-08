import { z } from 'zod';
import { PR_LABELS } from '@/features/pullRequest/types/pullRequest-enum';
import { ObjectIdSchema } from '@utils/index';

const BasePullRequestSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be under 200 characters')
    .trim(),
  description: z.string().max(2000, 'Description must be under 2000 characters').trim().optional(),
  storySlug: z
    .string()
    .min(1, 'Story slug is required')
    .trim()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Story slug must be URL-friendly (lowercase, hyphen-separated)'
    ),
  isDraft: z.boolean().optional(),
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

const UpdatePRLabelsSchema = z.object({
  labels: z.array(z.enum(PR_LABELS)),
});

const UpdatePRParamsSchema = z.object({
  id: ObjectIdSchema(),
});

type TCreateNewChapterPRSchema = z.infer<typeof CreateNewChapterPRSchema>;
type TCreateEditChapterPRSchema = z.infer<typeof CreateEditChapterPRSchema>;
type TCreateDeleteChapterPRSchema = z.infer<typeof CreateDeleteChapterPRSchema>;
type TCreatePullRequestSchema = z.infer<typeof CreatePullRequestSchema>;
type TUpdatePRLabelsSchema = z.infer<typeof UpdatePRLabelsSchema>;
type TUpdatePRParamsSchema = z.infer<typeof UpdatePRParamsSchema>;

export {
  CreatePullRequestSchema,
  CreateNewChapterPRSchema,
  CreateEditChapterPRSchema,
  CreateDeleteChapterPRSchema,
  UpdatePRLabelsSchema,
  UpdatePRParamsSchema,
};

export type {
  TCreatePullRequestSchema,
  TCreateNewChapterPRSchema,
  TCreateEditChapterPRSchema,
  TCreateDeleteChapterPRSchema,
  TUpdatePRLabelsSchema,
  TUpdatePRParamsSchema,
};
