import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { CoinOrderController } from '../controllers/coinOrder.controller';
import { AuthMiddlewareFactory } from '@/middlewares/factories';
import zodToJsonSchema from 'zod-to-json-schema';
import { CoinOrderCreateSchema, CoinOrderVerifySchema } from '@/schema/request/coinOrder.schema';
import { TOKENS } from '@/container';

const CoinOrderApiRoutes = {
  Create: '/',
  VerifyPayment: '/verify-payment',
};

export async function coinOrderRoutes(fastify: FastifyInstance) {
  const CoinOrderController = container.resolve<CoinOrderController>(TOKENS.CoinOrderController);

  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);

  const validateAuth = authFactory.createAuthMiddleware();

  fastify.post(
    CoinOrderApiRoutes.Create,
    {
      preHandler: [validateAuth],
      schema: {
        description: 'create coin order',
        tags: ['coin-order'],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(CoinOrderCreateSchema),
      },
    },
    CoinOrderController.createOrder
  );

  fastify.post(
    CoinOrderApiRoutes.VerifyPayment,
    {
      preHandler: [validateAuth],
      schema: {
        description: 'verify payment',
        tags: ['coin-order'],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(CoinOrderVerifySchema),
      },
    },
    CoinOrderController.verifyPayment
  );
}
