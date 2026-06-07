import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { ApiError } from '@utils/apiResponse';
import { createSlug } from '@utils/helpter';
import { CoinBundleRepository, IAdminListFilter } from '../repositories/coinBundle.repository';
import { ICoinBundle } from '../types/coinBundle.types';
import {
  TCoinBundleCreateSchema,
  TCoinBundleAdminListQuerySchema,
  TCoinBundleUpdateSchema,
  TCoinBundleDisplayOrderSchema,
} from '@schema/request/coinBundle.schema';
import { CoinBundleCacheService } from '@infrastructure/cache/coinBundle-cache.service';
import { env } from '@/config/env';

@singleton()
export class CoinBundleService {
  constructor(
    @inject(TOKENS.CoinBundleRepository)
    private readonly repo: CoinBundleRepository,
    @inject(TOKENS.CoinBundleCacheService)
    private readonly cache: CoinBundleCacheService
  ) {}

  async create(input: TCoinBundleCreateSchema, createdBy: string): Promise<ICoinBundle> {
    const { name, slug: slugInput, baseCoins, bonusCoins = 0, ...rest } = input;

    const slug = slugInput ?? createSlug(name, { addSuffix: false });

    const slugTaken = await this.repo.slugExists(slug);
    if (slugTaken) {
      throw ApiError.conflict('CONFLICT', `Slug "${slug}" already exists`);
    }

    const totalCoins = baseCoins + bonusCoins;

    const payload: Partial<ICoinBundle> = {
      name,
      slug,
      baseCoins,
      bonusCoins,
      totalCoins,
      createdBy,
      ...rest,
      restrictions: {
        type: rest.restrictions?.type ?? 'unlimited',
        firstPurchaseOnly: rest.restrictions?.firstPurchaseOnly ?? false,
        ...(rest.restrictions?.dailyLimit !== undefined && {
          dailyLimit: rest.restrictions.dailyLimit,
        }),
        ...(rest.restrictions?.monthlyLimit !== undefined && {
          monthlyLimit: rest.restrictions.monthlyLimit,
        }),
        ...(rest.restrictions?.lifetimeLimit !== undefined && {
          lifetimeLimit: rest.restrictions.lifetimeLimit,
        }),
        ...(rest.restrictions?.perUserLimit !== undefined && {
          perUserLimit: rest.restrictions.perUserLimit,
        }),
      },
    };

    return this.repo.create({ data: payload });
  }

  async listForAdmin(query: TCoinBundleAdminListQuerySchema): Promise<ICoinBundle[]> {
    const filter: IAdminListFilter = {
      isDeleted: query.isDeleted,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      ...(query.search !== undefined && { search: query.search }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.bundleType !== undefined && { bundleType: query.bundleType }),
    };

    return this.repo.findForAdmin(filter);
  }

  async update(
    slug: string,
    input: TCoinBundleUpdateSchema,
    updatedBy: string
  ): Promise<ICoinBundle> {
    const existing = await this.repo.findActiveBySlug(slug);
    if (!existing) {
      throw ApiError.notFound('NOT_FOUND', `Coin bundle "${slug}" not found`);
    }

    // Recalculate totalCoins if baseCoins or bonusCoins are in the body
    const { baseCoins, bonusCoins, ...rest } = input;

    const coinUpdate: Partial<ICoinBundle> = {};
    if (baseCoins !== undefined || bonusCoins !== undefined) {
      const newBase = baseCoins ?? existing.baseCoins;
      const newBonus = bonusCoins ?? existing.bonusCoins;
      coinUpdate.baseCoins = newBase;
      coinUpdate.bonusCoins = newBonus;
      coinUpdate.totalCoins = newBase + newBonus;
    }

    const update: Partial<ICoinBundle> = {
      ...rest,
      ...coinUpdate,
      updatedBy,
    };

    const updated = await this.repo.updateBySlug(slug, update);
    if (!updated) {
      throw ApiError.notFound('NOT_FOUND', `Coin bundle "${slug}" not found`);
    }

    await this.cache.invalidate(slug);
    return updated;
  }

  async toggleActive(
    slug: string,
    updatedBy: string
  ): Promise<Pick<ICoinBundle, 'slug' | 'isActive' | 'updatedAt'>> {
    const existing = await this.repo.findActiveBySlug(slug);
    if (!existing) {
      throw ApiError.notFound('NOT_FOUND', `Coin bundle "${slug}" not found`);
    }

    const updated = await this.repo.updateBySlug(slug, {
      isActive: !existing.isActive,
      updatedBy,
    });

    if (!updated) {
      throw ApiError.notFound('NOT_FOUND', `Coin bundle "${slug}" not found`);
    }

    await this.cache.invalidate(slug);
    return { slug: updated.slug, isActive: updated.isActive, updatedAt: updated.updatedAt };
  }

  async updateDisplayOrder(
    slug: string,
    input: TCoinBundleDisplayOrderSchema,
    updatedBy: string
  ): Promise<Pick<ICoinBundle, 'slug' | 'displayOrder' | 'updatedAt'>> {
    const existing = await this.repo.findActiveBySlug(slug);
    if (!existing) {
      throw ApiError.notFound('NOT_FOUND', `Coin bundle "${slug}" not found`);
    }

    const updated = await this.repo.updateBySlug(slug, {
      displayOrder: input.displayOrder,
      updatedBy,
    });

    if (!updated) {
      throw ApiError.notFound('NOT_FOUND', `Coin bundle "${slug}" not found`);
    }

    // Only list caches need invalidation — individual detail cache is still valid
    await this.cache.invalidateLists();

    return {
      slug: updated.slug,
      displayOrder: updated.displayOrder,
      updatedAt: updated.updatedAt,
    };
  }

  async softDelete(
    slug: string,
    deletedBy: string
  ): Promise<Pick<ICoinBundle, 'slug' | 'isDeleted' | 'deletedAt' | 'deletedBy'>> {
    // Use findAnyBySlug to distinguish "not found" from "already deleted"
    const existing = await this.repo.findAnyBySlug(slug);
    if (!existing) {
      throw ApiError.notFound('NOT_FOUND', `Coin bundle "${slug}" not found`);
    }
    if (existing.isDeleted) {
      throw ApiError.badRequest('INVALID_INPUT', `Coin bundle "${slug}" is already deleted`);
    }

    const deleted = await this.repo.markDeleted(slug, deletedBy);
    if (!deleted) {
      throw ApiError.notFound('NOT_FOUND', `Coin bundle "${slug}" not found`);
    }

    await this.cache.invalidate(slug);

    return {
      slug: deleted.slug,
      isDeleted: deleted.isDeleted,
      deletedAt: deleted.deletedAt,
      deletedBy: deleted.deletedBy,
    };
  }

  async getImageUploadParams() {
    const { getBundleUploadSignature } = await import('@/utils/cloudinary.js');
    const signatureURL = getBundleUploadSignature();

    return {
      uploadURL: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload${signatureURL}`,
    };
  }

  async updateThumbnail(
    slug: string,
    thumbnail: { url: string; publicId: string },
    updatedBy: string
  ): Promise<Pick<ICoinBundle, 'slug' | 'thumbnail' | 'updatedAt'>> {
    const existing = await this.repo.findActiveBySlug(slug);
    if (!existing) {
      throw ApiError.notFound('NOT_FOUND', `Coin bundle "${slug}" not found`);
    }

    const updated = await this.repo.updateBySlug(slug, {
      thumbnail,
      updatedBy,
    });

    if (!updated) {
      throw ApiError.notFound('NOT_FOUND', `Coin bundle "${slug}" not found`);
    }

    await this.cache.invalidate(slug);

    return {
      slug: updated.slug,
      thumbnail: updated.thumbnail,
      updatedAt: updated.updatedAt,
    };
  }
}
