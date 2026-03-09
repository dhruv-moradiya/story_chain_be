import { getAuth } from '@clerk/fastify';
import { FastifyReply, FastifyRequest } from 'fastify';
import { container } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { IUser } from '@features/user/types/user.types';
import { IPlatformRole } from '@features/platformRole/types/platformRole.types';
import { TStoryCollaboratorRole } from '@features/storyCollaborator/types/storyCollaborator.types';
import { IStoryContext } from '@features/story/types/story.types';
import { logger } from '@utils/logger';
import { UserService } from '@features/user/services/user.service';
import { PlatformRoleRepository } from '@features/platformRole/repositories/platformRole.repository';
import { AppError } from '@infrastructure/errors/app-error';
import { CacheService } from '@/infrastructure/cache/cache.service';
import { CacheKeyBuilder } from '@/infrastructure';

type AuthUser = IUser & IPlatformRole;

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser;
    storyContext?: IStoryContext;
    userStoryRole?: TStoryCollaboratorRole | null;
  }
}

/**
 * Create a performance-optimized auth middleware with pre-resolved DI and caching.
 * Resolves services once at startup instead of every request.
 */
export function createAuthMiddleware() {
  const userService = container.resolve<UserService>(TOKENS.UserService);
  const platformRoleRepo = container.resolve<PlatformRoleRepository>(TOKENS.PlatformRoleRepository);
  const cacheService = container.resolve<CacheService>(TOKENS.CacheService);

  return async function validateAuth(request: FastifyRequest, _reply: FastifyReply) {
    try {
      const auth = getAuth(request);

      if (!auth?.userId) {
        throw AppError.unauthorized(
          'UNAUTHORIZED',
          'You must be logged in to access this resource.'
        );
      }

      const cacheKey = CacheKeyBuilder.userProfile(auth.userId);

      // 1. Try cache first — avoids multiple DB lookups
      const cachedAuth = await cacheService.get<AuthUser>(cacheKey);
      if (cachedAuth) {
        request.user = cachedAuth;
        return;
      }

      // 2. Cache miss — fetch from DB in parallel
      const [user, platformRole] = await Promise.all([
        userService.getOrCreateUser(auth.userId),
        platformRoleRepo.findByUserId(auth.userId),
      ]);

      if (!user) {
        throw AppError.unauthorized(
          'UNAUTHORIZED',
          'Your account could not be located. Please contact support if this continues.'
        );
      }

      if (!platformRole) {
        throw AppError.forbidden(
          'FORBIDDEN',
          'Your account does not have a platform role assigned. Access is not permitted.'
        );
      }

      const authUser: AuthUser = { ...user, ...platformRole.toObject() };

      // 3. Cache the resolved auth user (5 min TTL)
      await cacheService.set(cacheKey, authUser, { ttl: 300 });

      request.user = authUser;
    } catch (error: unknown) {
      logger.error('Received error while checking auth: ', { error });

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.internal(
        'Something went wrong while verifying your authentication. Please try again.'
      );
    }
  };
}

/**
 * Performance-optimized auth middleware.
 * Uses lazy-initialization to resolve DI services once, then reuses the closure.
 */
let memoizedAuthMiddleware: ReturnType<typeof createAuthMiddleware> | null = null;

export async function validateAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!memoizedAuthMiddleware) {
    memoizedAuthMiddleware = createAuthMiddleware();
  }
  return memoizedAuthMiddleware(request, reply);
}
