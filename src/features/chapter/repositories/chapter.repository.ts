import { QueryOptions, UpdateQuery } from 'mongoose';

import { BaseRepository } from '../../../utils';
import { Chapter } from '../../../models/chapter.model';
import { IChapter, IChapterDoc } from '../chapter.types';

export class ChapterRepository extends BaseRepository<IChapter, IChapterDoc> {
  constructor() {
    super(Chapter);
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

  async incrementBranches(parentChapterId: string): Promise<IChapter | null> {
    return this.updateById(parentChapterId, {
      $inc: { 'stats.childBranches': 1 },
    });
  }
}
