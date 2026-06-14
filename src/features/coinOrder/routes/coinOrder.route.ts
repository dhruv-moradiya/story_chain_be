import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { CoinOrderController } from '../controllers/coinOrder.controller';
import { AuthMiddlewareFactory } from '@/middlewares/factories';
import zodToJsonSchema from 'zod-to-json-schema';
import { CoinOrderCreateSchema } from '@/schema/request/coinOrder.schema';
import { TOKENS } from '@/container';

const CoinOrderApiRoutes = {
  create: '/',
};

export async function coinOrderRoutes(fastify: FastifyInstance) {
  const CoinOrderController = container.resolve<CoinOrderController>(TOKENS.CoinOrderController);

  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);

  const validateAuth = authFactory.createAuthMiddleware();

  fastify.post(
    CoinOrderApiRoutes.create,
    {
      preHandler: [validateAuth],
      schema: {
        description: '',
        tags: [''],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(CoinOrderCreateSchema),
      },
    },
    CoinOrderController.createOrder
  );
}
