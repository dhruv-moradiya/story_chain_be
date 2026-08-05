import { z } from 'zod';

export const PublicUserSchema = z.object({
  clerkId: z.string(),
  username: z.string(),
  avatarUrl: z.string(),
});

export const StoryBanDetailsSchema = z.object({
  _id: z.string(),
  storySlug: z.string(),
  userId: z.string(),
  bannedBy: PublicUserSchema,
  bannedByRole: z.string(),
  reason: z.string(),
  reportId: z.string().optional(),
  isActive: z.boolean(),
  expiresAt: z.date().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const StoryBanStatusResponseSchema = z.object({
  isBanned: z.boolean(),
  banDetails: StoryBanDetailsSchema.nullable(),
});
