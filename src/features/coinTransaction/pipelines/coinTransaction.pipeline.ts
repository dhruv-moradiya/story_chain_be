import { USER_WITH_EMAIL_PROJECTION, attachUserStages } from '@/shared/pipelines';
import { BasePipelineBuilder } from '@/shared/pipelines/base.pipeline.builder';
import { TCoinTxDirection, TCoinTxType } from '../types/coinTransaction.types';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class CoinTransactionPipelineBuilder extends BasePipelineBuilder<CoinTransactionPipelineBuilder> {
  matchUserId(userId: string) {
    this.pipeline.push({ $match: { userId } });
    return this;
  }

  matchType(type: TCoinTxType) {
    this.pipeline.push({ $match: { type } });
    return this;
  }

  matchDirection(direction: TCoinTxDirection) {
    this.pipeline.push({ $match: { direction } });
    return this;
  }

  matchSearch(search?: string) {
    if (!search || search.trim() === '') return this;
    const escapedSearch = escapeRegex(search.trim());

    this.pipeline.push({
      $match: {
        $or: [
          { userId: { $regex: escapedSearch, $options: 'i' } },
          { note: { $regex: escapedSearch, $options: 'i' } },
          { chapterSlug: { $regex: escapedSearch, $options: 'i' } },
          { storySlug: { $regex: escapedSearch, $options: 'i' } },
          { 'user.username': { $regex: escapedSearch, $options: 'i' } },
          { 'user.email': { $regex: escapedSearch, $options: 'i' } },
        ],
      },
    });
    return this;
  }

  attachUser(project: Record<string, unknown> = USER_WITH_EMAIL_PROJECTION) {
    this.pipeline.push(
      ...attachUserStages({
        localField: 'userId',
        as: 'user',
        project,
        preserveNullAndEmpty: true,
      })
    );
    return this;
  }

  attachOrder() {
    this.pipeline.push(
      {
        $lookup: {
          from: 'coinorders',
          let: { orderId: '$coinOrderId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', '$$orderId'],
                },
              },
            },
            {
              $project: {
                _id: 1,
                bundleslug: 1,
                totalCoins: 1,
                baseCoins: 1,
                bonusCoins: 1,
                currency: 1,
                finalAmount: 1,
                razorpayOrderId: 1,
                status: 1,
              },
            },
          ],
          as: 'order',
        },
      },
      {
        $set: {
          order: {
            $ifNull: [{ $arrayElemAt: ['$order', 0] }, null],
          },
        },
      }
    );
    return this;
  }

  // ==================== PRESETS ====================
  getMyPurchasesPreset(options: { page: number; limit: number }) {
    return this.matchType('purchase')
      .attachOrder()
      .sortByCreatedAt(-1)
      .paginate(options.page, options.limit);
  }

  getAdminTransactionListPreset(options: {
    page: number;
    limit: number;
    type?: TCoinTxType;
    direction?: TCoinTxDirection;
    userId?: string;
    search?: string;
  }) {
    return this.when(!!options.userId, (b) => b.matchUserId(options.userId!))
      .when(!!options.type, (b) => b.matchType(options.type!))
      .when(!!options.direction, (b) => b.matchDirection(options.direction!))
      .attachUser()
      .attachOrder()
      .when(!!options.search, (b) => b.matchSearch(options.search))
      .sortByCreatedAt(-1)
      .paginate(options.page, options.limit);
  }

  getUserTransactionsPreset(options: {
    userId: string;
    type?: TCoinTxType;
    direction?: TCoinTxDirection;
    search?: string;
  }) {
    return this.matchUserId(options.userId)
      .when(!!options.type, (b) => b.matchType(options.type!))
      .when(!!options.direction, (b) => b.matchDirection(options.direction!))
      .attachUser()
      .attachOrder()
      .when(!!options.search, (b) => b.matchSearch(options.search))
      .sortByCreatedAt(-1);
  }
}

export class FinancialSummaryPipelineBuilder extends BasePipelineBuilder<FinancialSummaryPipelineBuilder> {
  matchUserId(userId: string) {
    this.pipeline.push({ $match: { userId } });
    return this;
  }

  matchPaidOrders() {
    this.pipeline.push({ $match: { status: 'paid' } });
    return this;
  }

  groupOrderSummary() {
    this.pipeline.push({
      $group: {
        _id: null,
        totalCoinsPurchased: { $sum: '$totalCoins' },
        totalAmountSpent: { $sum: '$finalAmount' },
      },
    });
    return this;
  }

  getPaidOrdersSummaryPreset(userId: string) {
    return this.matchUserId(userId).matchPaidOrders().groupOrderSummary();
  }
}
