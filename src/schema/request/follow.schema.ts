import { z } from 'zod';

export const ToggleFollowRequestSchema = z.object({
  followingId: z.string().min(1, 'Please provide the user ID'),
});

export type TToggleFollowRequest = z.infer<typeof ToggleFollowRequestSchema>;
