import { FastifyReply, FastifyRequest } from 'fastify';
import { singleton } from 'tsyringe';
import { catchAsync } from '@utils/catchAsync';
import { BaseModule } from '@utils/baseClass';
import { inject } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { WalletService } from '../service/wallet.service';
import { HTTP_STATUS } from '@/constants/httpStatus';
import { ApiResponse } from '@/utils/apiResponse';

@singleton()
export class WalletController extends BaseModule {
  constructor(
    @inject(TOKENS.WalletService)
    private readonly walletService: WalletService
  ) {
    super();
  }

  getUserBalance = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.clerkId;
    this.logDebug('User id: ', { userId });

    this.logDebug("LET'SEE");
    const wallet = await this.walletService.getWalletByUserId(userId);

    if (!wallet) {
      this.throwNotFoundError('Wallet not found.');
    }

    return reply
      .code(HTTP_STATUS.OK.code)
      .send(ApiResponse.fetched(wallet, `User wallet details fetched successfully.`));
  });
}
