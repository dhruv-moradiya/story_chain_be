import { clerkClient } from '@clerk/fastify';
import { logger } from './logger';

export interface ClerkUserData {
  clerkId: string;
  email: string;
  username: string;
  avatarUrl?: string;
}

/**
 * Fetches user data directly from Clerk API
 * Used for JIT (Just-In-Time) user creation when webhook hasn't arrived yet
 */
export async function fetchClerkUser(clerkId: string): Promise<ClerkUserData | null> {
  try {
    const user = await clerkClient.users.getUser(clerkId);

    return {
      clerkId: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      username: user.username || user.firstName || `user_${user.id.slice(-8)}`,
      avatarUrl: user.imageUrl,
    };
  } catch (error) {
    logger.error('[ClerkClient] Failed to fetch user from Clerk:', { clerkId, error });
    return null;
  }
}
