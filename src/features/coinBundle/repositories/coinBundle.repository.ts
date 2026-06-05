import { singleton } from 'tsyringe';
import { CoinBundle } from '@models/coinBundle.model';
import { ICoinBundle, ICoinBundleDoc } from '@features/coinBundle/types/coinBundle.types';
import { BaseRepository } from '@utils/baseClass';

@singleton()
export class CoinBundleRepository extends BaseRepository<ICoinBundle, ICoinBundleDoc> {
  constructor() {
    super(CoinBundle);
  }

  async findBySlug(slug: string): Promise<ICoinBundle | null> {
    return CoinBundle.findOne({ slug }).lean<ICoinBundle>().exec();
  }

  async slugExists(slug: string): Promise<boolean> {
    const exists = await CoinBundle.exists({ slug });
    return !!exists;
  }
}
