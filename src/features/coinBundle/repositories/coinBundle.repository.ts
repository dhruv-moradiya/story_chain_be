import { singleton } from 'tsyringe';
import { FilterQuery } from 'mongoose';
import { CoinBundle } from '@models/coinBundle.model';
import { ICoinBundle, ICoinBundleDoc } from '@features/coinBundle/types/coinBundle.types';
import { BaseRepository } from '@utils/baseClass';
import { TBundleType } from '@features/coinBundle/types/coinBundle.types';

export interface IAdminListFilter {
  search?: string;
  isActive?: boolean;
  isDeleted: boolean;
  bundleType?: TBundleType;
  sortBy: 'displayOrder' | 'createdAt' | 'name';
  sortOrder: 'asc' | 'desc';
}

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

  async findForAdmin(filter: IAdminListFilter): Promise<ICoinBundle[]> {
    const query: FilterQuery<ICoinBundleDoc> = {
      isDeleted: filter.isDeleted,
    };

    if (filter.search) {
      query.name = { $regex: filter.search, $options: 'i' };
    }

    if (filter.isActive !== undefined) {
      query.isActive = filter.isActive;
    }

    if (filter.bundleType) {
      query.bundleType = filter.bundleType;
    }

    const sortDirection = filter.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [filter.sortBy]: sortDirection };

    return CoinBundle.find(query).sort(sort).lean<ICoinBundle[]>().exec();
  }
}
