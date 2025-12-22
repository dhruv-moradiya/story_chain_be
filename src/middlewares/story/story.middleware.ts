import { FastifyReply, FastifyRequest } from 'fastify';
import { HTTP_STATUS } from '../../constants/httpStatus';
import { PlatformRole } from '../../features/platformRole/platformRole.types';

export async function validateSuperAdmin(request: FastifyRequest, reply: FastifyReply) {
  const { user } = request;

  if (user.role !== PlatformRole.SUPER_ADMIN) {
    return reply.code(HTTP_STATUS.FORBIDDEN.code).send({
      error: 'Access denied',
      message: 'You do not have permission to access this resource.',
    });
  }

  return;
}
