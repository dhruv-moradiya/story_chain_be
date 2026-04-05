import { z } from 'zod';
import { PR_TYPES } from '@features/pullRequest/types/pullRequest-enum';

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-schemas
// ─────────────────────────────────────────────────────────────────────────────

const PRTypeSchema = z.enum(PR_TYPES, {
  errorMap: () => ({ message: `PR type must be one of: ${PR_TYPES.join(', ')}` }),
});

const PRMetaSchema = z.object({
  title: z
    .string({ required_error: 'PR title is required.' })
    .trim()
    .min(3, 'PR title must be at least 3 characters.')
    .max(200, 'PR title must be at most 200 characters.'),

  description: z
    .string()
    .trim()
    .max(2000, 'Description must be at most 2000 characters.')
    .optional(),

  parentChapterSlug: z
    .string({ required_error: 'parentChapterSlug is required.' })
    .trim()
    .min(1, 'parentChapterSlug cannot be empty.'),

  prType: PRTypeSchema,

  isDraft: z.boolean().optional().default(false),

  draftReason: z
    .string()
    .trim()
    .max(500, 'Draft reason must be at most 500 characters.')
    .optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Route param schemas
// ─────────────────────────────────────────────────────────────────────────────

export const StorySlugParamSchema = z.object({
  slug: z.string({ required_error: 'Story slug is required.' }).trim().min(1),
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Create PR from draft chapter
//    POST /api/pull-requests/stories/:slug/from-draft
// ─────────────────────────────────────────────────────────────────────────────

export const CreatePRFromDraftBodySchema = PRMetaSchema.extend({
  chapterSlug: z
    .string({ required_error: 'chapterSlug is required.' })
    .trim()
    .min(1, 'chapterSlug cannot be empty.'),
});

export type TCreatePRFromDraftBody = z.infer<typeof CreatePRFromDraftBodySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Create PR from auto-save
//    POST /api/pull-requests/stories/:slug/from-autosave
// ─────────────────────────────────────────────────────────────────────────────

export const CreatePRFromAutoSaveBodySchema = PRMetaSchema.extend({
  autoSaveId: z
    .string({ required_error: 'autoSaveId is required.' })
    .trim()
    .min(1, 'autoSaveId cannot be empty.'),
});

export type TCreatePRFromAutoSaveBody = z.infer<typeof CreatePRFromAutoSaveBodySchema>;
