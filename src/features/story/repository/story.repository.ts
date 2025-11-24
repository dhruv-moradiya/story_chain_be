import { PipelineStage } from 'mongoose';
import { Story } from '../../../models/story.model';
import { ID, IOperationOptions } from '../../../types';
import { IStory, IStoryDoc } from '../story.types';
import { BaseRepository } from '../../../utils/baseClass';

export class StoryRepository extends BaseRepository<IStory, IStoryDoc> {
  constructor() {
    super(Story);
  }

  /**
   * Count stories by creatorId within a date range.
   * (Service will decide what date range to pass)
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

  // Increment chapters
  incrementTotalChapters(id: ID) {
    return this.model.updateOne(
      { _id: id },
      { $inc: { 'stats.totalChapters': 1 }, $set: { lastActivityAt: new Date() } }
    );
  }

  // Increment branches
  incrementTotalBranches(id: ID) {
    return this.model.updateOne(
      { _id: id },
      { $inc: { 'stats.totalBranches': 1 }, $set: { lastActivityAt: new Date() } }
    );
  }

  /**
   * Generic aggregation executor (with session support)
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

  /**
   * Find all stories by creatorId
   */
  async findByCreatorId(creatorId: string, options: IOperationOptions = {}): Promise<IStory[]> {
    return this.model
      .find({ creatorId })
      .session(options.session ?? null)
      .lean()
      .exec();
  }

  /**
   * Find story by slug
   */
  async findBySlug(slug: string, options: IOperationOptions = {}): Promise<IStory | null> {
    return this.model
      .findOne({ slug })
      .session(options.session ?? null)
      .lean()
      .exec();
  }

  /**
   * Paginated list (general feed/search)
   */
  async findPaged(
    filter: Record<string, any> = {},
    options: {
      limit?: number;
      skip?: number;
      session?: any;
    } = {}
  ): Promise<IStory[]> {
    return this.model
      .find(filter)
      .skip(options.skip ?? 0)
      .limit(options.limit ?? 20)
      .session(options.session ?? null)
      .lean()
      .exec();
  }

  /**
   * Generic findAll (paginated version recommended)
   */
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
}
