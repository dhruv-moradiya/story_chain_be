import { BaseRepository } from '@/utils/baseClass';
import { singleton } from 'tsyringe';
import { CoinTransaction } from '@models/coinTransaction.model';
import { Wallet } from '@models/wallet.model';
import { CoinOrder } from '@models/coinOrder.model';
import {
  ICoinTransaction,
  ICoinTransactionDoc,
  TCoinTxDirection,
  TCoinTxType,
} from '../types/coinTransaction.types';
import { IAppendLedgerEntryDTO } from '@/dto/coinTransaction.dto';
import { IOperationOptions } from '@/types';
import { FilterQuery } from 'mongoose';
import {
  CoinTransactionPipelineBuilder,
  FinancialSummaryPipelineBuilder,
} from '../pipelines/coinTransaction.pipeline';
import {
  ICoinOrderSummaryResponse,
  IUserWalletFinancialSummary,
} from '@/types/response/coinTransaction.response.types';
import { IPublicUserResponseWithEmail } from '@/types/response/user.response.types';

export interface IPopulatedCoinTransaction extends ICoinTransaction {
  order?: ICoinOrderSummaryResponse | null;
  user?: IPublicUserResponseWithEmail | null;
}

export interface IPaginatedCoinTransactionsResult {
  transactions: IPopulatedCoinTransaction[];
  totalDocs: number;
  totalPages: number;
  page: number;
  limit: number;
}

@singleton()
export class CoinTransactionRepository extends BaseRepository<
  ICoinTransaction,
  ICoinTransactionDoc
> {
  constructor() {
    super(CoinTransaction);
  }

  /**
   * Appends an immutable ledger entry.
   * Never call update/delete on this collection — insert only.
   */
  async appendLedgerEntry(
    input: IAppendLedgerEntryDTO,
    options: IOperationOptions = {}
  ): Promise<ICoinTransaction> {
    return this.create({
      data: {
        userId: input.userId,
        type: input.type,
        direction: input.direction,
        amount: input.amount,
        coinOrderId: input.coinOrderId,
        chapterSlug: input.chapterSlug,
        storySlug: input.storySlug,
        note: input.note,
        balanceBefore: input.balanceBefore,
        balanceAfter: input.balanceAfter,
      },
      options: { session: options.session },
    });
  }

  async findUserPurchases(
    userId: string,
    options: { page: number; limit: number }
  ): Promise<IPaginatedCoinTransactionsResult> {
    const { page = 1, limit = 10 } = options;

    const filter: FilterQuery<ICoinTransactionDoc> = {
      userId,
      type: 'purchase',
    };

    const builder = new CoinTransactionPipelineBuilder()
      .matchUserId(userId)
      .getMyPurchasesPreset({ page, limit });

    const [transactions, totalDocs] = await Promise.all([
      this.model.aggregate<IPopulatedCoinTransaction>(builder.build()).exec(),
      this.count({ filter }),
    ]);

    const totalPages = Math.ceil(totalDocs / limit) || 1;

    return {
      transactions,
      totalDocs,
      totalPages,
      page,
      limit,
    };
  }

  async findAllTransactions(options: {
    page: number;
    limit: number;
    type?: TCoinTxType;
    direction?: TCoinTxDirection;
    userId?: string;
    search?: string;
  }): Promise<IPaginatedCoinTransactionsResult> {
    const { page = 1, limit = 10, type, direction, userId, search } = options;

    const filter: FilterQuery<ICoinTransactionDoc> = {};
    if (userId) filter.userId = userId;
    if (type) filter.type = type;
    if (direction) filter.direction = direction;

    const builder = new CoinTransactionPipelineBuilder().getAdminTransactionListPreset({
      page,
      limit,
      type,
      direction,
      userId,
      search,
    });

    const [transactions, totalDocs] = await Promise.all([
      this.model.aggregate<IPopulatedCoinTransaction>(builder.build()).exec(),
      this.count({ filter }),
    ]);

    const totalPages = Math.ceil(totalDocs / limit) || 1;

    return {
      transactions,
      totalDocs,
      totalPages,
      page,
      limit,
    };
  }

  async findUserTransactions(
    userId: string,
    options: {
      type?: TCoinTxType;
      direction?: TCoinTxDirection;
      search?: string;
    } = {}
  ): Promise<IPopulatedCoinTransaction[]> {
    const { type, direction, search } = options;

    const builder = new CoinTransactionPipelineBuilder().getUserTransactionsPreset({
      userId,
      type,
      direction,
      search,
    });

    return this.model.aggregate<IPopulatedCoinTransaction>(builder.build()).exec();
  }

  async getUserFinancialSummary(userId: string): Promise<IUserWalletFinancialSummary> {
    const summaryBuilder = new FinancialSummaryPipelineBuilder().getPaidOrdersSummaryPreset(userId);

    const [wallet, orderSummary] = await Promise.all([
      Wallet.findOne({ userId }).lean().exec(),
      CoinOrder.aggregate<{
        totalCoinsPurchased: number;
        totalAmountSpent: number;
      }>(summaryBuilder.build()).exec(),
    ]);

    const orderStats = orderSummary[0];

    return {
      currentCoinBalance: wallet?.balance ?? 0,
      totalCoinsPurchased: orderStats?.totalCoinsPurchased ?? 0,
      totalCoinsSpent: wallet?.totalSpent ?? 0,
      totalAmountSpent: (orderStats?.totalAmountSpent ?? 0) / 100,

      totalWithdrawn: wallet?.totalWithdrawn ?? 0,
      pendingWithdrawals: wallet?.pendingWithdrawal ?? 0,
    };
  }
}
