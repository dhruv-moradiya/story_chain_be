import { singleton } from 'tsyringe';
import { ClientSession, PipelineStage, QueryOptions, UpdateQuery } from 'mongoose';

import { Chapter } from '@models/chapter.model';
import { IChapter, IChapterDoc } from '../types/chapter.types';
import { BaseRepository } from '@utils/baseClass';
import { IOperationOptions } from '@/types';

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

  async findRoot(storyId: string): Promise<IChapter | null> {
    return this.model.findOne({ storyId, parentChapterId: null }).lean<IChapter>().exec();
  }

  async countByAuthorInStory(authorId: string, storyId: string): Promise<number> {
    return this.model.countDocuments({ authorId, storyId }).exec();
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

  async findByStoryId(storyId: string): Promise<IChapter[]> {
    return this.model.find({ storyId }).lean().exec();
  }

  // async canUserEditChapter(userId: string, chapterId: string): Promise<boolean> {

  // }
}
