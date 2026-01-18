import { getAuth } from '@clerk/fastify';
import { FastifyReply, FastifyRequest } from 'fastify';
import { container } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { HTTP_STATUS } from '@constants/httpStatus';
import { IUser } from '@features/user/types/user.types';
import { IPlatformRole } from '@features/platformRole/types/platformRole.types';
import { TStoryCollaboratorRole } from '@features/storyCollaborator/types/storyCollaborator.types';
import { IStoryContext } from '@features/story/types/story.types';
import { logger } from '@utils/logger';
import { UserRepository } from '@features/user/repositories/user.repository';
import { PlatformRoleRepository } from '@features/platformRole/repositories/platformRole.repository';

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
export async function validateAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const auth = getAuth(request);

    if (!auth?.userId) {
      return reply.code(HTTP_STATUS.UNAUTHORIZED.code).send({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource.',
      });
    }

    const userRepo = container.resolve<UserRepository>(TOKENS.UserRepository);
    const platformRoleRepo = container.resolve<PlatformRoleRepository>(
      TOKENS.PlatformRoleRepository
    );

    const [user, platformRole] = await Promise.all([
      userRepo.findByClerkId(auth.userId),
      platformRoleRepo.findByUserId(auth.userId),
    ]);

    if (!user) {
      return reply.code(HTTP_STATUS.UNAUTHORIZED.code).send({
        error: 'User not found',
        message: 'Your account could not be located. Please contact support if this continues.',
      });
    }

    if (!platformRole) {
      return reply.code(HTTP_STATUS.FORBIDDEN.code).send({
        error: 'Access denied',
        message: 'Your account does not have a platform role assigned. Access is not permitted.',
      });
    }
    request.user = { ...user, ...platformRole };
  } catch (error: unknown) {
    logger.error('Received error while checking auth: ', { error });
    return reply.code(500).send({
      error: 'Unexpected server error',
      message: 'Something went wrong while verifying your authentication. Please try again.',
    });
  }
}
