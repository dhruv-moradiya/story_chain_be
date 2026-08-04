import { ICoinTransaction } from '@/features/coinTransaction/types/coinTransaction.types';
import {
  ICoinOrderSummaryResponse,
  ICoinTransactionResponse,
} from '@/types/response/coinTransaction.response.types';
import { IPublicUserResponseWithEmail } from '@/types/response/user.response.types';

export class CoinTransactionTransformer {
  static toResponseItem(
    tx: ICoinTransaction & {
      order?: ICoinOrderSummaryResponse | null;
      user?: IPublicUserResponseWithEmail | null;
    }
  ): ICoinTransactionResponse {
    return {
      _id: tx._id ? String(tx._id) : '',
      userId: tx.userId,
      type: tx.type,
      amount: tx.amount,
      direction: tx.direction,
      balanceBefore: tx.balanceBefore,
      balanceAfter: tx.balanceAfter,
      coinOrderId: tx.coinOrderId ? String(tx.coinOrderId) : undefined,
      withdrawalRequestId: tx.withdrawalRequestId ? String(tx.withdrawalRequestId) : undefined,
      chapterSlug: tx.chapterSlug,
      storySlug: tx.storySlug,
      referredUserId: tx.referredUserId,
      couponId: tx.couponId ? String(tx.couponId) : undefined,
      note: tx.note,
      metadata: tx.metadata,
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt,
      order: tx.order
        ? {
            _id: String(tx.order._id),
            bundleslug: tx.order.bundleslug,
            totalCoins: tx.order.totalCoins,
            baseCoins: tx.order.baseCoins,
            bonusCoins: tx.order.bonusCoins,
            currency: tx.order.currency,
            finalAmount: tx.order.finalAmount,
            razorpayOrderId: tx.order.razorpayOrderId,
            status: tx.order.status,
          }
        : null,
      user: tx.user
        ? {
            clerkId: tx.user.clerkId,
            username: tx.user.username,
            email: tx.user.email,
            avatarUrl: tx.user.avatarUrl ?? '',
          }
        : null,
    };
  }
}
