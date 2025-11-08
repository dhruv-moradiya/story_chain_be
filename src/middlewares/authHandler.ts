import { getAuth } from '@clerk/fastify';
import { FastifyReply, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

export async function validateAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const auth = getAuth(request);

    if (!auth?.userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    request.userId = auth.userId;
  } catch (error) {
    return reply.code(500).send({ error: 'Internal Server Error while checking authentication.' });
  }
}
