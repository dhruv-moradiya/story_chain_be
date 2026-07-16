import { BaseRepository } from '@/utils/baseClass';
import { IStoryEarningsPool, IStoryEarningsPoolDoc } from '../types/storyEarningsPool.type';
import { StoryEarningsPool } from '@/models/storyEarningsPool.model';
import { IOperationOptions } from '@/types';

export class StoryEarningsPoolRepository extends BaseRepository<
  IStoryEarningsPool,
  IStoryEarningsPoolDoc
> {
  constructor() {
    super(StoryEarningsPool);
  }

  async getStoryEarningsPool(slug: string) {
    return this.model.findOne({ storySlug: slug });
  }

  /**
   * Atomically deducts `amount` coins from the pool's balance and
   * increments `totalDistributed` by the same amount.
   * Returns the updated pool document, or null if not found.
   */
  async debitBalance(
    slug: string,
    amount: number,
    options: IOperationOptions = {}
  ): Promise<IStoryEarningsPool | null> {
    return this.model
      .findOneAndUpdate(
        { storySlug: slug },
        { $inc: { balance: -amount, totalDistributed: amount } },
        { new: true, session: options.session ?? null }
      )
      .lean<IStoryEarningsPool>()
      .exec();
  }
}
