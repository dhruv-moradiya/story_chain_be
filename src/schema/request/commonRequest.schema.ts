import { z } from 'zod';

export const ClerkUserIdSchema = z
  .string()
  .regex(/^user_[A-Za-z0-9]{20,}$/, 'Invalid Clerk user ID');

export const ClerkUserIdParamsSchema = z.object({
  userId: ClerkUserIdSchema,
});

export const MongooseIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoId');

export type TClerkUserIdSchema = z.infer<typeof ClerkUserIdSchema>;
export type TClerkUserIdParamsSchema = z.infer<typeof ClerkUserIdParamsSchema>;
export type TMongooseIdSchema = z.infer<typeof MongooseIdSchema>;
