import { RateLimits } from '@/constants/rateLimits';
import { TOKENS } from '@/container';
import { AuthMiddlewareFactory, PlatformRoleMiddlewareFactory } from '@/middlewares/factories';
import {
  GetAllCoinTransactionsQuerySchema,
  GetMyCoinPurchasesQuerySchema,
} from '@/schema/request/coinTransaction.schema';
import { CoinTransactionResponses } from '@/schema/response/coinTransaction.response';
import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import zodToJsonSchema from 'zod-to-json-schema';
import { CoinTransactionController } from '../controllers/coinTransaction.controller';

export async function coinTransactionRoutes(fastify: FastifyInstance) {
  const coinTransactionController = container.resolve<CoinTransactionController>(
    TOKENS.CoinTransactionController
  );

  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);
  const platformRoleFactory = container.resolve<PlatformRoleMiddlewareFactory>(
    TOKENS.PlatformRoleMiddlewareFactory
  );

  const validateAuth = authFactory.createAuthMiddleware();
  const PlatformRoleGuards = platformRoleFactory.createGuards();

  fastify.get(
    '/my-purchases',
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.PUBLIC_READ },
      schema: {
        description: 'Get all coin purchases made by the authenticated user',
        tags: ['Coin Transactions'],
        security: [{ bearerAuth: [] }],
        querystring: zodToJsonSchema(GetMyCoinPurchasesQuerySchema),
        response: CoinTransactionResponses.coinTransactionList,
      },
    },
    coinTransactionController.getMyPurchases
  );

  fastify.get(
    '/',
    {
      preHandler: [validateAuth, PlatformRoleGuards.superAdmin],
      config: { rateLimit: RateLimits.AUTHENTICATED },
      schema: {
        description: 'Get all coin transactions (SUPER_ADMIN only)',
        tags: ['Coin Transactions'],
        security: [{ bearerAuth: [] }],
        querystring: zodToJsonSchema(GetAllCoinTransactionsQuerySchema),
        response: CoinTransactionResponses.coinTransactionList,
      },
    },
    coinTransactionController.getAllTransactions
  );
}
