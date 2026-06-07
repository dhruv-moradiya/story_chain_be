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
  CoinBundleUpdateSchema,
  CoinBundleDisplayOrderSchema,
  CoinBundleUpdateThumbnailSchema,
} from '@schema/request/coinBundle.schema';
import { CoinBundleResponses } from '@schema/response/coinBundle.response';
import { type CoinBundleController } from '../controllers/coinBundle.controller';
import { RateLimits } from '@/constants/rateLimits';

const CoinBundleApiRoutes = {
  Create: '/',
  AdminList: '/admin/coin-bundles',
  Update: '/:slug',
  ToggleActive: '/:slug/toggle-active',
  DisplayOrder: '/:slug/display-order',
  UpdateThumbnail: '/:slug/thumbnail',
  GetSignatureUrlBySlug: '/signature-url',
  Delete: '/:slug',
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

  const superAdminHandlers = [validateAuth, PlatformRoleGuards.superAdmin];

  // ──────────────────────────────────────────────────────────────────────────
  // POST /coin-bundles  — Create a new bundle
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post(
    CoinBundleApiRoutes.Create,
    {
      preHandler: superAdminHandlers,
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
  // GET /admin/coin-bundles  — Admin list (no cache)
  // ──────────────────────────────────────────────────────────────────────────
  fastify.get(
    CoinBundleApiRoutes.AdminList,
    {
      preHandler: superAdminHandlers,
      config: { rateLimit: RateLimits.AUTHENTICATED },
      schema: {
        description:
          'List all coin bundles for admin. Supports filtering and sorting. Results are never cached.',
        tags: ['Coin Bundles'],
        security: [{ bearerAuth: [] }],
        querystring: zodToJsonSchema(CoinBundleAdminListQuerySchema),
        response: CoinBundleResponses.coinBundleAdminList,
      },
    },
    coinBundleController.listForAdmin
  );

  // ──────────────────────────────────────────────────────────────────────────
  // PUT /coin-bundles/:slug  — Full update
  // ──────────────────────────────────────────────────────────────────────────
  fastify.put(
    CoinBundleApiRoutes.Update,
    {
      preHandler: superAdminHandlers,
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description:
          'Full update of a coin bundle. slug/totalCoins/createdBy are ignored. updatedBy is set from auth token. Invalidates coin:bundle:{slug}, coin:bundles:active, coin:bundles:featured.',
        tags: ['Coin Bundles'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
        body: zodToJsonSchema(CoinBundleUpdateSchema),
        response: CoinBundleResponses.coinBundleUpdated,
      },
    },
    coinBundleController.update
  );

  // ──────────────────────────────────────────────────────────────────────────
  // PATCH /coin-bundles/:slug/toggle-active
  // ──────────────────────────────────────────────────────────────────────────
  fastify.patch(
    CoinBundleApiRoutes.ToggleActive,
    {
      preHandler: superAdminHandlers,
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description:
          'Flips isActive for the bundle. No body required. Immediately invalidates cache.',
        tags: ['Coin Bundles'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
        response: CoinBundleResponses.coinBundleToggleActive,
      },
    },
    coinBundleController.toggleActive
  );

  // ──────────────────────────────────────────────────────────────────────────
  // PATCH /coin-bundles/:slug/display-order
  // ──────────────────────────────────────────────────────────────────────────
  fastify.patch(
    CoinBundleApiRoutes.DisplayOrder,
    {
      preHandler: superAdminHandlers,
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Updates only the displayOrder. Used for drag-to-reorder in the admin panel.',
        tags: ['Coin Bundles'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
        body: zodToJsonSchema(CoinBundleDisplayOrderSchema),
        response: CoinBundleResponses.coinBundleDisplayOrder,
      },
    },
    coinBundleController.updateDisplayOrder
  );

  fastify.get(
    CoinBundleApiRoutes.GetSignatureUrlBySlug,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Get image upload signature URL by slug',
        tags: ['Coin Bundles'],
        security: [{ bearerAuth: [] }],
        response: CoinBundleResponses.signatureUrl,
      },
    },
    coinBundleController.getSignatureURLBySlug
  );

  // ──────────────────────────────────────────────────────────────────────────
  // PATCH /coin-bundles/:slug/thumbnail  — Update bundle thumbnail
  // ──────────────────────────────────────────────────────────────────────────
  fastify.patch(
    CoinBundleApiRoutes.UpdateThumbnail,
    {
      preHandler: superAdminHandlers,
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description:
          'Update coin bundle thumbnail image. Accepts a Cloudinary URL and publicId. Invalidates bundle cache.',
        tags: ['Coin Bundles'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
        body: zodToJsonSchema(CoinBundleUpdateThumbnailSchema),
        response: CoinBundleResponses.coinBundleThumbnailUpdated,
      },
    },
    coinBundleController.updateThumbnail
  );

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE /coin-bundles/:slug  — Soft delete
  // ──────────────────────────────────────────────────────────────────────────
  fastify.delete(
    CoinBundleApiRoutes.Delete,
    {
      preHandler: superAdminHandlers,
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description:
          'Soft-deletes a bundle (isDeleted=true, deletedAt=now). Document is preserved for CoinOrder references. 400 if already deleted.',
        tags: ['Coin Bundles'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
        response: CoinBundleResponses.coinBundleDeleted,
      },
    },
    coinBundleController.softDelete
  );
}
