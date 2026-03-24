import { PR_COMMENT_TYPES } from '@/features/prComment/types/prComment-enum';
import { ObjectIdSchema } from '@utils/index';
import { z } from 'zod';

const AddPrCommentSchema = z.object({
  commentType: z.enum([...PR_COMMENT_TYPES], {
    errorMap: () => ({
      message: `Invalid comment type, must be one of ${PR_COMMENT_TYPES.join(', ')}`,
    }),
  }),

  content: z
    .string()
    .trim()
    .min(1, 'Content is required')
    .max(5000, 'Content must be less than 5000 characters'),

  suggestion: z
    .object({
      line: z
        .number()
        .int('Line must be an integer')
        .positive('Line must be greater than 0')
        .optional(),

      originalText: z.string().trim().min(1, 'Original text is required'),

      suggestedText: z.string().trim().min(1, 'Suggested text is required'),
    })
    .optional(),

  parentCommentId: ObjectIdSchema().optional(),
});

const EditPrCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Content is required')
    .max(5000, 'Content must be less than 5000 characters'),

  suggestion: z
    .object({
      line: z
        .number()
        .int('Line must be an integer')
        .positive('Line must be greater than 0')
        .optional(),

      originalText: z.string().trim().min(1, 'Original text is required'),

      suggestedText: z.string().trim().min(1, 'Suggested text is required'),
    })
    .optional(),
});

const PRCommentParamsSchema = z.object({
  pullRequestId: ObjectIdSchema(),
  commentId: ObjectIdSchema(),
});

type TAddPRCommentSchema = z.infer<typeof AddPrCommentSchema>;
type TEditPRCommentSchema = z.infer<typeof EditPrCommentSchema>;
type TPRCommentParamsSchema = z.infer<typeof PRCommentParamsSchema>;

export { AddPrCommentSchema, EditPrCommentSchema, PRCommentParamsSchema };

export type { TAddPRCommentSchema, TEditPRCommentSchema, TPRCommentParamsSchema };
