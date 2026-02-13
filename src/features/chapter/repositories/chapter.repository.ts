import { singleton } from 'tsyringe';
import {
  ClientSession,
  PipelineStage,
  ProjectionType,
  QueryOptions,
  Types,
  UpdateQuery,
} from 'mongoose';

import { Chapter } from '@models/chapter.model';
import { IChapter, IChapterDoc } from '../types/chapter.types';
import { BaseRepository } from '@utils/baseClass';
import { IOperationOptions } from '@/types';
import { ChapterStatus } from '../types/chapter-enum';

@singleton()
export class ChapterRepository extends BaseRepository<IChapter, IChapterDoc> {
  constructor() {
    super(Chapter);
  }

  async aggregateChapters<T = IChapter>(
    pipeline: PipelineStage[],
    options: IOperationOptions = {}
  ): Promise<T[]> {
    return this.model
      .aggregate<T>(pipeline)
      .session(options.session ?? null)
      .exec();
  }

  async countSiblings(
    storySlug: string,
    parentChapterSlug: string | null,
    options: IOperationOptions = {}
  ): Promise<number> {
    const query = this.model.countDocuments({
      storySlug,
      parentChapterSlug,
      status: { $in: [ChapterStatus.PUBLISHED, ChapterStatus.DRAFT] },
    });

    if (options.session) {
      query.session(options.session);
    }

    return query.exec();
  }

  async findRoot(storySlug: string): Promise<IChapter | null> {
    return this.model.findOne({ storySlug, parentChapterSlug: null }).lean<IChapter>().exec();
  }

  async countByAuthorInStory(authorId: string, storySlug: string): Promise<number> {
    return this.model.countDocuments({ authorId, storySlug }).exec();
  }

  async updateById(
    id: string,
    updates: UpdateQuery<IChapter>,
    options: QueryOptions = { new: true }
  ): Promise<IChapter | null> {
    return this.model.findByIdAndUpdate(id, updates, options).lean<IChapter>().exec();
  }

  async incrementBranches(
    parentChapterId: string,
    session?: ClientSession
  ): Promise<IChapter | null> {
    return this.updateById(
      parentChapterId,
      {
        $inc: { 'stats.childBranches': 1 },
      },
      { session }
    );
  }

  async findByStorySlug(storySlug: string): Promise<IChapter[]> {
    return this.model.find({ storySlug }).lean<IChapter[]>().exec();
  }

  async findBySlug(
    slug: string,
    projection: ProjectionType<IChapter> | null = {},
    options: QueryOptions = {}
  ): Promise<IChapter | null> {
    return this.model.findOne({ slug }, projection, options).lean<IChapter>().exec();
  }

  /**
   * Find chapter by ID with full details (story, author populated)
   */
  async findByIdWithDetails(chapterId: string): Promise<IChapterDetails | null> {
    const results = await this.model.aggregate<IChapterDetails>([
      { $match: { _id: new Types.ObjectId(chapterId) } },
      {
        $lookup: {
          from: 'stories',
          localField: 'storySlug',
          foreignField: 'slug',
          as: 'story',
        },
      },
      { $unwind: '$story' },
      {
        $lookup: {
          from: 'users',
          localField: 'authorId',
          foreignField: 'clerkId',
          as: 'author',
        },
      },
      { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          title: 1,
          content: 1,
          status: 1,
          parentChapterSlug: 1,
          depth: 1,
          chapterNumber: 1,
          isEnding: 1,
          version: 1,
          pullRequest: 1,
          stats: 1,
          votes: 1,
          createdAt: 1,
          updatedAt: 1,
          storyId: '$story._id',
          storySlug: '$story.slug',
          storyTitle: '$story.title',
          author: {
            clerkId: '$author.clerkId',
            username: '$author.username',
            firstName: '$author.firstName',
            lastName: '$author.lastName',
            imageUrl: '$author.imageUrl',
          },
        },
      },
    ]);

    return results[0] || null;
  }
  async incrementReads(slug: string) {
    return this.model
      .findOneAndUpdate(
        { slug },
        {
          $inc: {
            'stats.reads': 1,
            'stats.uniqueReaders': 1,
          },
        }
      )
      .lean()
      .exec();
  }
}

/**
 * Full chapter details with story and author info
 */
export interface IChapterDetails {
  _id: string;
  title: string;
  content: string;
  status: string;
  parentChapterSlug?: string;
  depth: number;
  chapterNumber?: number;
  isEnding: boolean;
  version: number;
  pullRequest: {
    isPR: boolean;
    prId?: string;
    status?: string;
    submittedAt?: Date;
    reviewedBy?: string;
    reviewedAt?: Date;
    rejectionReason?: string;
  };
  stats: {
    reads: number;
    comments: number;
    childBranches: number;
  };
  votes: {
    upvotes: number;
    downvotes: number;
    score: number;
  };
  createdAt: Date;
  updatedAt: Date;
  storyId: string;
  storySlug: string;
  storyTitle: string;
  author: {
    clerkId: string;
    username: string;
    firstName: string;
    lastName: string;
    imageUrl?: string;
  };
}
