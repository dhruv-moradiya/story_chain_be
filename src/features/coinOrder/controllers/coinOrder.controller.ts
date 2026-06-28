import { TOKENS } from '@/container';
import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { CoinOrderService } from '../services/coinOrder.service';
import { catchAsync } from '@/utils/catchAsync';
import { FastifyReply, FastifyRequest } from 'fastify';
import { TCoinOrderCreateSchema, TCoinOrderVerifySchema } from '@/schema/request/coinOrder.schema';
import { HTTP_STATUS } from '@/constants/httpStatus';
import { ApiResponse } from '@/utils/apiResponse';

@singleton()
export class CoinOrderController extends BaseModule {
  constructor(
    @inject(TOKENS.CoinOrderService) private readonly coinOrderService: CoinOrderService
  ) {
    super();
  }

  createOrder = catchAsync(
    async (req: FastifyRequest<{ Body: TCoinOrderCreateSchema }>, reply: FastifyReply) => {
      const userId = req.user.clerkId;
      const body = req.body;

      const order = await this.coinOrderService.createOrder({ ...body, userId });

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(ApiResponse.created(order, 'Order created successfully'));
    }
  );

  verifyPayment = catchAsync(
    async (req: FastifyRequest<{ Body: TCoinOrderVerifySchema }>, reply: FastifyReply) => {
      const userId = req.user.clerkId;
      const body = req.body;

      const order = await this.coinOrderService.verifyPayment({ ...body, userId });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.ok(order, 'Payment verified successfully'));
    }
  );
}
