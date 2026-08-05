import { z } from 'zod';

export const CheckStoryBanParamsSchema = z.object({
  storySlug: z.string().min(1, 'Story slug is required'),
  userId: z.string().min(1, 'User ID is required'),
});

export type TCheckStoryBanParamsInput = z.infer<typeof CheckStoryBanParamsSchema>;
