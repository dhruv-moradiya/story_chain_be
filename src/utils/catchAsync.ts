import { FastifyReply, FastifyRequest } from 'fastify';

export const catchAsync = (fn: Function) => {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await fn(req, reply);
    } catch (error) {
      reply.send(error);
    }
  };
};
