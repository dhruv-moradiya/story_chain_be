import { FilterQuery, PipelineStage } from 'mongoose';
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

  /** Bulk insert stories */
  async createMany(data: Partial<IStory>[], options: IOperationOptions = {}): Promise<IStory[]> {
    const docs = await this.model.insertMany(data, { session: options.session, lean: true });
    return docs as IStory[];
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

  /** Find all stories created by a user with field selection */
  async findByCreatorIdWithFields(
    creatorId: string,
    fields?: string[],
    options: IOperationOptions = {}
  ): Promise<IStory[]> {
    return this.model
      .find({ creatorId, status: StoryStatus.PUBLISHED })
      .select(fields?.join(' ') || '')
      .session(options.session ?? null)
      .lean()
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
  async findBySlug(
    slug: string,
    options: { fields?: string[] } & IOperationOptions = {}
  ): Promise<IStory | null> {
    const { fields, ...rest } = options;
    return this.model
      .findOne({ slug })
      .select(fields?.join(' ') || '')
      .session(rest.session ?? null)
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

  /** Search stories with filters and field selection */
  async search(
    filters: { query?: string; creatorId?: string },
    fields?: string[],
    limit: number = 10,
    options: IOperationOptions = {}
  ): Promise<IStory[]> {
    const query: FilterQuery<IStoryDoc> = {
      status: StoryStatus.PUBLISHED,
      ...(filters.query && { title: { $regex: filters.query, $options: 'i' } }),
      ...(filters.creatorId && { creatorId: filters.creatorId }),
    };

    return this.model
      .find(query)
      .select(fields?.join(' ') || '')
      .limit(limit)
      .session(options.session ?? null)
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
