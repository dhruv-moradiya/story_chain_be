import { BaseRepository } from '@/utils/baseClass.js';
import { singleton } from 'tsyringe';
import { XpTransaction } from '@models/xpTransaction.model.js';
import {
  IXpTransaction,
  IXpTransactionDoc,
  ICreateXpTransactionDTO,
} from '../types/xpTransaction.types.js';
import { IOperationOptions } from '@/types/index.js';
import { FilterQuery } from 'mongoose';

@singleton()
export class XpTransactionRepository extends BaseRepository<IXpTransaction, IXpTransactionDoc> {
  constructor() {
    super(XpTransaction);
  }

  /**
   * Creates an XP transaction entry.
   */
  async createTransaction(
    data: ICreateXpTransactionDTO,
    options: IOperationOptions = {}
  ): Promise<IXpTransaction> {
    return this.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        reason: data.reason,
        sourceId: data.sourceId,
        sourceType: data.sourceType,
        status: data.status ?? 'credited',
        creditedAt: data.creditedAt ?? new Date(),
      },
      options: { session: options.session },
    });
  }

  /**
   * Sums total XP earned by a user matching optional filter criteria.
   */
  async sumUserXP(userId: string, filter: FilterQuery<IXpTransactionDoc> = {}): Promise<number> {
    const matchFilter: FilterQuery<IXpTransactionDoc> = {
      userId,
      ...filter,
    };

    const result = await this.model
      .aggregate<{
        totalXP: number;
      }>([{ $match: matchFilter }, { $group: { _id: '$userId', totalXP: { $sum: '$amount' } } }])
      .exec();

    return result.length > 0 ? result[0].totalXP : 0;
  }

  /**
   * Sums XP earned by a user for a specific reason within a given date window.
   */
  async sumXPByReason(
    userId: string,
    reason: string,
    startDate: Date,
    endDate?: Date,
    status: string = 'credited'
  ): Promise<number> {
    const dateQuery: Record<string, Date> = { $gte: startDate };
    if (endDate) {
      dateQuery.$lte = endDate;
    }

    const filter: FilterQuery<IXpTransactionDoc> = {
      userId,
      reason,
      status,
      createdAt: dateQuery,
    };

    return this.sumUserXP(userId, filter);
  }
}
