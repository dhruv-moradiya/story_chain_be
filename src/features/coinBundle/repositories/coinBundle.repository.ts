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

  async checkBundleActive(slug: string): Promise<boolean> {
    const bundle = await CoinBundle.exists({ slug, isActive: true, isDeleted: false });
    return !!bundle;
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

  /**
   * Finds a non-deleted bundle by slug. Used before any mutation to
   * confirm existence, then returns the doc for business-logic checks.
   */
  async findActiveBySlug(slug: string): Promise<ICoinBundle | null> {
    return CoinBundle.findOne({ slug, isDeleted: false }).lean<ICoinBundle>().exec();
  }

  /**
   * Finds a bundle by slug regardless of isDeleted state.
   * Used for the soft-delete endpoint which needs to check isDeleted = false first.
   */
  async findAnyBySlug(slug: string): Promise<ICoinBundle | null> {
    return CoinBundle.findOne({ slug }).lean<ICoinBundle>().exec();
  }

  /**
   * Applies a partial update to a non-deleted bundle and returns the new doc.
   */
  async updateBySlug(slug: string, update: Partial<ICoinBundle>): Promise<ICoinBundle | null> {
    return CoinBundle.findOneAndUpdate(
      { slug, isDeleted: false },
      { $set: update },
      { new: true, runValidators: true }
    )
      .lean<ICoinBundle>()
      .exec();
  }

  /**
   * Soft-deletes a bundle that is not already deleted.
   * Returns the updated doc, or null if not found / already deleted.
   */
  async markDeleted(slug: string, deletedBy: string): Promise<ICoinBundle | null> {
    return CoinBundle.findOneAndUpdate(
      { slug, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
      { new: true }
    )
      .lean<ICoinBundle>()
      .exec();
  }
}
