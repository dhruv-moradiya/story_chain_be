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

  verifyWebHook = catchAsync(async (req: FastifyRequest, reply: FastifyReply) => {
    // fastify-raw-body stores the raw Buffer on req.rawBody
    const rawBody = (req as FastifyRequest & { rawBody: Buffer }).rawBody;
    const signature = req.headers['x-razorpay-signature'] as string;

    const result = await this.coinOrderService.verifyRazorpayWebHook({ rawBody, signature });

    // Always respond 200 — Razorpay retries on any non-2xx response
    return reply.code(HTTP_STATUS.OK.code).send(ApiResponse.ok(result, 'Webhook received'));
  });
}
