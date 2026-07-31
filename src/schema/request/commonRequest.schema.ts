import { z } from 'zod';

export const ClerkUserIdSchema = z
  .string()
  .regex(/^user_[A-Za-z0-9]{20,}$/, 'Invalid Clerk user ID');
