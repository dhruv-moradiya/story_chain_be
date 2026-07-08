import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { CoinOrderController } from '../controllers/coinOrder.controller';
import { AuthMiddlewareFactory } from '@/middlewares/factories';
import zodToJsonSchema from 'zod-to-json-schema';
import { CoinOrderCreateSchema, CoinOrderVerifySchema } from '@/schema/request/coinOrder.schema';
import { TOKENS } from '@/container';
import fastifyRawBody from 'fastify-raw-body';

const CoinOrderApiRoutes = {
  Create: '/',
  VerifyPayment: '/verify-payment',
  WebHook: '/webhook/razorpay',
};

export async function coinOrderRoutes(fastify: FastifyInstance) {
  const CoinOrderController = container.resolve<CoinOrderController>(TOKENS.CoinOrderController);

  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);

  const validateAuth = authFactory.createAuthMiddleware();

  await fastify.register(fastifyRawBody, {
    global: false,
    encoding: false,
  });

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

  fastify.post(
    CoinOrderApiRoutes.WebHook,
    {
      config: { rawBody: true },
      schema: {
        description: 'Razorpay webhook receiver — payment.captured / payment.failed',
        tags: ['coin-order'],
      },
    },
    CoinOrderController.verifyWebHook
  );
}
