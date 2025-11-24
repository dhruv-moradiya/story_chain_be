import { ClientSession, QueryOptions, UpdateQuery } from 'mongoose';

import { Chapter } from '../../../models/chapter.model';
import { IChapter, IChapterDoc } from '../chapter.types';
import { BaseRepository } from '../../../utils/baseClass';

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

export const chapterRepository = new ChapterRepository();
