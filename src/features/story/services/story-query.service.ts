import { inject, singleton } from 'tsyringe';

import { BaseModule } from '@/utils/baseClass';
import { buildChapterTree } from '@/utils/index';

import { TOKENS } from '@/container';
import { IOperationOptions } from '@/types';
import { IStoryOverviewResponse } from '@/types/response/story.response.types';

import { ChapterPipelineBuilder } from '@/features/chapter/pipelines/chapterPipeline.builder';
import { ChapterRepository } from '@/features/chapter/repositories/chapter.repository';

import { type IUserService } from '@/features/user/interfaces';
import { CACHE_TTL, CacheKeyBuilder } from '@/infrastructure';
import { CacheService } from '@/infrastructure/cache/cache.service';
import { StoryPipelineBuilder } from '../pipelines/storyPipeline.builder';
import { StoryRepository } from '../repositories/story.repository';
import { StoryStatus } from '../types/story-enum';
import { IStory, IStorySettingsWithImages } from '../types/story.types';
import { IStoryQueryService, IStoryTreeResult } from './interfaces/story-query.interface';

@singleton()
class StoryQueryService extends BaseModule implements IStoryQueryService {
  constructor(
    @inject(TOKENS.CacheService)
    private readonly cacheService: CacheService,
    @inject(TOKENS.StoryRepository)
    private readonly storyRepo: StoryRepository,
    @inject(TOKENS.ChapterRepository)
    private readonly chapterRepo: ChapterRepository,
    @inject(TOKENS.UserService)
    private readonly userService: IUserService
  ) {
    super();
  }

  async getAllStories(options: IOperationOptions = {}): Promise<IStory[]> {
    return this.storyRepo.findAll(options);
  }

  /**
   * Get story by slug (throws if not found)
   */
  async getBySlug(
    slug: string,
    options: { fields?: string[] } & IOperationOptions = {}
  ): Promise<IStory> {
    const story = await this.storyRepo.findBySlug(slug, options);

    if (!story) {
      this.throwNotFoundError('STORY_NOT_FOUND', 'Requested story not found.');
    }

    return story;
  }

  /**
   * Get all stories created by a specific user
   */
  async getAllByUserId(userId: string, options: IOperationOptions = {}): Promise<IStory[]> {
    const pipeline = new StoryPipelineBuilder().getCurrentUserStoryPreset(userId);

    const stories = await this.cacheService.getOrSet(
      CacheKeyBuilder.userStories(userId),
      () => this.storyRepo.aggregateStories(pipeline, options),
      { ttl: CACHE_TTL.USER_STORIES }
    );

    return stories;
  }

  /**
   * Get all draft stories for a user
   */
  async getDraftsByUserId(userId: string, options: IOperationOptions = {}): Promise<IStory[]> {
    return this.cacheService.getOrSet(
      CacheKeyBuilder.userDrafts(userId),
      () =>
        this.storyRepo.findMany({
          filter: { creatorId: userId, status: StoryStatus.DRAFT },
          options: { ...options, limit: 100 },
        }),
      { ttlKey: 'USER_DRAFTS' }
    );
  }

  /**
   * Get all published stories
   */
  async getPublishedStories(options: IOperationOptions = {}): Promise<IStory[]> {
    return this.cacheService.getOrSet(
      CacheKeyBuilder.storyList('published'),
      () =>
        this.storyRepo.findMany({
          filter: { status: StoryStatus.PUBLISHED },
          options: { ...options, limit: 50 },
        }),
      { ttlKey: 'STORY_LIST_PUBLISHED' }
    );
  }

  /**
   * Get newly created stories (last 7 days)
   */
  async getNewStories(options: IOperationOptions = {}): Promise<IStory[]> {
    const pipeline = new StoryPipelineBuilder().createdWithinLastDays(7).filterPublished().build();
    return this.cacheService.getOrSet(
      CacheKeyBuilder.storyList('new'),
      () => this.storyRepo.aggregateStories(pipeline, options),
      { ttlKey: 'STORY_LIST_NEW' }
    );
  }

  /**
   * List all stories with pagination
   */
  async listStories(options: IOperationOptions = {}): Promise<IStory[]> {
    return this.storyRepo.findAll({ ...options, limit: 50 });
  }

  /**
   * Get story tree by slug (throws if story not found)
   */
  async getStoryTreeBySlug(slug: string): Promise<IStoryTreeResult> {
    return this.cacheService.getOrSet(
      CacheKeyBuilder.storyTree(slug),
      async () => {
        const story = await this.storyRepo.findBySlug(slug);

        if (!story) {
          this.throwNotFoundError('Story not found. Unable to generate chapter tree.');
        }

        const pipeline = new ChapterPipelineBuilder()
          .buildStoryChapterTreePreset(story.slug)
          .build();

        const chapters = await this.chapterRepo.aggregateChapters(pipeline);

        if (!chapters || chapters.length === 0) {
          return {
            slug: story.slug,
            chapters: [],
          };
        }

        const tree = buildChapterTree(chapters);

        return {
          slug: story.slug,
          chapters: tree,
        };
      },
      { ttlKey: 'STORY_TREE' }
    );
  }

  /**
   * Get story overview with collaborators (throws if not found)
   */
  // async getStoryOverviewBySlug(slug: string): Promise<IStoryWithCreator> {
  //   return this.cacheService.getOrSet(
  //     CacheKeyBuilder.storyOverview(slug),
  //     async () => {
  //       const storyPipeline = new StoryPipelineBuilder().getStoryOverviewPreset(slug).build();

  //       const stories = await this.storyRepo.aggregateStories<IStoryWithCreator>(storyPipeline);

  //       if (!stories.length) {
  //         this.throwNotFoundError('Story not found');
  //       }

  //       return stories[0];
  //     },
  //     { ttlKey: 'STORY_OVERVIEW' }
  //   );
  // }
  async getStoryOverviewBySlug(slug: string): Promise<IStoryOverviewResponse> {
    const storyPipeline = new StoryPipelineBuilder().getStoryOverviewPreset(slug).build();

    const stories = await this.storyRepo.aggregateStories<IStoryOverviewResponse>(storyPipeline);

    if (!stories.length) {
      this.throwNotFoundError('Story not found');
    }

    return stories[0];
  }

  /**
   * Get story settings with images by slug (throws if not found)
   */
  async getStorySettingsBySlug(slug: string): Promise<IStorySettingsWithImages> {
    return this.cacheService.getOrSet(
      CacheKeyBuilder.storySettings(slug),
      async () => {
        const story = await this.storyRepo.findBySlug(slug);

        if (!story) {
          this.throwNotFoundError('Story not found');
        }

        return {
          settings: story.settings,
          coverImage: story.coverImage,
          cardImage: story.cardImage,
        };
      },
      { ttlKey: 'STORY_SETTINGS' }
    );
  }

  /**
   * Search stories with optional filters
   */
  async searchStoriesByTitle(
    query?: string,
    creator?: string,
    fields?: string[],
    limit: number = 10,
    options: IOperationOptions = {}
  ): Promise<IStory[]> {
    let creatorId: string | undefined;

    if (creator) {
      const user = await this.userService.getUserByUsername(creator);
      if (!user) {
        this.throwNotFoundError('USER_NOT_FOUND', `User with username '${creator}' not found.`);
      }
      creatorId = user.clerkId;
    }

    return this.storyRepo.search({ query, creatorId }, fields, limit, options);
  }

  /**
   * Search stories by user slug (username)
   */
  async searchStoriesByUserSlug(
    creator: string,
    fields?: string[],
    options: IOperationOptions = {}
  ): Promise<IStory[]> {
    return this.searchStoriesByTitle(undefined, creator, fields, 50, options);
  }
}

export { StoryQueryService };
