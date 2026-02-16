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

type AuthUser = IUser & IPlatformRole;

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser;
    storyContext?: IStoryContext;
    userStoryRole?: TStoryCollaboratorRole | null;
  }
}

/**
 * Authentication middleware that validates user and attaches to request
 * Uses DI to resolve repositories
 */
export async function validateAuth(request: FastifyRequest, _reply: FastifyReply) {
  try {
    const auth = getAuth(request);

    if (!auth?.userId) {
      throw AppError.unauthorized('UNAUTHORIZED', 'You must be logged in to access this resource.');
    }

    const userService = container.resolve<UserService>(TOKENS.UserService);
    const platformRoleRepo = container.resolve<PlatformRoleRepository>(
      TOKENS.PlatformRoleRepository
    );

    // Use getOrCreateUser for JIT user creation - handles webhook race condition
    const user = await userService.getOrCreateUser(auth.userId);

    const platformRole = await platformRoleRepo.findByUserId(auth.userId);
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

    request.user = { ...user, ...platformRole.toObject() };
  } catch (error: unknown) {
    logger.error('Received error while checking auth: ', { error });

    // Pass strictly typed AppErrors through
    if (error instanceof AppError) {
      throw error;
    }

    throw AppError.internal(
      'Something went wrong while verifying your authentication. Please try again.'
    );
  }
}
