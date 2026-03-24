import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@/container';
import { CacheService } from './cache.service';
import { CACHE_TTL, CacheKeyBuilder } from '.';
import { IStoryAggregateCache, IStoryCollaboratorCache } from '@/types/cached-data.types';
import { IStorySettings, IStoryStats } from '@/features/story/types/story.types';
import { ILatestChaptersResponse } from '@/types/response/chapter.response.types';

@singleton()
class StoryCacheService extends BaseModule {
  constructor(
    @inject(TOKENS.CacheService)
    private readonly cacheService: CacheService
  ) {
    super();
  }

  private async setJson<T>(key: string, data: T, ttl: number) {
    await this.cacheService.set(key, JSON.stringify(data), { ttl });
  }

  private async getJson<T>(key: string): Promise<T | null> {
    const data = await this.cacheService.get<string>(key);
    return data ? JSON.parse(data) : null;
  }

  async setStoryAggregate(slug: string, data: IStoryAggregateCache) {
    const key = CacheKeyBuilder.storyAggregate(slug);
    await this.setJson(key, data, CACHE_TTL.STORY_AGGREGATE);
  }

  async getStoryAggregate(slug: string): Promise<IStoryAggregateCache | null> {
    const key = CacheKeyBuilder.storyAggregate(slug);
    return this.getJson(key);
  }

  async invalidateStory(slug: string) {
    const key = CacheKeyBuilder.storyAggregate(slug);
    await this.cacheService.del(key);
  }

  async setStoryStats(slug: string, data: IStoryStats) {
    const key = CacheKeyBuilder.storyStats(slug);

    return await this.cacheService.client
      .multi()
      .hset(key, data)
      .expire(key, CACHE_TTL.STORY_STATS)
      .exec();
  }

  async getStoryStats(slug: string) {
    const key = CacheKeyBuilder.storyStats(slug);
    return this.cacheService.client.hgetall(key);
  }

  async invalidateStoryStats(slug: string) {
    const key = CacheKeyBuilder.storyStats(slug);
    await this.cacheService.client.del(key);
  }

  async setStorySettings(slug: string, data: IStorySettings) {
    const key = CacheKeyBuilder.storySettings(slug);
    return await this.cacheService.client
      .multi()
      .hset(key, data)
      .expire(key, CACHE_TTL.STORY_SETTINGS)
      .exec();
  }

  async getStorySettings(slug: string) {
    const key = CacheKeyBuilder.storySettings(slug);
    return this.cacheService.client.hgetall(key);
  }

  async invalidateStorySettings(slug: string) {
    const key = CacheKeyBuilder.storySettings(slug);
    await this.cacheService.client.del(key);
  }

  /**
   * Set story collaborator detail: userId, role, status
   */
  async setStoryCollaborator(slug: string, data: IStoryCollaboratorCache[]) {
    const pipeline = this.cacheService.client.multi();

    for (const collab of data) {
      const key = CacheKeyBuilder.storyCollaborator(slug, collab.userId);

      pipeline.hset(key, collab);
      pipeline.expire(key, CACHE_TTL.STORY_COLLABORATOR);
    }

    await pipeline.exec();
  }

  async getStoryCollaborator(slug: string, userId: string) {
    const key = CacheKeyBuilder.storyCollaborator(slug, userId);
    return this.cacheService.client.hgetall(key);
  }

  async invalidateStoryCollaborator(slug: string, userId: string) {
    const key = CacheKeyBuilder.storyCollaborator(slug, userId);
    await this.cacheService.client.del(key);
  }

  /**
   * Set story collaborator details
   */
  async setStoryCollaboratorList(slug: string, data: IStoryCollaboratorCache[]) {
    const key = CacheKeyBuilder.storyCollaboratorList(slug);
    await this.setJson(key, data, CACHE_TTL.STORY_COLLABORATOR_LIST);
  }

  async getStoryCollaboratorList(slug: string) {
    const key = CacheKeyBuilder.storyCollaboratorList(slug);
    return this.getJson(key);
  }

  async invalidateStoryCollaboratorList(slug: string) {
    const key = CacheKeyBuilder.storyCollaboratorList(slug);
    await this.cacheService.del(key);
  }

  async setStoryLatestChapters(slug: string, data: ILatestChaptersResponse[]) {
    const key = CacheKeyBuilder.build({
      entity: 'story',
      operation: 'latest-chapters',
      identifiers: { slug },
    });
    await this.setJson(key, data, CACHE_TTL.STORY_LATEST_CHAPTERS);
  }

  async getStoryLatestChapters(slug: string) {
    const key = CacheKeyBuilder.build({
      entity: 'story',
      operation: 'latest-chapters',
      identifiers: { slug },
    });
    return this.getJson(key);
  }

  async invalidateStoryLatestChapters(slug: string) {
    const key = CacheKeyBuilder.build({
      entity: 'story',
      operation: 'latest-chapters',
      identifiers: { slug },
    });
    await this.cacheService.del(key);
  }
}

export { StoryCacheService };
