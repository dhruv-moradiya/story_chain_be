import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { ApiError } from '@utils/apiResponse';
import { createSlug } from '@utils/helpter';
import { CoinBundleRepository } from '../repositories/coinBundle.repository';
import { ICoinBundle } from '../types/coinBundle.types';
import { TCoinBundleCreateSchema } from '@schema/request/coinBundle.schema';

@singleton()
export class CoinBundleService {
  constructor(
    @inject(TOKENS.CoinBundleRepository)
    private readonly repo: CoinBundleRepository
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
      // Ensure defaults for nested restrictions
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
}
