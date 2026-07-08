import { BaseRepository } from '@/utils/baseClass';
import { singleton } from 'tsyringe';
import { CoinOrder } from '@models/coinOrder.model';
import { ICoinOrder, ICoinOrderDoc } from '../types/coinOrder.types';
import { ID, IOperationOptions } from '@/types';
import { CoinOrderStatus } from '../types/coinOrder-enum';

@singleton()
export class CoinOrderRepository extends BaseRepository<ICoinOrder, ICoinOrderDoc> {
  constructor() {
    super(CoinOrder);
  }

  /** Atomically marks an order as paid ONLY if it is still pending (race-condition guard). */
  async markAsPaid(
    coinOrderId: ID,
    payload: { razorpayPaymentId: string; razorpaySignature?: string },
    options: IOperationOptions = {}
  ): Promise<ICoinOrder | null> {
    return this.model
      .findOneAndUpdate(
        // ← CRITICAL: status filter acts as an atomic mutex.
        // If two requests (verify-payment + webhook) race here, only ONE will
        // match 'pending' and get a non-null result. The other gets null and skips.
        { _id: coinOrderId, status: CoinOrderStatus.PENDING },
        {
          $set: {
            status: CoinOrderStatus.PAID,
            razorpayPaymentId: payload.razorpayPaymentId,
            ...(payload.razorpaySignature && { razorpaySignature: payload.razorpaySignature }),
            paidAt: new Date(),
          },
        },
        { new: true, session: options.session ?? null }
      )
      .lean<ICoinOrder>()
      .exec();
  }

  /** Marks an order as failed and records the reason from Razorpay. */
  async markAsFailed(
    razorpayOrderId: string,
    failureReason: string,
    options: IOperationOptions = {}
  ): Promise<void> {
    await this.model
      .findOneAndUpdate(
        { razorpayOrderId, status: CoinOrderStatus.PENDING },
        {
          $set: {
            status: CoinOrderStatus.FAILED,
            failureReason,
            failedAt: new Date(),
          },
        },
        { session: options.session ?? null }
      )
      .exec();
  }

  /** Looks up a CoinOrder by the Razorpay order ID (used in webhook handler). */
  async findByRazorpayOrderId(razorpayOrderId: string): Promise<ICoinOrder | null> {
    return this.model.findOne({ razorpayOrderId }).lean<ICoinOrder>().exec();
  }
}
