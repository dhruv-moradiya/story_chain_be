import { inject, singleton } from 'tsyringe';

import { BaseModule } from '@/utils/baseClass';
import { buildChapterTree, toId } from '@/utils/index';

import { TOKENS } from '@/container';
import { IOperationOptions } from '@/types';
import { IStoryWithCreator } from '@/types/response/story.response.types';

import { ChapterPipelineBuilder } from '@/features/chapter/pipelines/chapterPipeline.builder';
import { ChapterRepository } from '@/features/chapter/repositories/chapter.repository';

import { IStoryQueryService, IStoryTreeResult } from './interfaces/story-query.interface';
import { StoryRepository } from '../repositories/story.repository';
import { StoryPipelineBuilder } from '../pipelines/storyPipeline.builder';
import { IStory, IStorySettingsWithImages } from '../types/story.types';
import { StoryStatus } from '../types/story-enum';
import { PUBLIC_AUTHOR_PROJECTION } from '@/features/chapter/pipelines/chapter.projections';

@singleton()
class StoryQueryService extends BaseModule implements IStoryQueryService {
  constructor(
    @inject(TOKENS.StoryRepository)
    private readonly storyRepo: StoryRepository,
    @inject(TOKENS.ChapterRepository)
    private readonly chapterRepo: ChapterRepository
  ) {
    super();
  }

  async getAllStories(options: IOperationOptions = {}): Promise<IStory[]> {
    return this.storyRepo.findAll(options);
  }

  /**
   * Get story by ID (throws if not found)
   * TODO: Remove this method that use storyId instead of slug
   */
  async getById(storyId: string, options: IOperationOptions = {}): Promise<IStory> {
    const story = await this.storyRepo.findById(toId(storyId), {}, options);

    if (!story) {
      this.throwNotFoundError('Story not found');
    }

    return story;
  }

  /**
   * Get story by slug (throws if not found)
   */
  async getBySlug(slug: string, options: IOperationOptions = {}): Promise<IStory> {
    const story = await this.storyRepo.findBySlug(slug, options);

    if (!story) {
      this.throwNotFoundError('Story not found');
    }

    return story;
  }

  /**
   * Get all stories created by a specific user
   */
  async getAllByUserId(userId: string, options: IOperationOptions = {}): Promise<IStory[]> {
    return this.storyRepo.findByCreatorId(userId, options);
  }

  /**
   * Get all draft stories for a user
   */
  async getDraftsByUserId(userId: string, options: IOperationOptions = {}): Promise<IStory[]> {
    return this.storyRepo.findMany(
      { creatorId: userId, status: StoryStatus.DRAFT },
      {},
      { ...options, limit: 100 }
    );
  }

  /**
   * Get all published stories
   */
  async getPublishedStories(options: IOperationOptions = {}): Promise<IStory[]> {
    return this.storyRepo.findMany(
      { status: StoryStatus.PUBLISHED },
      {},
      { ...options, limit: 50 }
    );
  }

  /**
   * Get newly created stories (last 7 days)
   */
  async getNewStories(options: IOperationOptions = {}): Promise<IStory[]> {
    const pipeline = new StoryPipelineBuilder().lastSevenDaysStories().isPublished().build();
    return this.storyRepo.aggregateStories(pipeline, options);
  }

  /**
   * List all stories with pagination
   */
  async listStories(options: IOperationOptions = {}): Promise<IStory[]> {
    return this.storyRepo.findAll({ ...options, limit: 50 });
  }

  /**
   * Get story tree with all chapters (throws if story not found)
   * TODO: Remove this method that use storyId instead of slug
   */
  async getStoryTree(storyId: string): Promise<IStoryTreeResult> {
    const story = await this.storyRepo.findById(toId(storyId));

    if (!story) {
      this.throwNotFoundError('Story not found. Unable to generate chapter tree.');
    }

    const pipeline = new ChapterPipelineBuilder()
      .loadChaptersForStory(story.slug)
      .attachAuthor({ project: PUBLIC_AUTHOR_PROJECTION })
      .buildChapterGraphNode()
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
  }

  /**
   * Get story tree by slug (throws if story not found)
   */
  async getStoryTreeBySlug(slug: string): Promise<IStoryTreeResult> {
    const story = await this.storyRepo.findBySlug(slug);

    if (!story) {
      this.throwNotFoundError('Story not found');
    }

    return this.getStoryTree(story._id.toString());
  }

  /**
   * Get story overview with collaborators (throws if not found)
   */
  async getStoryOverviewBySlug(slug: string): Promise<IStoryWithCreator> {
    const pipeline = new StoryPipelineBuilder()
      .storyBySlug(slug)
      .storySettings(['genres', 'contentRating'])
      .withStoryCollaborators()
      .build();

    const stories = await this.storyRepo.aggregateStories<IStoryWithCreator>(pipeline);

    if (!stories.length) {
      this.throwNotFoundError('Story not found');
    }

    return stories[0];
  }

  /**
   * Get story settings with images by slug (throws if not found)
   */
  async getStorySettingsBySlug(slug: string): Promise<IStorySettingsWithImages> {
    const story = await this.storyRepo.findBySlug(slug);

    if (!story) {
      this.throwNotFoundError('Story not found');
    }

    return {
      settings: story.settings,
      coverImage: story.coverImage,
      cardImage: story.cardImage,
    };
  }

  /**
   * Search stories by title
   */
  async searchStoriesByTitle(
    query: string,
    limit: number = 10
  ): Promise<Pick<IStory, '_id' | 'title'>[]> {
    return this.storyRepo.searchByTitle(query, limit);
  }
}

export { StoryQueryService };
