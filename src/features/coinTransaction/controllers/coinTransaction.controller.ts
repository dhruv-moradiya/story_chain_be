import { BaseModule } from '@/utils/baseClass';
import { catchAsync } from '@/utils/catchAsync';
import { FastifyReply, FastifyRequest } from 'fastify';
import { singleton } from 'tsyringe';

@singleton()
export class CoinTransactionController extends BaseModule {
  constructor() {
    super();
  }

  getMyPurchases = catchAsync(async () => {});

  getAllTransactions = catchAsync(async (_request: FastifyRequest, _reply: FastifyReply) => {});
}
