import { FastifyReply, FastifyRequest, RouteGenericInterface, RouteHandlerMethod } from 'fastify';

type AsyncHandler<T extends RouteGenericInterface = RouteGenericInterface> = (
  req: FastifyRequest<T>,
  reply: FastifyReply
) => Promise<unknown>;

export const catchAsync = <T extends RouteGenericInterface = RouteGenericInterface>(
  fn: AsyncHandler<T>
): RouteHandlerMethod => {
  return async (req, reply) => {
    try {
      await fn(req as FastifyRequest<T>, reply);
    } catch (error) {
      reply.send(error);
    }
  };
};
