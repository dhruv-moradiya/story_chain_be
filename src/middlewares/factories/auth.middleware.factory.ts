import { getAuth } from '@clerk/fastify';
import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { HTTP_STATUS } from '@constants/httpStatus';
import { UserRepository } from '@features/user/repositories/user.repository';
import { PlatformRoleRepository } from '@features/platformRole/repositories/platformRole.repository';
import { logger } from '@utils/logger';

@singleton()
export class AuthMiddlewareFactory {
  constructor(
    @inject(TOKENS.UserRepository)
    private readonly userRepo: UserRepository,
    @inject(TOKENS.PlatformRoleRepository)
    private readonly platformRoleRepo: PlatformRoleRepository
  ) {}

  /**
   * Creates a middleware that validates authentication and attaches user to request
   */
  createAuthMiddleware() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const auth = getAuth(request);

        if (!auth?.userId) {
          return reply.code(HTTP_STATUS.UNAUTHORIZED.code).send({
            error: 'Authentication required',
            message: 'You must be logged in to access this resource.',
          });
        }

        const [user, platformRole] = await Promise.all([
          this.userRepo.findByClerkId(auth.userId),
          this.platformRoleRepo.findByUserId(auth.userId),
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
            message:
              'Your account does not have a platform role assigned. Access is not permitted.',
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
    };
  }
}
