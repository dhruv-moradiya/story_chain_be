import { z } from 'zod';
import { PR_REVIEW_DECISIONS } from '@features/prReview/types/prReview-enum';

// ─────────────────────────────────────────────────────────────────────────────
// Shared
// ─────────────────────────────────────────────────────────────────────────────

export const PRIdParamSchema = z.object({
  prId: z.string({ required_error: 'prId is required.' }).trim().min(1),
});

export const StorySlugParamSchema = z.object({
  slug: z.string({ required_error: 'Story slug is required.' }).trim().min(1),
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Update title / description
//    PATCH /api/pull-requests/:prId/metadata
// ─────────────────────────────────────────────────────────────────────────────

export const UpdatePRMetadataBodySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Title must be at least 3 characters.')
      .max(200, 'Title must be at most 200 characters.')
      .optional(),

    description: z
      .string()
      .trim()
      .max(2000, 'Description must be at most 2000 characters.')
      .optional(),
  })
  .refine((d) => d.title !== undefined || d.description !== undefined, {
    message: 'Provide at least one field to update (title or description).',
  });

export type TUpdatePRMetadataBody = z.infer<typeof UpdatePRMetadataBodySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Toggle draft status
//    PATCH /api/pull-requests/:prId/draft
// ─────────────────────────────────────────────────────────────────────────────

export const TogglePRDraftBodySchema = z.object({
  isDraft: z.boolean({ required_error: 'isDraft is required.' }),
  draftReason: z
    .string()
    .trim()
    .max(500, 'Draft reason must be at most 500 characters.')
    .optional(),
});

export type TTogglePRDraftBody = z.infer<typeof TogglePRDraftBodySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 3. Update labels
//    PUT /api/pull-requests/:prId/labels
// ─────────────────────────────────────────────────────────────────────────────

export const UpdatePRLabelsBodySchema = z.object({
  storySlug: z
    .string({ required_error: 'storySlug is required.' })
    .trim()
    .min(1, 'storySlug cannot be empty.'),

  labels: z.array(z.string().trim().min(1).max(50)).max(10, 'A PR can have at most 10 labels.'),
});

export type TUpdatePRLabelsBody = z.infer<typeof UpdatePRLabelsBodySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 4. Submit review
//    POST /api/pull-requests/:prId/reviews
// ─────────────────────────────────────────────────────────────────────────────

export const SubmitPRReviewBodySchema = z.object({
  storySlug: z.string({ required_error: 'storySlug is required.' }).trim().min(1),

  decision: z.enum(PR_REVIEW_DECISIONS, {
    errorMap: () => ({
      message: `decision must be one of: ${PR_REVIEW_DECISIONS.join(', ')}`,
    }),
  }),

  summary: z
    .string({ required_error: 'summary is required.' })
    .trim()
    .min(10, 'Summary must be at least 10 characters.')
    .max(3000, 'Summary must be at most 3000 characters.'),

  overallRating: z
    .number()
    .int()
    .min(1, 'Rating must be between 1 and 5.')
    .max(5, 'Rating must be between 1 and 5.')
    .optional(),
});

export type TSubmitPRReviewBody = z.infer<typeof SubmitPRReviewBodySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 5. Merge PR
//    POST /api/pull-requests/:prId/merge
// ─────────────────────────────────────────────────────────────────────────────

export const MergePRBodySchema = z.object({
  storySlug: z.string({ required_error: 'storySlug is required.' }).trim().min(1),
});

export type TMergePRBody = z.infer<typeof MergePRBodySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 6. Add comment
//    POST /api/pull-requests/:prId/comments
// ─────────────────────────────────────────────────────────────────────────────

export const AddPRCommentBodySchema = z.object({
  storySlug: z.string({ required_error: 'storySlug is required.' }).trim().min(1),

  content: z
    .string({ required_error: 'content is required.' })
    .trim()
    .min(1, 'Comment content cannot be empty.')
    .max(2000, 'Comment content must be at most 2000 characters.'),

  parentCommentId: z.string().trim().optional(),
});

export type TAddPRCommentBody = z.infer<typeof AddPRCommentBodySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Re-exports from creation schema (keeps imports centralised)
// ─────────────────────────────────────────────────────────────────────────────

export {
  CreatePRFromDraftBodySchema,
  CreatePRFromAutoSaveBodySchema,
  type TCreatePRFromDraftBody,
  type TCreatePRFromAutoSaveBody,
} from './pullRequest.schema';
