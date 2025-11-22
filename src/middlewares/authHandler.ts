import { getAuth } from '@clerk/fastify';
import { FastifyReply, FastifyRequest } from 'fastify';
import { User } from '../models/user.model';
import { PlatformRole } from '../models/platformRole.model';
import { IUser } from '../features/user/user.types';
import { IPlatformRole } from '../features/platformRole/platformRole.types';
import { HTTP_STATUS } from '../constants/httpStatus';

type AuthUser = IUser & IPlatformRole;

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser;
  }
}

export async function validateAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const auth = getAuth(request);

    if (!auth?.userId) {
      return reply.code(HTTP_STATUS.UNAUTHORIZED.code).send({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource.',
      });
    }

    const [user, platformRole] = await Promise.all([
      User.findOne({ clerkId: auth.userId }).lean(),
      PlatformRole.findOne({ userId: auth.userId }).lean(),
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
  } catch (error) {
    console.error('validateAuth error:', error);
    return reply.code(500).send({
      error: 'Unexpected server error',
      message: 'Something went wrong while verifying your authentication. Please try again.',
    });
  }
}
