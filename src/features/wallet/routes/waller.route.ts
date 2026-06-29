import { RateLimits } from '@/constants/rateLimits';
import { TOKENS } from '@/container';
import { AuthMiddlewareFactory } from '@/middlewares/factories';
import { WalletSchema } from '@/schema/response/wallet.response';
import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { WalletController } from '../controllers/waller.controller';

const WalletApiRoutes = {
  GetUserBalance: '/balance',
} as const;

export async function walletRoutes(fastify: FastifyInstance) {
  const walletController = container.resolve<WalletController>(TOKENS.WalletController);

  const authMiddlewareFactory = container.resolve<AuthMiddlewareFactory>(
    TOKENS.AuthMiddlewareFactory
  );
  const validateAuth = authMiddlewareFactory.createAuthMiddleware();

  fastify.get(
    WalletApiRoutes.GetUserBalance,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.AUTHENTICATED },
      schema: {
        description: 'Get current user wallet balance',
        tags: ['Wallet'],
        security: [{ bearerAuth: [] }],
        response: WalletSchema.balance,
      },
    },
    walletController.getUserBalance
  );
}
