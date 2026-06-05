import { singleton } from 'tsyringe';
import { inject } from 'tsyringe';
import { TOKENS } from '@/container';
import { BaseModule } from '@/utils/baseClass';
import { CacheService } from './cache.service';
import { CacheKeyBuilder } from './cache-key.builder';

@singleton()
export class CoinBundleCacheService extends BaseModule {
  constructor(
    @inject(TOKENS.CacheService)
    private readonly cacheService: CacheService
  ) {
    super();
  }

  /**
   * Invalidates coin:bundle:{slug}, coin:bundles:active, coin:bundles:featured
   */
  async invalidate(slug: string): Promise<void> {
    const keys = CacheKeyBuilder.invalidateCoinBundle(slug);
    await this.cacheService.delMany(keys);
    this.logInfo(`CoinBundle cache invalidated for slug: ${slug}`);
  }

  /**
   * Invalidates only the list caches (active + featured), used for display-order updates.
   */
  async invalidateLists(): Promise<void> {
    const keys = [CacheKeyBuilder.coinBundlesActive(), CacheKeyBuilder.coinBundlesFeatured()];
    await this.cacheService.delMany(keys);
    this.logInfo('CoinBundle list caches invalidated');
  }
}
