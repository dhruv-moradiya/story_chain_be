import { PR_REVIEW_STATUSES } from '@/features/prReview/types/prReview-enum';
import { z } from 'zod';

const PRReviewFeedbackSchema = z.object({
  section: z.string().trim().min(1, 'Section cannot be empty').optional(),
  rating: z
    .number()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating cannot exceed 5')
    .optional(),
  comment: z.string().trim().min(1, 'Comment cannot be empty').max(1000).optional(),
});

const SubmitPRReviewSchema = z.object({
  reviewStatus: z.enum([...PR_REVIEW_STATUSES], {
    errorMap: () => ({
      message: `Invalid review status, must be one of ${PR_REVIEW_STATUSES.join(', ')}`,
    }),
  }),
  summary: z.string().trim().max(2000, 'Summary must be less than 2000 characters').optional(),
  feedback: z.array(PRReviewFeedbackSchema).max(20, 'Feedback cannot exceed 20 items').optional(),
  overallRating: z
    .number()
    .min(1, 'Overall rating must be at least 1')
    .max(5, 'Overall rating cannot exceed 5')
    .optional(),
});

type TSubmitPRReviewSchema = z.infer<typeof SubmitPRReviewSchema>;

export { PRReviewFeedbackSchema, SubmitPRReviewSchema };

export type { TSubmitPRReviewSchema };
