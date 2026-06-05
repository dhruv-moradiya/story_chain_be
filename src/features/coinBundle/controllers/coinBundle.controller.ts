import { HTTP_STATUS } from '@constants/httpStatus';
import { TOKENS } from '@container/tokens';
import {
  TCoinBundleCreateSchema,
  TCoinBundleAdminListQuerySchema,
  TCoinBundleUpdateSchema,
  TCoinBundleDisplayOrderSchema,
  CoinBundleAdminListQuerySchema,
  CoinBundleUpdateSchema,
  CoinBundleDisplayOrderSchema,
} from '@schema/request/coinBundle.schema';
import { ApiResponse } from '@utils/apiResponse';
import { BaseModule } from '@utils/baseClass';
import { catchAsync } from '@utils/catchAsync';
import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { CoinBundleService } from '../services/coinBundle.service';

type SlugParam = { Params: { slug: string } };

@singleton()
export class CoinBundleController extends BaseModule {
  constructor(
    @inject(TOKENS.CoinBundleService)
    private readonly coinBundleService: CoinBundleService
  ) {
    super();
  }

  // ─── POST /coin-bundles ───────────────────────────────────────────────────

  create = catchAsync(
    async (request: FastifyRequest<{ Body: TCoinBundleCreateSchema }>, reply: FastifyReply) => {
      const { body, user } = request;
      const createdBy = user.clerkId;

      const bundle = await this.coinBundleService.create(body, createdBy);

      this.logInfo(`CoinBundle created: "${bundle.slug}" by ${createdBy}`);

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(ApiResponse.created(bundle, 'Coin bundle created successfully'));
    }
  );

  // ─── GET /admin/coin-bundles ──────────────────────────────────────────────

  listForAdmin = catchAsync(
    async (
      request: FastifyRequest<{ Querystring: TCoinBundleAdminListQuerySchema }>,
      reply: FastifyReply
    ) => {
      const query = CoinBundleAdminListQuerySchema.parse(request.query);
      const bundles = await this.coinBundleService.listForAdmin(query);

      this.logInfo(`CoinBundle admin list fetched: ${bundles.length} results`);

      return reply
        .code(HTTP_STATUS.OK.code)
        .header('Cache-Control', 'no-store')
        .send(ApiResponse.fetched(bundles, 'Coin bundles fetched successfully'));
    }
  );

  // ─── PUT /coin-bundles/:slug ──────────────────────────────────────────────

  update = catchAsync(
    async (
      request: FastifyRequest<SlugParam & { Body: TCoinBundleUpdateSchema }>,
      reply: FastifyReply
    ) => {
      const { slug } = request.params;
      const body = CoinBundleUpdateSchema.parse(request.body);
      const updatedBy = request.user.clerkId;

      const bundle = await this.coinBundleService.update(slug, body, updatedBy);

      this.logInfo(`CoinBundle updated: "${slug}" by ${updatedBy}`);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.updated(bundle, 'Coin bundle updated successfully'));
    }
  );

  // ─── PATCH /coin-bundles/:slug/toggle-active ─────────────────────────────

  toggleActive = catchAsync(async (request: FastifyRequest<SlugParam>, reply: FastifyReply) => {
    const { slug } = request.params;
    const updatedBy = request.user.clerkId;

    const result = await this.coinBundleService.toggleActive(slug, updatedBy);

    this.logInfo(`CoinBundle "${slug}" isActive toggled to ${result.isActive} by ${updatedBy}`);

    return reply
      .code(HTTP_STATUS.OK.code)
      .send(ApiResponse.updated(result, 'Coin bundle active state toggled'));
  });

  // ─── PATCH /coin-bundles/:slug/display-order ─────────────────────────────

  updateDisplayOrder = catchAsync(
    async (
      request: FastifyRequest<SlugParam & { Body: TCoinBundleDisplayOrderSchema }>,
      reply: FastifyReply
    ) => {
      const { slug } = request.params;
      const body = CoinBundleDisplayOrderSchema.parse(request.body);
      const updatedBy = request.user.clerkId;

      const result = await this.coinBundleService.updateDisplayOrder(slug, body, updatedBy);

      this.logInfo(`CoinBundle "${slug}" displayOrder set to ${body.displayOrder} by ${updatedBy}`);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.updated(result, 'Display order updated'));
    }
  );

  // ─── DELETE /coin-bundles/:slug ───────────────────────────────────────────

  softDelete = catchAsync(async (request: FastifyRequest<SlugParam>, reply: FastifyReply) => {
    const { slug } = request.params;
    const deletedBy = request.user.clerkId;

    const result = await this.coinBundleService.softDelete(slug, deletedBy);

    this.logInfo(`CoinBundle "${slug}" soft-deleted by ${deletedBy}`);

    return reply
      .code(HTTP_STATUS.OK.code)
      .send(ApiResponse.ok(result, 'Coin bundle deleted successfully'));
  });
}
