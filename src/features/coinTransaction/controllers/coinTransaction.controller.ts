import { HTTP_STATUS } from '@/constants/httpStatus';
import { TOKENS } from '@/container/tokens';
import {
  TGetAllCoinTransactionsQuerySchema,
  TGetMyCoinPurchasesQuerySchema,
  TGetUserTransactionsQuerySchema,
} from '@/schema/request/coinTransaction.schema';
import { ApiResponse } from '@/utils/apiResponse';
import { BaseModule } from '@/utils/baseClass';
import { catchAsync } from '@/utils/catchAsync';
import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { CoinTransactionService } from '../service/CoinTransaction.service';
import { TClerkUserIdParamsSchema } from '@/schema/request/commonRequest.schema';

@singleton()
export class CoinTransactionController extends BaseModule {
  constructor(
    @inject(TOKENS.CoinTransactionService)
    private readonly coinTxService: CoinTransactionService
  ) {
    super();
  }

  getMyPurchases = catchAsync(
    async (
      request: FastifyRequest<{ Querystring: TGetMyCoinPurchasesQuerySchema }>,
      reply: FastifyReply
    ) => {
      const userId = request.user.clerkId;
      const query = request.query;

      const result = await this.coinTxService.getMyPurchases(userId, query);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.fetched(result, 'My coin purchases fetched successfully'));
    }
  );

  getAllTransactions = catchAsync(
    async (
      request: FastifyRequest<{ Querystring: TGetAllCoinTransactionsQuerySchema }>,
      reply: FastifyReply
    ) => {
      const query = request.query;

      const result = await this.coinTxService.getAllTransactions(query);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.fetched(result, 'Coin transactions list fetched successfully'));
    }
  );

  getUserTransaction = catchAsync(
    async (
      request: FastifyRequest<{
        Params: TClerkUserIdParamsSchema;
        Querystring: TGetUserTransactionsQuerySchema;
      }>,
      reply: FastifyReply
    ) => {
      const { userId } = request.params;

      const query = request.query;

      const result = await this.coinTxService.getUserTransactions(userId, query);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(
          ApiResponse.fetched(
            result,
            'User transactions list and financial summary fetched successfully'
          )
        );
    }
  );
}
