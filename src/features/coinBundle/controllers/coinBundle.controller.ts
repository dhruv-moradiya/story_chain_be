import { HTTP_STATUS } from '@constants/httpStatus';
import { TOKENS } from '@container/tokens';
import { TCoinBundleCreateSchema } from '@schema/request/coinBundle.schema';
import { ApiResponse } from '@utils/apiResponse';
import { BaseModule } from '@utils/baseClass';
import { catchAsync } from '@utils/catchAsync';
import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { CoinBundleService } from '../services/coinBundle.service';

@singleton()
export class CoinBundleController extends BaseModule {
  constructor(
    @inject(TOKENS.CoinBundleService)
    private readonly coinBundleService: CoinBundleService
  ) {
    super();
  }

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
}
