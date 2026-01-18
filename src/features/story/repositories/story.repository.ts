import { PipelineStage } from 'mongoose';
import { singleton } from 'tsyringe';
import { Story } from '@models/story.model';
import { ID, IOperationOptions } from '@/types';
import { BaseRepository } from '@utils/baseClass';
import { IStory, IStoryDoc } from '../types/story.types';
import { StoryStatus } from '../types/story-enum';

@singleton()
export class StoryRepository extends BaseRepository<IStory, IStoryDoc> {
  constructor() {
    super(Story);
  }

  /**
   * Count stories by creatorId within a date range.
   */
  async countByCreatorInDateRange(
    creatorId: string,
    start: Date,
    end: Date,
    options: IOperationOptions = {}
  ): Promise<number> {
    return this.model.countDocuments(
      {
        creatorId,
        createdAt: { $gte: start, $lte: end },
      },
      { session: options.session }
    );
  }

  /** Increment chapters counter */
  incrementTotalChapters(
    id: ID
  ): Promise<{ acknowledged: boolean; modifiedCount: number; matchedCount: number }> {
    return this.model
      .updateOne(
        { _id: id },
        { $inc: { 'stats.totalChapters': 1 }, $set: { lastActivityAt: new Date() } }
      )
      .exec();
  }

  /** Increment branches counter */
  incrementTotalBranches(
    id: ID
  ): Promise<{ acknowledged: boolean; modifiedCount: number; matchedCount: number }> {
    return this.model
      .updateOne(
        { _id: id },
        { $inc: { 'stats.totalBranches': 1 }, $set: { lastActivityAt: new Date() } }
      )
      .exec();
  }

  /**
   * Generic aggregation executor
   */
  async aggregateStories<T = IStory>(
    pipeline: PipelineStage[],
    options: IOperationOptions = {}
  ): Promise<T[]> {
    return this.model
      .aggregate<T>(pipeline)
      .session(options.session ?? null)
      .exec();
  }

  /** Find all stories created by a user */
  async findByCreatorId(creatorId: string, options: IOperationOptions = {}): Promise<IStory[]> {
    return this.model
      .find({ creatorId })
      .session(options.session ?? null)
      .lean()
      .exec();
  }

  /** Find a single story by slug */
  async findBySlug(slug: string, options: IOperationOptions = {}): Promise<IStory | null> {
    return this.model
      .findOne({ slug })
      .session(options.session ?? null)
      .lean()
      .exec();
  }

  /** Generic findAll */
  async findAll(
    options: IOperationOptions & { limit?: number; skip?: number } = {}
  ): Promise<IStory[]> {
    return this.model
      .find()
      .skip(options.skip ?? 0)
      .limit(options.limit ?? 100)
      .session(options.session ?? null)
      .lean()
      .exec();
  }

  /** Change story status → Published */
  async changeStoryStatusToPublished(
    storyId: ID
  ): Promise<{ acknowledged: boolean; modifiedCount: number; matchedCount: number }> {
    return this.model
      .updateOne(
        { _id: storyId },
        { $set: { status: StoryStatus.PUBLISHED, publishedAt: new Date() } }
      )
      .exec();
  }

  /** Update story settings */
  async updateStorySetting(
    storyId: ID,
    update: Partial<IStory['settings']>
  ): Promise<IStory | null> {
    const updated = this.model
      .findByIdAndUpdate(storyId, { $set: { settings: update } }, { new: true })
      .lean()
      .exec();

    return updated;
  }

  /** Update story settings by slug */
  async updateStorySettingBySlug(
    slug: string,
    update: Partial<IStory['settings']>
  ): Promise<IStory | null> {
    return this.model
      .findOneAndUpdate({ slug }, { $set: { settings: update } }, { new: true })
      .lean()
      .exec();
  }

  /** Search stories by title */
  async searchByTitle(
    query: string,
    limit: number = 10,
    options: IOperationOptions = {}
  ): Promise<Pick<IStory, '_id' | 'title'>[]> {
    return this.model
      .find(
        { title: { $regex: query, $options: 'i' }, status: StoryStatus.PUBLISHED },
        { _id: 1, title: 1 },
        { session: options.session }
      )
      .limit(limit)
      .lean()
      .exec();
  }
}
