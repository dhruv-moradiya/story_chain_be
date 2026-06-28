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

  /** Atomically marks an order as paid and stamps Razorpay payment fields. */
  async markAsPaid(
    coinOrderId: ID,
    payload: { razorpayPaymentId: string; razorpaySignature: string },
    options: IOperationOptions = {}
  ): Promise<ICoinOrder | null> {
    return this.model
      .findOneAndUpdate(
        { _id: coinOrderId },
        {
          $set: {
            status: CoinOrderStatus.PAID,
            razorpayPaymentId: payload.razorpayPaymentId,
            razorpaySignature: payload.razorpaySignature,
            paidAt: new Date(),
          },
        },
        { new: true, session: options.session ?? null }
      )
      .lean<ICoinOrder>()
      .exec();
  }
}
