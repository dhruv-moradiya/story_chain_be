import { FastifyInstance } from 'fastify';
import zodToJsonSchema from 'zod-to-json-schema';
import { container } from 'tsyringe';
import { TOKENS } from '@/container';
import {
  type AuthMiddlewareFactory,
  type PlatformRoleMiddlewareFactory,
} from '@/middlewares/factories';
import {
  CoinBundleCreateSchema,
  CoinBundleAdminListQuerySchema,
} from '@schema/request/coinBundle.schema';
import { CoinBundleResponses } from '@schema/response/coinBundle.response';
import { type CoinBundleController } from '../controllers/coinBundle.controller';
import { RateLimits } from '@/constants/rateLimits';

const CoinBundleApiRoutes = {
  Create: '/',
  AdminList: '/admin/coin-bundles',
} as const;

export { CoinBundleApiRoutes };

export async function coinBundleRoutes(fastify: FastifyInstance) {
  const coinBundleController = container.resolve<CoinBundleController>(TOKENS.CoinBundleController);

  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);
  const platformRoleFactory = container.resolve<PlatformRoleMiddlewareFactory>(
    TOKENS.PlatformRoleMiddlewareFactory
  );

  const validateAuth = authFactory.createAuthMiddleware();
  const PlatformRoleGuards = platformRoleFactory.createGuards();

  // ──────────────────────────────────────────────────────────────────────────
  // POST /coin-bundles  — Super Admin only
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post(
    CoinBundleApiRoutes.Create,
    {
      preHandler: [validateAuth, PlatformRoleGuards.superAdmin],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description:
          'Create a new coin bundle (SUPER_ADMIN only). totalCoins is server-computed; slug is auto-generated from name when not provided; createdBy is set from the auth token.',
        tags: ['Coin Bundles'],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(CoinBundleCreateSchema),
      },
    },
    coinBundleController.create
  );

  // ──────────────────────────────────────────────────────────────────────────
  // GET /admin/coin-bundles  — Super Admin only, no cache
  // ──────────────────────────────────────────────────────────────────────────
  fastify.get(
    CoinBundleApiRoutes.AdminList,
    {
      preHandler: [validateAuth, PlatformRoleGuards.superAdmin],
      config: { rateLimit: RateLimits.AUTHENTICATED },
      schema: {
        description:
          'List all coin bundles for admin. Supports filtering by name, isActive, isDeleted, bundleType and sorting by displayOrder, createdAt, or name. Results are never cached.',
        tags: ['Coin Bundles'],
        security: [{ bearerAuth: [] }],
        querystring: zodToJsonSchema(CoinBundleAdminListQuerySchema),
        response: CoinBundleResponses.coinBundleAdminList,
      },
    },
    coinBundleController.listForAdmin
  );
}
